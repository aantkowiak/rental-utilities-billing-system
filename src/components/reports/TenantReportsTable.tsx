import { memo, useCallback, useEffect, useMemo, useState } from "react";
import type { JSX } from "react";

import { ErrorAlert } from "@/components/common/ErrorAlert";
import { ToastProvider, useToast } from "@/components/common/ToastProvider";
import { Button } from "@/components/ui/button";
import { apiGet, apiPost, type ApiError } from "@/lib/client/http";
import { formatYearMonthLabel, isoDateToYearMonth, isValidYearMonth } from "@/lib/date/month";
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
  /** Property ID from tenant's profile */
  propertyId: string | null;
  /** Optional month override for tests */
  initialMonth?: string;
}

interface TenantReportRowProps {
  item: TenantReportListItem;
  pendingGenerateId: string | null;
  pendingResendId: string | null;
  onGenerate: (item: TenantReportListItem) => void;
  onResend: (item: TenantReportListItem) => void;
}

export function TenantReportsTable({ propertyId, initialMonth }: TenantReportsTableProps): JSX.Element {
  const { pushToast } = useToast();
  const [items, setItems] = useState<TenantReportListItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [pendingGenerateId, setPendingGenerateId] = useState<string | null>(null);
  const [pendingResendId, setPendingResendId] = useState<string | null>(null);

  void initialMonth; // Suppress unused var warning

  const listQuery = useMemo(() => buildListQuery(propertyId), [propertyId]);

  const loadReports = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    setAccessError(null);

    try {
      const response = await apiGet<TenantReportsResponse>(`/api/v1/reports${listQuery}`);
      const normalizedItems = Array.isArray(response.items) ? response.items : [];
      setItems((previous) => mergeTenantReportItems(previous, normalizedItems));
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
      if (!canGenerate(item) || pendingGenerateId || pendingResendId) {
        return;
      }

      setPendingGenerateId(item.report.id);

      const payload: GenerateReportCmd = {
        contractId: item.report.contractId,
        month: item.report.month,
      };

      try {
        await apiPost("/api/v1/reports/generate", payload);
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
        setPendingGenerateId(null);
      }
    },
    [handleActionError, loadReports, pendingGenerateId, pendingResendId, pushToast]
  );

  const handleResend = useCallback(
    async (item: TenantReportListItem) => {
      if (!canSendEmail(item) || pendingResendId || pendingGenerateId) {
        return;
      }

      setPendingResendId(item.report.id);

      try {
        await apiPost(`/api/v1/reports/${encodeURIComponent(item.report.id)}/send-email`);
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
        setPendingResendId(null);
      }
    },
    [handleActionError, loadReports, pendingGenerateId, pendingResendId, pushToast]
  );

  return (
    <section className="space-y-6">
      {!propertyId ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Brak przypisanej nieruchomości. Skontaktuj się z administratorem, aby uzyskać dostęp do raportów.
        </p>
      ) : null}

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
                {items.map((item) => (
                  <TenantReportRow
                    key={item.report.id}
                    item={item}
                    onGenerate={handleGenerate}
                    onResend={handleResend}
                    pendingGenerateId={pendingGenerateId}
                    pendingResendId={pendingResendId}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

const TenantReportRow = memo(function TenantReportRow({
  item,
  onGenerate,
  onResend,
  pendingGenerateId,
  pendingResendId,
}: TenantReportRowProps): JSX.Element {
  const handleGenerateClick = useCallback(() => {
    onGenerate(item);
  }, [item, onGenerate]);

  const handleResendClick = useCallback(() => {
    onResend(item);
  }, [item, onResend]);

  return (
    <tr className="rounded-lg border border-border bg-background/60 text-sm shadow-sm">
      <td className="px-4 py-3 align-top">
        <a
          className="font-medium text-foreground underline-offset-2 hover:underline"
          href={`/app/reports/${item.report.id}`}
        >
          {formatMonth(item.report.month)}
        </a>
      </td>
      <td className="px-4 py-3 align-top">{formatStatus(item.report.status)}</td>
      <td className="px-4 py-3 align-top text-xs text-muted-foreground">{renderEmailAttempt(item.lastEmailAttempt)}</td>
      <td className="px-4 py-3 align-top">
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            disabled={!canGenerate(item) || pendingGenerateId === item.report.id || Boolean(pendingResendId)}
            onClick={handleGenerateClick}
            title={item.permissions?.generateDisabledReason ?? undefined}
            variant="default"
            aria-disabled={!canGenerate(item)}
          >
            Generuj
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={!canSendEmail(item) || pendingResendId === item.report.id || Boolean(pendingGenerateId)}
            onClick={handleResendClick}
            title={item.permissions?.sendEmailDisabledReason ?? undefined}
            aria-disabled={!canSendEmail(item)}
          >
            Wyślij ponownie
          </Button>
        </div>
      </td>
    </tr>
  );
});

export function TenantReportsView(props: TenantReportsTableProps): JSX.Element {
  return (
    <ToastProvider>
      <TenantReportsTable {...props} />
    </ToastProvider>
  );
}

function buildListQuery(propertyId: string | null): string {
  const search = new URLSearchParams();
  if (propertyId) {
    search.set("propertyId", propertyId);
  }
  const query = search.toString();
  return query ? `?${query}` : "";
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

  try {
    const normalized = month.length === 7 ? month : isoDateToYearMonth(month);
    if (!isValidYearMonth(normalized)) {
      return month;
    }
    return formatYearMonthLabel(normalized);
  } catch {
    return month;
  }
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

function mergeTenantReportItems(
  previous: TenantReportListItem[],
  next: TenantReportListItem[]
): TenantReportListItem[] {
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

    if (
      existing.report.updatedAt === item.report.updatedAt &&
      existing.report.status === item.report.status &&
      existing.report.month === item.report.month &&
      isEmailAttemptEqual(existing.lastEmailAttempt, item.lastEmailAttempt) &&
      isPermissionsEqual(existing.permissions, item.permissions)
    ) {
      if (existing === previous[index]) {
        return existing;
      }

      didChange = true;
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
    previous.attemptedAt === next.attemptedAt &&
    previous.status === next.status &&
    previous.errorMessage === next.errorMessage &&
    previous.reportEmailId === next.reportEmailId
  );
}

function isPermissionsEqual(
  previous: TenantReportPermissions | null | undefined,
  next: TenantReportPermissions | null | undefined
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
    previous.canSendEmail === next.canSendEmail &&
    previous.sendEmailDisabledReason === next.sendEmailDisabledReason
  );
}
