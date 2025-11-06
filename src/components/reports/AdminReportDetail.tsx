import { useCallback, useEffect, useMemo, useState } from "react";

import { ErrorAlert } from "@/components/common/ErrorAlert";
import { ToastProvider, useToast } from "@/components/common/ToastProvider";
import { Button } from "@/components/ui/button";
import { apiGet, apiPost, type ApiError } from "@/lib/client/http";
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

const currencyFormatter = new Intl.NumberFormat("pl-PL", {
  currency: "PLN",
  style: "currency",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const monthFormatter = new Intl.DateTimeFormat("pl-PL", {
  month: "long",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("pl-PL", {
  dateStyle: "medium",
  timeStyle: "short",
});

function AdminReportDetailContent({ reportId }: AdminReportDetailProps): JSX.Element {
  const { pushToast } = useToast();

  const [report, setReport] = useState<ReportDTO | null>(null);
  const [lineItems, setLineItems] = useState<ReportLineItem[]>([]);
  const [lastEmailAttempt, setLastEmailAttempt] = useState<ReportEmailAttemptDTO | null>(null);
  const [permissions, setPermissions] = useState<AdminReportPermissions | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [actionAccessError, setActionAccessError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState(false);

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

  const displayLineItems = useMemo(() => {
    if (lineItems.length > 0) {
      return lineItems;
    }

    if (!report) {
      return [];
    }

    return [
      {
        id: "actual-rent",
        label: "Czynsz bieżący",
        amountRaw: report.actualRentRaw,
      },
      {
        id: "fixed-cost",
        label: "Koszty stałe",
        amountRaw: report.fixedCostRaw,
      },
      {
        id: "meter-cold",
        label: "Koszt zimnej wody",
        amountRaw: report.meterCostColdRaw,
      },
      {
        id: "meter-hot",
        label: "Koszt ciepłej wody",
        amountRaw: report.meterCostHotRaw,
      },
      {
        id: "meter-heating",
        label: "Koszt ogrzewania",
        amountRaw: report.meterCostHeatingRaw,
      },
    ];
  }, [lineItems, report]);

  const handleRegenerate = useCallback(async () => {
    if (!report || pendingAction || !canRegenerate) {
      return;
    }

    setPendingAction(true);
    setActionAccessError(null);

    try {
      await apiPost<void>(`/api/v1/reports/${encodeURIComponent(report.id)}/regenerate`);
      pushToast({
        variant: "success",
        title: "Przeliczanie zaplanowane",
        description: "Raport zostanie wygenerowany ponownie.",
      });
      await loadDetail();
    } catch (error) {
      const apiError = toApiError(error);

      if (apiError.code === "forbidden") {
        setActionAccessError(apiError.message);
      } else {
        pushToast({
          variant: "error",
          title: "Nie udało się przeliczyć raportu",
          description: apiError.message,
        });

        if (apiError.code === "conflict") {
          await loadDetail();
        }
      }
    } finally {
      setPendingAction(false);
    }
  }, [canRegenerate, loadDetail, pendingAction, pushToast, report]);

  const handleResend = useCallback(async () => {
    if (!report || pendingAction || !canSendEmail) {
      return;
    }

    setPendingAction(true);
    setActionAccessError(null);

    try {
      await apiPost<void>(`/api/v1/reports/${encodeURIComponent(report.id)}/send-email`);
      pushToast({
        variant: "success",
        title: "E-mail wysłany",
        description: "Raport został ponownie wysłany do najemcy.",
      });
      await loadDetail();
    } catch (error) {
      const apiError = toApiError(error);

      if (apiError.code === "forbidden") {
        setActionAccessError(apiError.message);
      } else {
        pushToast({
          variant: "error",
          title: "Nie udało się wysłać e-maila",
          description: apiError.message,
        });

        if (apiError.code === "conflict") {
          await loadDetail();
        }
      }
    } finally {
      setPendingAction(false);
    }
  }, [canSendEmail, loadDetail, pendingAction, pushToast, report]);

  const handleToggleRealized = useCallback(async () => {
    if (!report || pendingAction || !canToggleRealized) {
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

    setPendingAction(true);
    setActionAccessError(null);

    try {
      await apiPost<void>(`/api/v1/reports/${encodeURIComponent(report.id)}`, { status: nextStatus });
      pushToast({
        variant: "success",
        title: nextStatus === "realized" ? "Raport zaksięgowany" : "Raport odblokowany",
        description:
          nextStatus === "realized"
            ? "Raport został oznaczony jako zrealizowany."
            : "Raport został odblokowany do edycji.",
      });
      await loadDetail();
    } catch (error) {
      const apiError = toApiError(error);

      if (apiError.code === "forbidden") {
        setActionAccessError(apiError.message);
      } else {
        pushToast({
          variant: "error",
          title: "Nie udało się zmienić statusu raportu",
          description: apiError.message,
        });

        if (apiError.code === "conflict") {
          await loadDetail();
        }
      }
    } finally {
      setPendingAction(false);
    }
  }, [canToggleRealized, loadDetail, pendingAction, pushToast, report]);

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
            <div className="flex flex-wrap items-center justify-end gap-2">
              {isRealized ? null : (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={pendingAction || !canRegenerate}
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
                disabled={pendingAction || !canSendEmail}
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
                disabled={pendingAction || !canToggleRealized}
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
          </header>

          <section className="rounded-lg border bg-card p-6 shadow-sm">
            <h3 className="text-base font-semibold text-foreground">Metadane</h3>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <MetadataItem label="Identyfikator raportu" value={report.id} />
              <MetadataItem label="Kotwica początkowa" value={report.anchorReadingId ?? "—"} />
              <MetadataItem label="Kotwica końcowa" value={report.anchorReadingNextId ?? "—"} />
              <MetadataItem label="Utworzono" value={formatDateTime(report.createdAt)} />
              <MetadataItem label="Ostatnia aktualizacja" value={formatDateTime(report.updatedAt)} />
              <MetadataItem
                label="Zaksięgowano"
                value={report.realizedAt ? formatDateTime(report.realizedAt) : "Nie zaksięgowano"}
              />
            </dl>
          </section>

          <section className="rounded-lg border bg-card p-6 shadow-sm">
            <h3 className="text-base font-semibold text-foreground">Pozycje rozliczenia</h3>
            <div className="mt-4 overflow-hidden rounded-md border">
              {displayLineItems.length > 0 ? (
                <table className="w-full border-separate border-spacing-0 text-sm">
                  <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium">Pozycja</th>
                      <th className="px-4 py-2 text-left font-medium">Opis</th>
                      <th className="px-4 py-2 text-right font-medium">Kwota</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayLineItems.map((item) => (
                      <tr key={item.id} className="border-t border-border bg-background/80">
                        <td className="px-4 py-2">
                          <div className="flex flex-col">
                            <span className="font-medium text-foreground">{item.label}</span>
                            {item.category ? (
                              <span className="text-xs uppercase tracking-wide text-muted-foreground">
                                {item.category}
                              </span>
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

          <section className="rounded-lg border bg-card p-6 shadow-sm">
            <h3 className="text-base font-semibold text-foreground">Podsumowanie kwot</h3>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <AmountItem label="Czynsz bieżący" value={report.actualRentRaw} />
              <AmountItem label="Koszty stałe" value={report.fixedCostRaw} />
              <AmountItem label="Koszt zużycia zimnej wody" value={report.meterCostColdRaw} />
              <AmountItem label="Koszt zużycia ciepłej wody" value={report.meterCostHotRaw} />
              <AmountItem label="Koszt ogrzewania" value={report.meterCostHeatingRaw} />
              <AmountItem label="Saldo" value={report.balanceRaw} emphasize />
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

export function AdminReportDetail(props: AdminReportDetailProps): JSX.Element {
  return (
    <ToastProvider>
      <AdminReportDetailContent {...props} />
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

  return monthFormatter.format(date);
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
  };
}


