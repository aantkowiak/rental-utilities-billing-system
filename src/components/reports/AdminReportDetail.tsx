import { memo, useCallback, useEffect, useMemo, useState } from "react";

import { ErrorAlert } from "@/components/common/ErrorAlert";
import { ToastProvider, useToast } from "@/components/common/ToastProvider";
import { Button } from "@/components/ui/button";
import { apiGet, apiPatch, apiPost, type ApiError } from "@/lib/client/http";
import { formatYearMonthLabel, isoDateToYearMonth, isValidYearMonth } from "@/lib/date/month";
import type { ReportDTO, ReportEmailAttemptDTO, UpdateReportStatusCmd } from "@/types";

interface AdminReportPermissions {
  canRegenerate?: boolean;
  regenerateDisabledReason?: string | null;
  canSendEmail?: boolean;
  sendEmailDisabledReason?: string | null;
  canToggleRealized?: boolean;
  toggleRealizedDisabledReason?: string | null;
}

interface ReportLineItem {
  id: string;
  label: string;
  amountRaw: number | null;
  description?: string | null;
  category?: string | null;
}

interface AdminReportDetailResponse {
  report: ReportDTO;
  lineItems?: ReportLineItem[] | null;
  lastEmailAttempt?: ReportEmailAttemptDTO | null;
  permissions?: AdminReportPermissions | null;
}

interface AdminReportDetailProps {
  reportId: string;
}

type ActionKind = "regenerate" | "resend" | "toggle";

// Unused for now - used by commented formatMoney function
// const currencyFormatter = new Intl.NumberFormat("pl-PL", {
//   currency: "PLN",
//   style: "currency",
//   minimumFractionDigits: 2,
//   maximumFractionDigits: 2,
// });

const dateTimeFormatter = new Intl.DateTimeFormat("pl-PL", {
  dateStyle: "medium",
  timeStyle: "short",
});

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

function AdminReportDetailContent({ reportId }: AdminReportDetailProps): JSX.Element {
  const [report, setReport] = useState<ReportDTO | null>(null);
  const [lineItems, setLineItems] = useState<ReportLineItem[]>([]);
  const [lastEmailAttempt, setLastEmailAttempt] = useState<ReportEmailAttemptDTO | null>(null);
  const [permissions, setPermissions] = useState<AdminReportPermissions | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [actionAccessError, setActionAccessError] = useState<string | null>(null);

  const loadDetail = useCallback(async () => {
    if (!reportId) {
      setFetchError("Brak identyfikatora raportu.");
      setReport(null);
      setLineItems([]);
      setLastEmailAttempt(null);
      setPermissions(null);
      return;
    }

    setLoading(true);
    setFetchError(null);
    setAccessError(null);
    setActionAccessError(null);

    try {
      const response = await apiGet<AdminReportDetailResponse>(`/api/v1/reports/${encodeURIComponent(reportId)}`);
      setReport(response.report);
      setLineItems(Array.isArray(response.lineItems) ? response.lineItems : []);
      setLastEmailAttempt(response.lastEmailAttempt ?? null);
      setPermissions(response.permissions ?? null);
    } catch (error) {
      const apiError = toApiError(error);

      setReport(null);
      setLineItems([]);
      setLastEmailAttempt(null);
      setPermissions(null);

      if (apiError.code === "forbidden") {
        setAccessError(apiError.message);
        return;
      }

      setFetchError(apiError.message);
    } finally {
      setLoading(false);
    }
  }, [reportId]);

  useEffect(() => {
    loadDetail().catch(() => {
      /* obsłużone wewnątrz loadDetail */
    });
  }, [loadDetail]);

  const isRealized = report?.status === "realized";

  const regenerateDisabledReason = permissions?.regenerateDisabledReason;
  const sendEmailDisabledReason = permissions?.sendEmailDisabledReason;
  const toggleDisabledReason = permissions?.toggleRealizedDisabledReason;

  const canRegenerate = useMemo(() => {
    if (!permissions) {
      return !isRealized;
    }
    if (isRealized) {
      return false;
    }
    if (permissions.regenerateDisabledReason) {
      return false;
    }
    return Boolean(permissions.canRegenerate);
  }, [isRealized, permissions]);

  const canSendEmail = useMemo(() => {
    if (!permissions) {
      return true;
    }
    if (permissions.sendEmailDisabledReason) {
      return false;
    }
    return Boolean(permissions.canSendEmail);
  }, [permissions]);

  const canToggleRealized = useMemo(() => {
    if (!permissions) {
      return Boolean(report);
    }
    if (permissions.toggleRealizedDisabledReason) {
      return false;
    }
    return Boolean(permissions.canToggleRealized);
  }, [permissions, report]);

  // Note: Line items and cost summaries are now displayed via ReportItemsView component

  return (
    <section className="space-y-6">
      {accessError ? <ErrorAlert error={accessError} /> : null}
      {fetchError ? <ErrorAlert error={fetchError} /> : null}
      {actionAccessError ? <ErrorAlert error={actionAccessError} /> : null}

      {loading ? <p className="text-sm text-muted-foreground">Ładowanie raportu…</p> : null}

      {!loading && !report && !accessError && !fetchError ? (
        <p className="rounded-md border border-dashed border-muted bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          Nie znaleziono danych raportu.
        </p>
      ) : null}

      {report ? (
        <article className="space-y-6">
          <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-1">
              <h2 className="text-2xl font-semibold text-foreground">{formatMonth(report.month)}</h2>
              <p className="text-sm text-muted-foreground">{formatStatus(report.status)}</p>
              <p className="text-xs text-muted-foreground">
                Kontrakt: <span className="font-medium text-foreground">{report.contractId}</span>
              </p>
            </div>
            <ReportActions
              canRegenerate={canRegenerate}
              canSendEmail={canSendEmail}
              canToggleRealized={canToggleRealized}
              isRealized={isRealized}
              onActionAccessError={setActionAccessError}
              onRefetch={loadDetail}
              regenerateDisabledReason={regenerateDisabledReason}
              report={report}
              sendEmailDisabledReason={sendEmailDisabledReason}
              toggleDisabledReason={toggleDisabledReason}
            />
          </header>

          <section className="rounded-lg border bg-card p-6 shadow-sm">
            <h3 className="text-base font-semibold text-foreground">Metadane</h3>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <MetadataItem label="Identyfikator raportu" value={report.id} />
              <MetadataItem label="Utworzono" value={formatDateTime(report.createdAt)} />
              <MetadataItem label="Ostatnia aktualizacja" value={formatDateTime(report.updatedAt)} />
              <MetadataItem
                label="Zaksięgowano"
                value={report.realizedAt ? formatDateTime(report.realizedAt) : "Nie zaksięgowano"}
              />
            </dl>
          </section>

          <section className="rounded-lg border bg-card p-6 shadow-sm">
            <h3 className="text-base font-semibold text-foreground">Ostatnia próba wysyłki e-mail</h3>
            {lastEmailAttempt ? (
              <div className="mt-3 space-y-1 text-sm">
                <p className="font-medium text-foreground">{formatDateTime(lastEmailAttempt.attemptedAt)}</p>
                <p className="text-muted-foreground">
                  Status: {lastEmailAttempt.status}
                  {lastEmailAttempt.errorMessage ? ` · ${lastEmailAttempt.errorMessage}` : ""}
                </p>
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">Brak wysyłek dla tego raportu.</p>
            )}
          </section>
        </article>
      ) : null}
    </section>
  );
}

