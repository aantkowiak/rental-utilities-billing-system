import { useCallback, useEffect, useMemo, useState } from "react";

import { ErrorAlert } from "@/components/common/ErrorAlert";
import { ToastProvider, useToast } from "@/components/common/ToastProvider";
import { Button } from "@/components/ui/button";
import { apiGet, apiPost, type ApiError } from "@/lib/client/http";
import type { ReportDTO, ReportEmailAttemptDTO } from "@/types";

interface TenantReportPermissions {
  canGenerate?: boolean;
  generateDisabledReason?: string | null;
  canSendEmail?: boolean;
  sendEmailDisabledReason?: string | null;
}

interface TenantReportDetailResponse {
  report: ReportDTO;
  lastEmailAttempt?: ReportEmailAttemptDTO | null;
  permissions?: TenantReportPermissions | null;
}

interface TenantReportDetailProps {
  reportId: string;
}

const currencyFormatter = new Intl.NumberFormat("pl-PL", {
  currency: "PLN",
  style: "currency",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat("pl-PL", {
  dateStyle: "long",
});

const dateTimeFormatter = new Intl.DateTimeFormat("pl-PL", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function TenantReportDetail({ reportId }: TenantReportDetailProps): JSX.Element {
  const { pushToast } = useToast();
  const [report, setReport] = useState<ReportDTO | null>(null);
  const [lastEmailAttempt, setLastEmailAttempt] = useState<ReportEmailAttemptDTO | null>(null);
  const [permissions, setPermissions] = useState<TenantReportPermissions | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<boolean>(false);

  const canResend = useMemo(() => {
    if (!permissions) {
      return false;
    }

    if (permissions.sendEmailDisabledReason) {
      return false;
    }

    return Boolean(permissions.canSendEmail);
  }, [permissions]);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    setAccessError(null);

    try {
      const response = await apiGet<TenantReportDetailResponse>(
        `/api/v1/reports/${encodeURIComponent(reportId)}`
      );
      setReport(response.report);
      setLastEmailAttempt(response.lastEmailAttempt ?? null);
      setPermissions(response.permissions ?? null);
    } catch (error) {
      const apiError = toApiError(error);

      if (apiError.code === "forbidden") {
        setAccessError(apiError.message);
        setReport(null);
        setLastEmailAttempt(null);
        setPermissions(null);
        return;
      }

      setFetchError(apiError.message);
      setReport(null);
      setLastEmailAttempt(null);
      setPermissions(null);
    } finally {
      setLoading(false);
    }
  }, [reportId]);

  useEffect(() => {
    loadDetail().catch(() => {
      // błąd obsłużony w loadDetail
    });
  }, [loadDetail]);

  const handleResend = useCallback(async () => {
    if (pendingAction || !canResend) {
      return;
    }

    setPendingAction(true);

    try {
      await apiPost<void>(`/api/v1/reports/${encodeURIComponent(reportId)}/send-email`);
      pushToast({
        variant: "success",
        title: "E-mail wysłany",
        description: "Raport został ponownie wysłany na adres e-mail.",
      });
      await loadDetail();
    } catch (error) {
      const apiError = toApiError(error);

      if (apiError.code === "forbidden") {
        pushToast({
          variant: "error",
          title: "Brak uprawnień",
          description: apiError.message,
        });
      } else {
        pushToast({
          variant: "error",
          title: "Nie udało się wysłać e-maila",
          description: apiError.message,
        });
      }

      if (apiError.code === "conflict") {
        await loadDetail();
      }
    } finally {
      setPendingAction(false);
    }
  }, [canResend, loadDetail, pendingAction, pushToast, reportId]);

  const resendDisabledReason = permissions?.sendEmailDisabledReason;

  return (
    <section className="space-y-6">
      {accessError ? <ErrorAlert error={accessError} /> : null}
      {fetchError ? <ErrorAlert error={fetchError} /> : null}

      {loading ? <p className="text-sm text-muted-foreground">Ładowanie raportu…</p> : null}

      {!loading && !report && !accessError ? (
        <p className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-sm text-muted-foreground">
          Nie znaleziono danych raportu.
        </p>
      ) : null}

      {report ? (
        <article className="space-y-6">
          <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h2 className="text-2xl font-semibold text-foreground">{formatMonth(report.month)}</h2>
              <p className="text-sm text-muted-foreground">{formatStatus(report.status)}</p>
            </div>

            <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
              {canResend ? (
                <Button disabled={pendingAction} onClick={handleResend} type="button">
                  {pendingAction ? "Wysyłanie…" : "Wyślij ponownie"}
                </Button>
              ) : resendDisabledReason ? (
                <span className="text-xs text-muted-foreground" title={resendDisabledReason ?? undefined}>
                  {resendDisabledReason}
                </span>
              ) : null}
            </div>
          </header>

          <section className="rounded-lg border bg-card p-6 shadow-sm">
            <h3 className="text-base font-semibold text-foreground">Podsumowanie</h3>
            <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Identyfikator umowy</dt>
                <dd className="text-sm font-medium text-foreground">{report.contractId}</dd>
              </div>
              <div className="space-y-1">
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Status realizacji</dt>
                <dd className="text-sm font-medium text-foreground">
                  {report.realizedAt ? `Zaksięgowany ${formatDateTime(report.realizedAt)}` : "Nie zrealizowany"}
                </dd>
              </div>
              <div className="space-y-1">
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Utworzono</dt>
                <dd className="text-sm text-foreground">{formatDateTime(report.createdAt)}</dd>
              </div>
              <div className="space-y-1">
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Ostatnia aktualizacja</dt>
                <dd className="text-sm text-foreground">{formatDateTime(report.updatedAt)}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-lg border bg-card p-6 shadow-sm">
            <h3 className="text-base font-semibold text-foreground">Kwoty</h3>
            <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <AmountItem label="Czynsz bieżący" value={report.actualRentRaw} />
              <AmountItem label="Koszty stałe" value={report.fixedCostRaw} />
              <AmountItem label="Koszt zużycia wody zimnej" value={report.meterCostColdRaw} />
              <AmountItem label="Koszt zużycia wody ciepłej" value={report.meterCostHotRaw} />
              <AmountItem label="Koszt ogrzewania" value={report.meterCostHeatingRaw} />
              <AmountItem label="Saldo" value={report.balanceRaw} emphasize />
            </dl>
          </section>

          <section className="rounded-lg border bg-card p-6 shadow-sm space-y-4">
            <h3 className="text-base font-semibold text-foreground">Ostatnia wysyłka e-mail</h3>
            {lastEmailAttempt ? (
              <div className="space-y-1 text-sm">
                <p className="font-medium text-foreground">{formatDateTime(lastEmailAttempt.attemptedAt)}</p>
                <p className="text-muted-foreground">
                  Status: {lastEmailAttempt.status}
                  {lastEmailAttempt.errorMessage ? ` · ${lastEmailAttempt.errorMessage}` : ""}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Brak informacji o próbach wysyłki.</p>
            )}
          </section>
        </article>
      ) : null}
    </section>
  );
}

export function TenantReportDetailView(props: TenantReportDetailProps): JSX.Element {
  return (
    <ToastProvider>
      <TenantReportDetail {...props} />
    </ToastProvider>
  );
}

interface AmountItemProps {
  label: string;
  value: number | null | undefined;
  emphasize?: boolean;
}

function AmountItem({ label, value, emphasize }: AmountItemProps): JSX.Element {
  return (
    <div className="space-y-1">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className={emphasize ? "text-base font-semibold text-foreground" : "text-sm text-foreground"}>
        {formatMoney(value)}
      </dd>
    </div>
  );
}

function formatMoney(raw: number | null | undefined): string {
  if (typeof raw !== "number" || Number.isNaN(raw)) {
    return "—";
  }

  return currencyFormatter.format(raw / 100);
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

  return dateFormatter.format(date);
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
  };
}

