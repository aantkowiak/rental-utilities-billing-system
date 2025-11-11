import type { JSX } from "react";
import {
  lazy,
  memo,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type Dispatch,
  type SetStateAction,
} from "react";

import { ErrorAlert } from "@/components/common/ErrorAlert";
import { ToastProvider, useToast } from "@/components/common/ToastProvider";
import { Button } from "@/components/ui/button";
import { apiGet, apiPost, type ApiError } from "@/lib/client/http";
import type { GenerateReportCmd, ReportDTO, ReportEmailAttemptDTO, UpdateReportStatusCmd } from "@/types";

const MONTH_STORAGE_KEY = "admin-reports:month";
const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

type PendingMap = Record<string, boolean>;

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, "0")}`;
}

function normalizeMonth(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  return MONTH_PATTERN.test(value) ? value : null;
}

function ensureMonth(value: string | null | undefined): string {
  return normalizeMonth(value) ?? getCurrentMonth();
}

function clearPending(setter: Dispatch<SetStateAction<PendingMap>>, id: string): void {
  setter((prev) => {
    if (!prev[id]) {
      return prev;
    }

    const next = { ...prev };
    delete next[id];
    return next;
  });
}

interface AdminReportPermissions {
  canGenerate?: boolean;
  generateDisabledReason?: string | null;
  canRegenerate?: boolean;
  regenerateDisabledReason?: string | null;
  canSendEmail?: boolean;
  sendEmailDisabledReason?: string | null;
  canToggleRealized?: boolean;
  toggleRealizedDisabledReason?: string | null;
}

interface AdminReportListItem {
  report: ReportDTO;
  lastEmailAttempt?: ReportEmailAttemptDTO | null;
  permissions?: AdminReportPermissions | null;
}

interface AdminReportsResponse {
  items: AdminReportListItem[];
}

function resolveInitialMonth(): string {
  if (typeof window === "undefined") {
    return getCurrentMonth();
  }

  const params = new URLSearchParams(window.location.search);
  const param = normalizeMonth(params.get("month"));
  const stored = normalizeMonth(window.localStorage.getItem(MONTH_STORAGE_KEY));

  return param ?? stored ?? getCurrentMonth();
}

function toApiError(error: unknown): ApiError {
  if (error && typeof error === "object" && "code" in error && "message" in error) {
    return error as ApiError;
  }

  return {
    code: "unexpected_error",
    message: error instanceof Error ? error.message : "Wystąpił nieoczekiwany błąd.",
    details: error && typeof error === "object" && "details" in error ? (error as ApiError).details : undefined,
    status: error && typeof error === "object" && "status" in error ? (error as ApiError).status : undefined,
  };
}

function formatMonth(month: string): string {
  if (!month) {
    return "—";
  }

  const normalized = month.length === 7 ? `${month}-01` : month;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    return month;
  }

  return new Intl.DateTimeFormat("pl-PL", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("pl-PL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatCurrency(raw: number | null | undefined): string {
  if (typeof raw !== "number" || Number.isNaN(raw)) {
    return "—";
  }

  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(raw / 100);
}

function shouldToast(code: string | undefined): boolean {
  if (!code) {
    return true;
  }

  return ["unexpected_error", "internal_error", "conflict", "too_many_requests", "rate_limited"].includes(code);
}

function isForbiddenError(error: ApiError): boolean {
  return error.code === "forbidden" || error.status === 403;
}

function shouldRefetchAfterAction(error: ApiError): boolean {
  if (!error) {
    return false;
  }

  const refetchCodes = new Set(["conflict", "too_many_requests", "rate_limited", "internal_error", "not_found"]);
  if (refetchCodes.has(error.code)) {
    return true;
  }

  if (!error.status) {
    return false;
  }

  return [404, 409, 429, 500].includes(error.status);
}

const AdminReportEmailDetails = lazy(async () => {
  const module = await import("./AdminReportEmailDetails");
  return { default: module.AdminReportEmailDetails };
});

const STATUS_STYLE_MAP: Record<ReportDTO["status"], string> = {
  draft: "border-input bg-secondary text-secondary-foreground",
  realized: "border-transparent bg-emerald-500/10 text-emerald-600",
  unlocked: "border-transparent bg-amber-500/10 text-amber-600",
};

const ATTEMPT_STATUS_LABELS: Record<NonNullable<ReportEmailAttemptDTO["status"]>, string> = {
  success: "Sukces",
  retry: "Ponów próbę",
  failed: "Błąd",
};

interface AdminReportRowProps {
  item: AdminReportListItem;
  loading: boolean;
  generatePending: boolean;
  regeneratePending: boolean;
  resendPending: boolean;
  togglePending: boolean;
  onGenerate: (item: AdminReportListItem) => void;
  onRegenerate: (item: AdminReportListItem) => void;
  onResend: (item: AdminReportListItem) => void;
  onToggleRealized: (item: AdminReportListItem) => void;
}

const AdminReportRow = memo(function AdminReportRowComponent({
  item,
  loading,
  generatePending,
  regeneratePending,
  resendPending,
  togglePending,
  onGenerate,
  onRegenerate,
  onResend,
  onToggleRealized,
}: AdminReportRowProps): JSX.Element {
  const [emailDetailsOpen, setEmailDetailsOpen] = useState(false);

  const isRealized = item.report.status === "realized";
  const statusLabel = useMemo(() => formatStatus(item.report.status), [item.report.status]);
  const statusClassName = useMemo(
    () =>
      `inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_STYLE_MAP[item.report.status]}`,
    [item.report.status]
  );
  const balanceLabel = useMemo(() => formatCurrency(item.report.balanceRaw), [item.report.balanceRaw]);
  const emailSummary = useMemo(() => formatEmailAttemptSummary(item.lastEmailAttempt), [item.lastEmailAttempt]);
  const emailDetailsButtonLabel = emailDetailsOpen ? "Ukryj szczegóły" : "Szczegóły e-mail";

  const disableAnyAction = generatePending || regeneratePending || resendPending || togglePending || loading;

  const disableGenerate = disableAnyAction || !canGenerate(item);
  const disableRegenerate = disableAnyAction || !canRegenerate(item);
  const disableResend = disableAnyAction || !canSendEmail(item);
  const disableToggle = disableAnyAction || !canToggleRealized(item);

  const handleGenerateClick = useCallback(() => {
    onGenerate(item);
  }, [item, onGenerate]);

  const handleRegenerateClick = useCallback(() => {
    onRegenerate(item);
  }, [item, onRegenerate]);

  const handleResendClick = useCallback(() => {
    onResend(item);
  }, [item, onResend]);

  const handleToggleClick = useCallback(() => {
    onToggleRealized(item);
  }, [item, onToggleRealized]);

  const handleEmailDetailsToggle = useCallback(() => {
    setEmailDetailsOpen((previous) => !previous);
  }, []);

  return (
    <tr className="rounded-lg border border-border bg-background/80 align-top text-sm shadow-sm">
      <td className="px-4 py-3 align-top">
        <div className="space-y-1">
          <a
            className="font-medium text-foreground underline-offset-2 hover:underline"
            href={`/admin/reports/${item.report.id}`}
          >
            {formatMonth(item.report.month)}
          </a>
          <p className="text-xs text-muted-foreground">
            Kontrakt: <span className="font-medium text-foreground">{item.report.contractId}</span>
          </p>
        </div>
      </td>
      <td className="px-4 py-3 align-top">
        <div className="space-y-1">
          <span className={statusClassName}>{statusLabel}</span>
          <p className="text-xs text-muted-foreground">Aktualizacja: {formatDateTime(item.report.updatedAt)}</p>
        </div>
      </td>
      <td className="px-4 py-3 align-top">
        <div className="space-y-1">
          <span className="text-sm font-semibold text-foreground">{balanceLabel}</span>
          <p className="text-xs text-muted-foreground">Saldo bieżącego miesiąca</p>
        </div>
      </td>
      <td className="px-4 py-3 align-top">
        <div className="space-y-2 text-xs text-muted-foreground">
          <p>{emailSummary}</p>
          <Button
            size="sm"
            type="button"
            variant="ghost"
            onClick={handleEmailDetailsToggle}
            aria-expanded={emailDetailsOpen}
          >
            {emailDetailsButtonLabel}
          </Button>
          {emailDetailsOpen ? (
            <Suspense fallback={<p className="text-xs text-muted-foreground">Ładowanie szczegółów e-mail…</p>}>
              <AdminReportEmailDetails attempt={item.lastEmailAttempt ?? null} reportId={item.report.id} />
            </Suspense>
          ) : null}
        </div>
      </td>
      <td className="px-4 py-3 align-top">
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            onClick={handleGenerateClick}
            disabled={disableGenerate}
            title={item.permissions?.generateDisabledReason ?? undefined}
          >
            Generuj
          </Button>
          {!isRealized ? (
            <Button
              type="button"
              variant="secondary"
              onClick={handleRegenerateClick}
              disabled={disableRegenerate}
              title={item.permissions?.regenerateDisabledReason ?? undefined}
            >
              Przelicz ponownie
            </Button>
          ) : null}
          <Button
            type="button"
            variant="secondary"
            onClick={handleResendClick}
            disabled={disableResend}
            title={item.permissions?.sendEmailDisabledReason ?? undefined}
          >
            Wyślij ponownie
          </Button>
          <Button
            type="button"
            variant={isRealized ? "outline" : "destructive"}
            onClick={handleToggleClick}
            disabled={disableToggle}
            title={item.permissions?.toggleRealizedDisabledReason ?? undefined}
          >
            {isRealized ? "Odblokuj" : "Zaksięguj"}
          </Button>
        </div>
      </td>
    </tr>
  );
});

const AdminReportsContent = memo(function AdminReportsContentComponent(): JSX.Element {
  const { pushToast } = useToast();

  const [month, setMonth] = useState<string>(() => resolveInitialMonth());
  const [items, setItems] = useState<AdminReportListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [actionAccessError, setActionAccessError] = useState<string | null>(null);
  const [generatePendingById, setGeneratePendingById] = useState<PendingMap>({});
  const [regeneratePendingById, setRegeneratePendingById] = useState<PendingMap>({});
  const [resendPendingById, setResendPendingById] = useState<PendingMap>({});
  const [togglePendingById, setTogglePendingById] = useState<PendingMap>({});
  const lastLoadedQueryRef = useRef<string | null>(null);
  const loadingRef = useRef(false);
  const invalidatePromiseRef = useRef<Promise<void> | null>(null);

  const listQuery = useMemo(() => {
    const params = new URLSearchParams();
    if (month) {
      params.set("month", month);
    }
    return params.toString();
  }, [month]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const url = new URL(window.location.href);
    if (month) {
      url.searchParams.set("month", month);
    } else {
      url.searchParams.delete("month");
    }
    window.history.replaceState(null, "", url.toString());
  }, [month]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(MONTH_STORAGE_KEY, month);
  }, [month]);

  const loadReports = useCallback(
    async ({ force = false }: { force?: boolean } = {}) => {
      const query = listQuery;
      if (!force && lastLoadedQueryRef.current === query && !loadingRef.current) {
        return;
      }

      loadingRef.current = true;
      setLoading(true);
      setFetchError(null);
      setAccessError(null);
      setActionAccessError(null);

      try {
        const path = query ? `/api/v1/reports?${query}` : "/api/v1/reports";
        const response = await apiGet<AdminReportsResponse>(path);
        const nextItems = Array.isArray(response.items) ? response.items : [];
        setItems((previous) => mergeReports(previous, nextItems));
        lastLoadedQueryRef.current = query;
      } catch (error) {
        const apiError = toApiError(error);

        if (apiError.code === "forbidden") {
          setAccessError(apiError.message);
          setItems([]);
          lastLoadedQueryRef.current = query;
          return;
        }

        setFetchError(apiError.message);

        if (shouldToast(apiError.code)) {
          pushToast({
            variant: "error",
            title: "Nie udało się pobrać raportów",
            description: apiError.message,
          });
        }

        lastLoadedQueryRef.current = query;
      } finally {
        loadingRef.current = false;
        setLoading(false);
      }
    },
    [listQuery, pushToast]
  );

  const invalidateReports = useCallback(() => {
    if (invalidatePromiseRef.current) {
      return invalidatePromiseRef.current;
    }

    const promise = loadReports({ force: true }).finally(() => {
      invalidatePromiseRef.current = null;
    });
    invalidatePromiseRef.current = promise;
    return promise;
  }, [loadReports]);

  useEffect(() => {
    loadReports({ force: true }).catch(() => {
      // handled inside loadReports
    });
  }, [loadReports]);

  const handleMonthChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const next = ensureMonth(event.target.value);
    setMonth(next);
  }, []);

  const handleActionFailure = useCallback(
    async (error: ApiError) => {
      if (isForbiddenError(error)) {
        setActionAccessError(error.message);
        return;
      }

      pushToast({
        variant: "error",
        title: "Nie udało się wykonać akcji",
        description: error.message,
      });

      if (shouldRefetchAfterAction(error)) {
        await invalidateReports();
      }
    },
    [invalidateReports, pushToast]
  );

  const handleGenerate = useCallback(
    async (item: AdminReportListItem) => {
      const reportId = item.report.id;
      const permissions = item.permissions ?? null;

      if (permissions && (!permissions.canGenerate || permissions.generateDisabledReason)) {
        if (permissions.generateDisabledReason) {
          pushToast({
            variant: "info",
            title: "Nie można wygenerować raportu",
            description: permissions.generateDisabledReason,
          });
        }
        return;
      }

      let shouldProceed = true;
      setGeneratePendingById((prev) => {
        if (prev[reportId]) {
          shouldProceed = false;
          return prev;
        }
        return { ...prev, [reportId]: true };
      });

      if (!shouldProceed) {
        return;
      }

      setActionAccessError(null);

      const payload: GenerateReportCmd = {
        contractId: item.report.contractId,
        month,
      };

      try {
        await apiPost<void>("/api/v1/reports/generate", payload);
        pushToast({
          variant: "success",
          title: "Raport w kolejce",
          description: "Raport został przekazany do generowania.",
        });
        await invalidateReports();
      } catch (error) {
        await handleActionFailure(toApiError(error));
      } finally {
        clearPending(setGeneratePendingById, reportId);
      }
    },
    [handleActionFailure, loadReports, month, pushToast]
  );

  const handleRegenerate = useCallback(
    async (item: AdminReportListItem) => {
      const reportId = item.report.id;
      const permissions = item.permissions ?? null;

      if (permissions && (!permissions.canRegenerate || permissions.regenerateDisabledReason)) {
        if (permissions.regenerateDisabledReason) {
          pushToast({
            variant: "info",
            title: "Nie można przeliczyć raportu",
            description: permissions.regenerateDisabledReason,
          });
        }
        return;
      }

      let shouldProceed = true;
      setRegeneratePendingById((prev) => {
        if (prev[reportId]) {
          shouldProceed = false;
          return prev;
        }
        return { ...prev, [reportId]: true };
      });

      if (!shouldProceed) {
        return;
      }

      setActionAccessError(null);

      try {
        await apiPost<void>(`/api/v1/reports/${encodeURIComponent(reportId)}/regenerate`);
        pushToast({
          variant: "success",
          title: "Przeliczanie zaplanowane",
          description: "Raport zostanie wygenerowany ponownie.",
        });
        await invalidateReports();
      } catch (error) {
        await handleActionFailure(toApiError(error));
      } finally {
        clearPending(setRegeneratePendingById, reportId);
      }
    },
    [handleActionFailure, loadReports, pushToast]
  );

  const handleResend = useCallback(
    async (item: AdminReportListItem) => {
      const reportId = item.report.id;
      const permissions = item.permissions ?? null;

      if (permissions && (!permissions.canSendEmail || permissions.sendEmailDisabledReason)) {
        if (permissions.sendEmailDisabledReason) {
          pushToast({
            variant: "info",
            title: "Nie można wysłać wiadomości",
            description: permissions.sendEmailDisabledReason,
          });
        }
        return;
      }

      let shouldProceed = true;
      setResendPendingById((prev) => {
        if (prev[reportId]) {
          shouldProceed = false;
          return prev;
        }
        return { ...prev, [reportId]: true };
      });

      if (!shouldProceed) {
        return;
      }

      setActionAccessError(null);

      try {
        await apiPost<void>(`/api/v1/reports/${encodeURIComponent(reportId)}/send-email`);
        pushToast({
          variant: "success",
          title: "E-mail wysłany",
          description: "Raport został ponownie wysłany do najemcy.",
        });
        await invalidateReports();
      } catch (error) {
        await handleActionFailure(toApiError(error));
      } finally {
        clearPending(setResendPendingById, reportId);
      }
    },
    [handleActionFailure, loadReports, pushToast]
  );

  const handleToggleRealized = useCallback(
    async (item: AdminReportListItem) => {
      const reportId = item.report.id;
      const permissions = item.permissions ?? null;

      if (permissions && (!permissions.canToggleRealized || permissions.toggleRealizedDisabledReason)) {
        if (permissions.toggleRealizedDisabledReason) {
          pushToast({
            variant: "info",
            title: "Operacja zablokowana",
            description: permissions.toggleRealizedDisabledReason,
          });
        }
        return;
      }

      const currentStatus = item.report.status;
      const nextStatus: UpdateReportStatusCmd["status"] = currentStatus === "realized" ? "unlocked" : "realized";

      if (nextStatus === "unlocked") {
        const confirmed = window.confirm(
          "Czy na pewno chcesz odblokować raport? Zmiany staną się widoczne dla najemcy."
        );
        if (!confirmed) {
          return;
        }
      }

      let shouldProceed = true;
      setTogglePendingById((prev) => {
        if (prev[reportId]) {
          shouldProceed = false;
          return prev;
        }
        return { ...prev, [reportId]: true };
      });

      if (!shouldProceed) {
        return;
      }

      setActionAccessError(null);

      try {
        await apiPost<void>(`/api/v1/reports/${encodeURIComponent(reportId)}`, {
          status: nextStatus,
        });

        pushToast({
          variant: "success",
          title: nextStatus === "realized" ? "Raport zaksięgowany" : "Raport odblokowany",
          description:
            nextStatus === "realized"
              ? "Raport został oznaczony jako zrealizowany."
              : "Raport został odblokowany do edycji.",
        });
        await invalidateReports();
      } catch (error) {
        await handleActionFailure(toApiError(error));
      } finally {
        clearPending(setTogglePendingById, reportId);
      }
    },
    [handleActionFailure, invalidateReports, pushToast]
  );

  const handleRefreshClick = useCallback(() => {
    invalidateReports().catch(() => {
      // handled in invalidateReports
    });
  }, [invalidateReports]);

  const renderedRows = useMemo(() => {
    if (loading) {
      return [
        <tr key="loading">
          <td className="px-4 py-4 text-center text-muted-foreground" colSpan={5}>
            Ładowanie raportów…
          </td>
        </tr>,
      ];
    }

    if (items.length === 0) {
      return [
        <tr key="empty">
          <td className="px-4 py-4 text-center text-muted-foreground" colSpan={5}>
            Brak raportów dla wybranego miesiąca.
          </td>
        </tr>,
      ];
    }

    return items.map((item) => {
      const reportId = item.report.id;
      return (
        <AdminReportRow
          key={reportId}
          item={item}
          loading={loading}
          generatePending={Boolean(generatePendingById[reportId])}
          regeneratePending={Boolean(regeneratePendingById[reportId])}
          resendPending={Boolean(resendPendingById[reportId])}
          togglePending={Boolean(togglePendingById[reportId])}
          onGenerate={handleGenerate}
          onRegenerate={handleRegenerate}
          onResend={handleResend}
          onToggleRealized={handleToggleRealized}
        />
      );
    });
  }, [
    generatePendingById,
    handleGenerate,
    handleRegenerate,
    handleResend,
    handleToggleRealized,
    items,
    loading,
    regeneratePendingById,
    resendPendingById,
    togglePendingById,
  ]);

  return (
    <section className="space-y-8">
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground">Filtry</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="admin-reports-month">
              Miesiąc rozliczeniowy
            </label>
            <input
              className="w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
              id="admin-reports-month"
              type="month"
              value={month}
              onChange={handleMonthChange}
            />
            <p className="text-xs text-muted-foreground">Filtr jest zapisywany w adresie URL i pamięci przeglądarki.</p>
          </div>
        </div>
      </div>

      {accessError ? <ErrorAlert error={accessError} /> : null}
      {actionAccessError ? <ErrorAlert error={actionAccessError} /> : null}
      {fetchError ? <ErrorAlert error={fetchError} /> : null}

      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <header className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Raporty</h2>
            <p className="text-sm text-muted-foreground">
              {month
                ? `Zestawienie raportów dla miesiąca ${formatMonth(month)}.`
                : "Wybierz miesiąc, aby wyświetlić raporty."}
            </p>
          </div>
          <Button variant="secondary" type="button" onClick={handleRefreshClick} disabled={loading}>
            Odśwież
          </Button>
        </header>

        <div className="mt-6 overflow-hidden rounded-md border">
          <table className="w-full border-separate border-spacing-y-1 text-sm">
            <thead className="text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Kontrakt</th>
                <th className="px-4 py-2 text-left font-medium">Status</th>
                <th className="px-4 py-2 text-left font-medium">Saldo</th>
                <th className="px-4 py-2 text-left font-medium">Ostatni e-mail</th>
                <th className="px-4 py-2 text-right font-medium">Akcje</th>
              </tr>
            </thead>
            <tbody>{renderedRows}</tbody>
          </table>
        </div>
      </div>
    </section>
  );
});

function formatStatus(status: ReportDTO["status"]): string {
  switch (status) {
    case "realized":
      return "Zaksięgowany";
    case "unlocked":
      return "Odblokowany";
    default:
      return "Szkic";
  }
}

function formatEmailAttemptSummary(attempt: ReportEmailAttemptDTO | null | undefined): string {
  if (!attempt) {
    return "Brak wysyłek e-mail.";
  }

  const timestamp = formatDateTime(attempt.attemptedAt);
  const status = formatAttemptStatus(attempt.status);
  return `${timestamp} • ${status}`;
}

function formatAttemptStatus(status: ReportEmailAttemptDTO["status"] | null | undefined): string {
  if (!status) {
    return "Nieznany status";
  }

  return ATTEMPT_STATUS_LABELS[status] ?? status;
}

function canGenerate(item: AdminReportListItem): boolean {
  const permissions = item.permissions;
  if (!permissions) {
    return true;
  }
  if (permissions.generateDisabledReason) {
    return false;
  }
  return Boolean(permissions.canGenerate);
}

function canRegenerate(item: AdminReportListItem): boolean {
  if (item.report.status === "realized") {
    return false;
  }
  const permissions = item.permissions;
  if (!permissions) {
    return true;
  }
  if (permissions.regenerateDisabledReason) {
    return false;
  }
  return Boolean(permissions.canRegenerate);
}

function canSendEmail(item: AdminReportListItem): boolean {
  const permissions = item.permissions;
  if (!permissions) {
    return true;
  }
  if (permissions.sendEmailDisabledReason) {
    return false;
  }
  return Boolean(permissions.canSendEmail);
}

function canToggleRealized(item: AdminReportListItem): boolean {
  const permissions = item.permissions;
  if (!permissions) {
    return true;
  }
  if (permissions.toggleRealizedDisabledReason) {
    return false;
  }
  return Boolean(permissions.canToggleRealized);
}

function mergeReports(previous: AdminReportListItem[], next: AdminReportListItem[]): AdminReportListItem[] {
  if (previous.length === 0) {
    return next;
  }

  const previousById = new Map(previous.map((item) => [item.report.id, item]));
  let didChange = previous.length !== next.length;

  const merged = next.map((item, index) => {
    const existing = previousById.get(item.report.id);
    if (!existing) {
      didChange = true;
      return item;
    }

    if (areReportItemsEqual(existing, item)) {
      if (existing === previous[index]) {
        return existing;
      }
      return existing;
    }

    didChange = true;
    return item;
  });

  if (!didChange) {
    return previous;
  }

  return merged;
}

function areReportItemsEqual(previous: AdminReportListItem, next: AdminReportListItem): boolean {
  return (
    previous.report.updatedAt === next.report.updatedAt &&
    previous.report.status === next.report.status &&
    previous.report.balanceRaw === next.report.balanceRaw &&
    previous.report.month === next.report.month &&
    previous.report.contractId === next.report.contractId &&
    previous.report.realizedAt === next.report.realizedAt &&
    isEmailAttemptEqual(previous.lastEmailAttempt, next.lastEmailAttempt) &&
    arePermissionsEqual(previous.permissions, next.permissions)
  );
}

function isEmailAttemptEqual(
  previous: ReportEmailAttemptDTO | null | undefined,
  next: ReportEmailAttemptDTO | null | undefined
): boolean {
  if (previous === next) {
    return true;
  }

  if (!previous || !next) {
    return !previous && !next;
  }

  return (
    previous.id === next.id &&
    previous.reportEmailId === next.reportEmailId &&
    previous.attemptedAt === next.attemptedAt &&
    previous.status === next.status &&
    previous.errorMessage === next.errorMessage
  );
}

function arePermissionsEqual(
  previous: AdminReportPermissions | null | undefined,
  next: AdminReportPermissions | null | undefined
): boolean {
  if (previous === next) {
    return true;
  }

  if (!previous || !next) {
    return !previous && !next;
  }

  return (
    previous.canGenerate === next.canGenerate &&
    previous.generateDisabledReason === next.generateDisabledReason &&
    previous.canRegenerate === next.canRegenerate &&
    previous.regenerateDisabledReason === next.regenerateDisabledReason &&
    previous.canSendEmail === next.canSendEmail &&
    previous.sendEmailDisabledReason === next.sendEmailDisabledReason &&
    previous.canToggleRealized === next.canToggleRealized &&
    previous.toggleRealizedDisabledReason === next.toggleRealizedDisabledReason
  );
}

export function AdminReportsTable(): JSX.Element {
  return (
    <ToastProvider>
      <AdminReportsContent />
    </ToastProvider>
  );
}
