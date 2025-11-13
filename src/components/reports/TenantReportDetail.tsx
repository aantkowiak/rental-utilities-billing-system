import { memo, useCallback, useEffect, useMemo, useState } from "react";

import { ErrorAlert } from "@/components/common/ErrorAlert";
import { ToastProvider, useToast } from "@/components/common/ToastProvider";
import { Button } from "@/components/ui/button";
import { apiGet, apiPost, type ApiError } from "@/lib/client/http";
import { formatYearMonthLabel, isoDateToYearMonth, isValidYearMonth } from "@/lib/date/month";
import type { ReportDTO, ReportEmailAttemptDTO } from "@/types";

interface TenantReportPermissions {
  canGenerate?: boolean;
  generateDisabledReason?: string | null;
  canSendEmail?: boolean;
  sendEmailDisabledReason?: string | null;
}

interface TenantReportLineItem {
  id: string;
  label: string;
  amountRaw: number | null;
  description?: string | null;
  category?: string | null;
}

interface TenantReportDetailResponse {
  report: ReportDTO;
  lineItems?: TenantReportLineItem[] | null;
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

const dateTimeFormatter = new Intl.DateTimeFormat("pl-PL", {
  dateStyle: "medium",
  timeStyle: "short",
});

function TenantReportDetailContent({ reportId }: TenantReportDetailProps): JSX.Element {
  const { pushToast } = useToast();

  const [report, setReport] = useState<ReportDTO | null>(null);
  const [lineItems, setLineItems] = useState<TenantReportLineItem[]>([]);
  const [lastEmailAttempt, setLastEmailAttempt] = useState<ReportEmailAttemptDTO | null>(null);
  const [permissions, setPermissions] = useState<TenantReportPermissions | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [actionAccessError, setActionAccessError] = useState<string | null>(null);
  const [pendingResend, setPendingResend] = useState(false);

  const loadDetail = useCallback(async () => {
    if (!reportId) {
      setReport(null);
      setLineItems([]);
      setLastEmailAttempt(null);
      setPermissions(null);
      setFetchError("Brak identyfikatora raportu.");
      setAccessError(null);
      setActionAccessError(null);
      return;
    }

    setLoading(true);
    setFetchError(null);
    setAccessError(null);
    setActionAccessError(null);

    try {
      const response = await apiGet<TenantReportDetailResponse>(`/api/v1/reports/${encodeURIComponent(reportId)}`);
      setReport(response.report);
      const normalizedLineItems = Array.isArray(response.lineItems) ? response.lineItems : [];
      setLineItems((previous) => (areLineItemsEqual(previous, normalizedLineItems) ? previous : normalizedLineItems));
      setLastEmailAttempt(response.lastEmailAttempt ?? null);
      setPermissions(response.permissions ?? null);
    } catch (error) {
      const apiError = toApiError(error);

      if (apiError.code === "forbidden" || apiError.status === 403) {
        setAccessError(apiError.message);
        setReport(null);
        setLineItems([]);
        setLastEmailAttempt(null);
        setPermissions(null);
        return;
      }

      if (apiError.code === "not_found" || apiError.status === 404) {
        setFetchError(apiError.message || "Nie znaleziono raportu.");
        setReport(null);
        setLineItems([]);
        setLastEmailAttempt(null);
        setPermissions(null);
        return;
      }

      setFetchError(apiError.message);

      const shouldShowToast = !apiError.status || apiError.status >= 500 || apiError.status === 409;
      if (shouldShowToast) {
        pushToast({
          variant: "error",
          title: "Nie udało się pobrać raportu",
          description: apiError.message,
        });
      }
    } finally {
      setLoading(false);
    }
  }, [pushToast, reportId]);

  useEffect(() => {
    loadDetail().catch(() => {
      /* obsłużone wewnątrz loadDetail */
    });
  }, [loadDetail]);

  const canResend = useMemo(() => {
    if (!report) {
      return false;
    }

    if (!permissions) {
      return true;
    }

    if (permissions.sendEmailDisabledReason) {
      return false;
    }

    if (permissions.canSendEmail === undefined) {
      return true;
    }

    return Boolean(permissions.canSendEmail);
  }, [permissions, report]);

  const resendDisabledReason = permissions?.sendEmailDisabledReason ?? null;
  const showFetchError = Boolean(fetchError) && !report;

  // Note: Line items and cost summaries are now displayed via ReportItemsView component

  const handleResend = useCallback(async () => {
    if (!report || pendingResend || !canResend) {
      return;
    }

    setPendingResend(true);
    setActionAccessError(null);

    try {
      await apiPost<void>(`/api/v1/reports/${encodeURIComponent(report.id)}/send-email`);
      pushToast({
        variant: "success",
        title: "E-mail wysłany",
        description: "Raport został ponownie wysłany na adres e-mail.",
      });
      await loadDetail();
    } catch (error) {
      const apiError = toApiError(error);

      if (apiError.code === "forbidden" || apiError.status === 403) {
        setActionAccessError(apiError.message);
      } else {
        pushToast({
          variant: "error",
          title: "Nie udało się wysłać e-maila",
          description: apiError.message,
        });

        if (apiError.code === "conflict" || apiError.status === 409) {
          await loadDetail();
        }
      }
    } finally {
      setPendingResend(false);
    }
  }, [canResend, loadDetail, pendingResend, pushToast, report]);

  const handleResendClick = useCallback(() => {
    handleResend().catch(() => {
      /* obsłużone w handleResend */
    });
  }, [handleResend]);

  const shouldShowEmptyState = !loading && !report && !accessError && !showFetchError;

  return (
    <section className="space-y-6">
      {accessError ? <ErrorAlert error={accessError} /> : null}
      {showFetchError && fetchError ? <ErrorAlert error={fetchError} /> : null}
      {actionAccessError ? <ErrorAlert error={actionAccessError} /> : null}

      {loading ? <p className="text-sm text-muted-foreground">Ładowanie raportu…</p> : null}

      {shouldShowEmptyState ? (
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
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button
                type="button"
                disabled={pendingResend || !canResend}
                onClick={handleResendClick}
                title={resendDisabledReason ?? undefined}
              >
                {pendingResend ? "Wysyłanie…" : "Wyślij ponownie"}
              </Button>
            </div>
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

export function TenantReportDetail(props: TenantReportDetailProps): JSX.Element {
  return (
    <ToastProvider>
      <TenantReportDetailContent {...props} />
    </ToastProvider>
  );
}

export const TenantReportDetailView = TenantReportDetail;

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

interface LineItemsProps {
  items: TenantReportLineItem[];
}

const TenantReportLineItems = memo(function TenantReportLineItems({ items }: LineItemsProps): JSX.Element {
  return (
    <section className="rounded-lg border bg-card p-6 shadow-sm">
      <h3 className="text-base font-semibold text-foreground">Pozycje rozliczenia</h3>
      <div className="mt-4 overflow-hidden rounded-md border">
        {items.length > 0 ? (
          <table className="w-full border-separate border-spacing-0 text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Pozycja</th>
                <th className="px-4 py-2 text-left font-medium">Opis</th>
                <th className="px-4 py-2 text-right font-medium">Kwota</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t border-border bg-background/80">
                  <td className="px-4 py-2">
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground">{item.label}</span>
                      {item.category ? (
                        <span className="text-xs uppercase tracking-wide text-muted-foreground">{item.category}</span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-2 text-sm text-muted-foreground">
                    {item.description ? item.description : "—"}
                  </td>
                  <td className="px-4 py-2 text-right text-sm font-medium text-foreground">
                    {formatMoney(item.amountRaw)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="px-4 py-3 text-sm text-muted-foreground">Brak pozycji w raporcie.</p>
        )}
      </div>
    </section>
  );
});

interface TenantReportTotalsProps {
  totals: {
    actualRentRaw: number | null | undefined;
    fixedCostRaw: number | null | undefined;
    meterCostColdRaw: number | null | undefined;
    meterCostHotRaw: number | null | undefined;
    meterCostHeatingRaw: number | null | undefined;
    balanceRaw: number | null | undefined;
  };
}

const TenantReportTotals = memo(function TenantReportTotals({ totals }: TenantReportTotalsProps): JSX.Element {
  return (
    <section className="rounded-lg border bg-card p-6 shadow-sm">
      <h3 className="text-base font-semibold text-foreground">Podsumowanie kwot</h3>
      <dl className="mt-4 grid gap-4 sm:grid-cols-2">
        <AmountItem label="Czynsz bieżący" value={totals.actualRentRaw} />
        <AmountItem label="Koszty stałe" value={totals.fixedCostRaw} />
        <AmountItem label="Koszt zużycia zimnej wody" value={totals.meterCostColdRaw} />
        <AmountItem label="Koszt zużycia ciepłej wody" value={totals.meterCostHotRaw} />
        <AmountItem label="Koszt ogrzewania" value={totals.meterCostHeatingRaw} />
        <AmountItem label="Saldo" value={totals.balanceRaw} emphasize />
      </dl>
    </section>
  );
});

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
  if (error && typeof error === "object") {
    const candidate = error as Partial<ApiError>;
    if (typeof candidate.code === "string" && typeof candidate.message === "string") {
      return {
        code: candidate.code,
        message: candidate.message,
        details: candidate.details,
        status: candidate.status,
      };
    }
  }

  return {
    code: "unexpected_error",
    message: error instanceof Error ? error.message : "Wystąpił nieoczekiwany błąd.",
  };
}

function areLineItemsEqual(previous: TenantReportLineItem[], next: TenantReportLineItem[]): boolean {
  if (previous === next) {
    return true;
  }

  if (previous.length !== next.length) {
    return false;
  }

  for (let index = 0; index < previous.length; index += 1) {
    const prev = previous[index];
    const nextItem = next[index];
    if (!prev || !nextItem) {
      return false;
    }

    if (
      prev.id !== nextItem.id ||
      prev.amountRaw !== nextItem.amountRaw ||
      prev.label !== nextItem.label ||
      prev.description !== nextItem.description ||
      prev.category !== nextItem.category
    ) {
      return false;
    }
  }

  return true;
}