interface ReportActionsProps {
  report: ReportDTO;
  canRegenerate: boolean;
  regenerateDisabledReason?: string | null;
  canSendEmail: boolean;
  sendEmailDisabledReason?: string | null;
  canToggleRealized: boolean;
  toggleDisabledReason?: string | null;
  isRealized: boolean;
  onRefetch: () => Promise<void>;
  onActionAccessError: (message: string | null) => void;
}

const ReportActions = memo(function ReportActions({
  report,
  canRegenerate,
  regenerateDisabledReason,
  canSendEmail,
  sendEmailDisabledReason,
  canToggleRealized,
  toggleDisabledReason,
  isRealized,
  onRefetch,
  onActionAccessError,
}: ReportActionsProps): JSX.Element {
  const { pushToast } = useToast();
  const [pending, setPending] = useState<Record<ActionKind, boolean>>({
    regenerate: false,
    resend: false,
    toggle: false,
  });

  const setPendingFlag = useCallback((kind: ActionKind, value: boolean) => {
    setPending((current) => {
      if (current[kind] === value) {
        return current;
      }
      return { ...current, [kind]: value };
    });
  }, []);

  const handleActionFailure = useCallback(
    async (error: ApiError, action: ActionKind) => {
      if (isForbiddenError(error)) {
        onActionAccessError(error.message);
        return;
      }

      onActionAccessError(null);

      const actionTitles: Record<ActionKind, string> = {
        regenerate: "Nie udało się przeliczyć raportu",
        resend: "Nie udało się wysłać e-maila",
        toggle: "Nie udało się zmienić statusu raportu",
      };

      pushToast({
        variant: "error",
        title: actionTitles[action],
        description: error.message,
      });

      if (shouldRefetchAfterAction(error)) {
        await onRefetch();
      }
    },
    [onActionAccessError, onRefetch, pushToast]
  );

  const handleRegenerate = useCallback(async () => {
    if (!canRegenerate || pending.regenerate) {
      return;
    }

    setPendingFlag("regenerate", true);
    onActionAccessError(null);

    try {
      await apiPost<Record<string, never>>(`/api/v1/reports/${encodeURIComponent(report.id)}/regenerate`);
      pushToast({
        variant: "success",
        title: "Przeliczanie zaplanowane",
        description: "Raport zostanie wygenerowany ponownie.",
      });
      await onRefetch();
    } catch (error) {
      await handleActionFailure(toApiError(error), "regenerate");
    } finally {
      setPendingFlag("regenerate", false);
    }
  }, [
    canRegenerate,
    handleActionFailure,
    onActionAccessError,
    onRefetch,
    pending.regenerate,
    pushToast,
    report.id,
    setPendingFlag,
  ]);

  const handleResend = useCallback(async () => {
    if (!canSendEmail || pending.resend) {
      return;
    }

    setPendingFlag("resend", true);
    onActionAccessError(null);

    try {
      await apiPost<Record<string, never>>(`/api/v1/reports/${encodeURIComponent(report.id)}/send-email`);
      pushToast({
        variant: "success",
        title: "E-mail wysłany",
        description: "Raport został ponownie wysłany do najemcy.",
      });
      await onRefetch();
    } catch (error) {
      await handleActionFailure(toApiError(error), "resend");
    } finally {
      setPendingFlag("resend", false);
    }
  }, [
    canSendEmail,
    handleActionFailure,
    onActionAccessError,
    onRefetch,
    pending.resend,
    pushToast,
    report.id,
    setPendingFlag,
  ]);

  const handleToggleRealized = useCallback(async () => {
    if (!canToggleRealized || pending.toggle) {
      return;
    }

    const nextStatus: UpdateReportStatusCmd["status"] = report.status === "realized" ? "unlocked" : "realized";

    if (nextStatus === "unlocked") {
      const confirmed = window.confirm(
        "Czy na pewno chcesz odblokować raport? Zmiany w szczegółach staną się ponownie widoczne dla najemcy."
      );
      if (!confirmed) {
        return;
      }
    }

    setPendingFlag("toggle", true);
    onActionAccessError(null);

    try {
      await apiPatch<Record<string, never>>(`/api/v1/reports/${encodeURIComponent(report.id)}`, { status: nextStatus });
      pushToast({
        variant: "success",
        title: nextStatus === "realized" ? "Raport zaksięgowany" : "Raport odblokowany",
        description:
          nextStatus === "realized"
            ? "Raport został oznaczony jako zrealizowany."
            : "Raport został odblokowany do edycji.",
      });
      await onRefetch();
    } catch (error) {
      await handleActionFailure(toApiError(error), "toggle");
    } finally {
      setPendingFlag("toggle", false);
    }
  }, [
    canToggleRealized,
    handleActionFailure,
    onActionAccessError,
    onRefetch,
    pending.toggle,
    pushToast,
    report.id,
    report.status,
    setPendingFlag,
  ]);

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {isRealized ? null : (
        <Button
          type="button"
          variant="secondary"
          disabled={pending.regenerate || !canRegenerate}
          onClick={() => {
            handleRegenerate().catch(() => {
              /* obsłużone w handleRegenerate */
            });
          }}
          title={regenerateDisabledReason ?? undefined}
        >
          Przelicz
        </Button>
      )}
      <Button
        type="button"
        variant="outline"
        disabled={pending.resend || !canSendEmail}
        onClick={() => {
          handleResend().catch(() => {
            /* obsłużone w handleResend */
          });
        }}
        title={sendEmailDisabledReason ?? undefined}
      >
        Wyślij e-mail
      </Button>
      <Button
        type="button"
        variant={isRealized ? "destructive" : "default"}
        disabled={pending.toggle || !canToggleRealized}
        onClick={() => {
          handleToggleRealized().catch(() => {
            /* obsłużone w handleToggleRealized */
          });
        }}
        title={toggleDisabledReason ?? undefined}
      >
        {isRealized ? "Odblokuj" : "Zaksięguj"}
      </Button>
    </div>
  );
});

