import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";

import { ErrorAlert } from "@/components/common/ErrorAlert";
import { ToastProvider, useToast } from "@/components/common/ToastProvider";
import { Button } from "@/components/ui/button";
import { apiGet, apiPost, type ApiError } from "@/lib/client/http";
import type { GenerateReportCmd, ReportDTO, ReportEmailAttemptDTO } from "@/types";

interface TenantReportPermissions {
  canGenerate?: boolean;
  generateDisabledReason?: string | null;
  canSendEmail?: boolean;
  sendEmailDisabledReason?: string | null;
}

interface TenantReportListItem {
  report: ReportDTO;
  lastEmailAttempt?: ReportEmailAttemptDTO | null;
  permissions?: TenantReportPermissions | null;
}

interface TenantReportsResponse {
  items: TenantReportListItem[];
}

interface TenantReportsTableProps {
  /** Optional month override for tests */
  initialMonth?: string;
}

export function TenantReportsTable({ initialMonth }: TenantReportsTableProps): JSX.Element {
  const { pushToast } = useToast();
  const [month, setMonth] = useState<string>(() => initialMonth ?? getCurrentMonth());
  const [items, setItems] = useState<TenantReportListItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<boolean>(false);

  const listQuery = useMemo(() => buildListQuery(month), [month]);

  const loadReports = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    setAccessError(null);

    try {
      const response = await apiGet<TenantReportsResponse>(`/api/v1/reports${listQuery}`);
      setItems(Array.isArray(response.items) ? response.items : []);
    } catch (error) {
      const apiError = toApiError(error);

      if (apiError.code === "forbidden") {
        setAccessError(apiError.message);
        setItems([]);
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
    } finally {
      setLoading(false);
    }
  }, [listQuery, pushToast]);

  useEffect(() => {
    loadReports().catch(() => {
      // błąd obsłużony w loadReports
    });
  }, [loadReports]);

  const onMonthChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const nextMonth = event.target.value;
      setMonth(nextMonth);
      replaceMonthParam(nextMonth);
    },
    []
  );

  const handleActionError = useCallback(
    (error: ApiError) => {
      if (error.code === "forbidden") {
        pushToast({
          variant: "error",
          title: "Brak dostępu",
          description: error.message,
        });
        return;
      }

      pushToast({
        variant: "error",
        title: "Nie udało się wykonać akcji",
        description: error.message,
      });
    },
    [pushToast]
  );

  const handleGenerate = useCallback(
    async (item: TenantReportListItem) => {
      if (pendingAction || !canGenerate(item)) {
        return;
      }

      setPendingAction(true);

      const payload: GenerateReportCmd = {
        contractId: item.report.contractId,
        month,
      };

      try {
        await apiPost<void>("/api/v1/reports/generate", payload);
        pushToast({
          variant: "success",
          title: "Raport generowany",
          description: "Raport został przekazany do generowania.",
        });
        await loadReports();
      } catch (error) {
        const apiError = toApiError(error);
        handleActionError(apiError);

        if (apiError.code === "conflict") {
          await loadReports();
        }
      } finally {
        setPendingAction(false);
      }
    },
    [loadReports, month, pendingAction, pushToast]
  );

  const handleResend = useCallback(
    async (item: TenantReportListItem) => {
      if (pendingAction || !canSendEmail(item)) {
        return;
      }

      setPendingAction(true);

      try {
        await apiPost<void>(`/api/v1/reports/${encodeURIComponent(item.report.id)}/send-email`);
        pushToast({
          variant: "success",
          title: "E-mail wysłany",
          description: "Raport został ponownie wysłany na e-mail.",
        });
        await loadReports();
      } catch (error) {
        const apiError = toApiError(error);
        handleActionError(apiError);

        if (apiError.code === "conflict") {
          await loadReports();
        }
      } finally {
        setPendingAction(false);
      }
    },
    [loadReports, pendingAction, pushToast]
  );

  const monthInputId = useMemo(() => `reports-month-${Math.random().toString(36).slice(2)}`, []);

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-foreground" htmlFor={monthInputId}>
            Miesiąc
          </label>
          <input
            id={monthInputId}
            type="month"
            className="w-48 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            value={month}
            onChange={onMonthChange}
            disabled={loading || pendingAction}
            aria-describedby={`${monthInputId}-help`}
          />
          <p className="text-xs text-muted-foreground" id={`${monthInputId}-help`}>
            Zmiana miesiąca odświeży listę raportów
          </p>
        </div>
      </header>

      {accessError ? <ErrorAlert error={accessError} /> : null}
      {fetchError ? <ErrorAlert error={fetchError} /> : null}

      <div className="rounded-lg border bg-card">
        {loading ? (
          <div className="p-6 text-sm text-muted-foreground">Ładowanie raportów…</div>
        ) : items.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">Brak raportów dla wybranego miesiąca.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-2">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-2 font-medium">Miesiąc</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Ostatnia próba e-mail</th>
                  <th className="px-4 py-2 font-medium text-right">Akcje</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  return (
                    <tr key={item.report.id} className="rounded-lg border border-border bg-background/60 text-sm shadow-sm">
                      <td className="px-4 py-3 align-top">
                        <a className="font-medium text-foreground underline-offset-2 hover:underline" href={`/app/reports/${item.report.id}`}>
                          {formatMonth(item.report.month)}
                        </a>
                      </td>
                      <td className="px-4 py-3 align-top">{formatStatus(item.report.status)}</td>
                      <td className="px-4 py-3 align-top text-xs text-muted-foreground">
                        {renderEmailAttempt(item.lastEmailAttempt)}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex justify-end gap-2">
                          {canGenerate(item) ? (
                            <Button
                              type="button"
                              disabled={pendingAction}
                              onClick={() => handleGenerate(item)}
                              title={item.permissions?.generateDisabledReason ?? undefined}
                            >
                              Generuj
                            </Button>
                          ) : item.permissions?.generateDisabledReason ? (
                            <span className="text-xs text-muted-foreground" title={item.permissions.generateDisabledReason ?? undefined}>
                              {item.permissions.generateDisabledReason}
                            </span>
                          ) : null}
                          {canSendEmail(item) ? (
                            <Button
                              type="button"
                              variant="secondary"
                              disabled={pendingAction}
                              onClick={() => handleResend(item)}
                              title={item.permissions?.sendEmailDisabledReason ?? undefined}
                            >
                              Wyślij ponownie
                            </Button>
                          ) : item.permissions?.sendEmailDisabledReason ? (
                            <span className="text-xs text-muted-foreground" title={item.permissions.sendEmailDisabledReason ?? undefined}>
                              {item.permissions.sendEmailDisabledReason}
                            </span>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

export function TenantReportsView(props: TenantReportsTableProps): JSX.Element {
  return (
    <ToastProvider>
      <TenantReportsTable {...props} />
    </ToastProvider>
  );
}

function getCurrentMonth(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  return `${year}-${month}`;
}

function buildListQuery(month: string): string {
  const search = new URLSearchParams();
  if (month) {
    search.set("month", month);
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

function replaceMonthParam(value: string): void {
  if (typeof window === "undefined") {
    return;
  }

  const url = new URL(window.location.href);
  if (value) {
    url.searchParams.set("month", value);
  } else {
    url.searchParams.delete("month");
  }
  window.history.replaceState(null, "", url.toString());
}

function canGenerate(item: TenantReportListItem): boolean {
  if (!item.permissions) {
    return false;
  }

  if (item.permissions.generateDisabledReason) {
    return false;
  }

  return Boolean(item.permissions.canGenerate);
}

function canSendEmail(item: TenantReportListItem): boolean {
  if (!item.permissions) {
    return false;
  }

  if (item.permissions.sendEmailDisabledReason) {
    return false;
  }

  return Boolean(item.permissions.canSendEmail);
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

function formatStatus(status: string): string {
  switch (status) {
    case "generated":
      return "Wygenerowany";
    case "realized":
      return "Zaksięgowany";
    case "pending":
      return "Do wygenerowania";
    default:
      return status;
  }
}

function renderEmailAttempt(attempt?: ReportEmailAttemptDTO | null): string {
  if (!attempt) {
    return "Brak wysyłek";
  }

  const date = new Date(attempt.attemptedAt);
  const formatted = Number.isNaN(date.getTime())
    ? attempt.attemptedAt
    : new Intl.DateTimeFormat("pl-PL", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(date);

  const parts = [formatted];
  if (attempt.status) {
    parts.push(`(${attempt.status})`);
  }

  return parts.join(" ");
}

function shouldToast(code: string | undefined): boolean {
  if (!code) {
    return true;
  }

  return ["conflict", "rate_limited", "too_many_requests", "unexpected_error", "internal_error"].includes(code);
}

function toApiError(error: unknown): ApiError {
  if (error && typeof error === "object" && "code" in error && "message" in error) {
    return error as ApiError;
  }

  return {
    code: "unexpected_error",
    message: error instanceof Error ? error.message : "Wystąpił nieoczekiwany błąd.",
  };
}