export function AdminReportDetail(props: AdminReportDetailProps): JSX.Element {
  return (
    <ToastProvider>
      <AdminReportDetailContent {...props} />
    </ToastProvider>
  );
}

// Utility component for displaying amounts (may be used in future)
// interface AmountItemProps {
//   label: string;
//   value: number | null | undefined;
//   emphasize?: boolean;
// }

// function AmountItem({ label, value, emphasize }: AmountItemProps): JSX.Element {
//   return (
//     <div className="space-y-1">
//       <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
//       <dd className={emphasize ? "text-base font-semibold text-foreground" : "text-sm text-foreground"}>
//         {formatMoney(value)}
//       </dd>
//     </div>
//   );
// }

interface MetadataItemProps {
  label: string;
  value: string;
}

function MetadataItem({ label, value }: MetadataItemProps): JSX.Element {
  return (
    <div className="space-y-1">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}

// Utility function for formatting money (may be used in future)
// function formatMoney(raw: number | null | undefined): string {
//   if (typeof raw !== "number" || Number.isNaN(raw)) {
//     return "—";
//   }
//   return currencyFormatter.format(raw / 100);
// }

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
    case "pending":
      return "Do wygenerowania";
    case "generated":
      return "Wygenerowany";
    case "realized":
      return "Zaksięgowany";
    default:
      return status;
  }
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return dateTimeFormatter.format(date);
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
