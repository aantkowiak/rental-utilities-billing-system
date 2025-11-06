import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";

import { ErrorAlert } from "@/components/common/ErrorAlert";
import { ToastProvider, useToast } from "@/components/common/ToastProvider";
import { Button } from "@/components/ui/button";
import { apiGet, apiPost, type ApiError } from "@/lib/client/http";
import type {
  GenerateReportCmd,
  ReportDTO,
  ReportEmailAttemptDTO,
  UpdateReportStatusCmd,
} from "@/types";

const MONTH_STORAGE_KEY = "admin-reports:month";

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
    const now = new Date();
    return `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, "0")}`;
  }

  const params = new URLSearchParams(window.location.search);
  const param = params.get("month");
  const stored = window.localStorage.getItem(MONTH_STORAGE_KEY);
  const fallback = (() => {
    const now = new Date();
    return `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, "0")}`;
  })();

  return param || stored || fallback;
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

function AdminReportsContent(): JSX.Element {
  const { pushToast } = useToast();

  const [month, setMonth] = useState<string>(() => resolveInitialMonth());
  const [items, setItems] = useState<AdminReportListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [accessError, setAccessError] = useState<string | null>(null);

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

  const loadReports = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    setAccessError(null);

    try {
      const path = listQuery ? `/api/v1/reports?${listQuery}` : "/api/v1/reports";
      const response = await apiGet<AdminReportsResponse>(path);
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
      // handled inside loadReports
    });
  }, [loadReports]);

  const handleMonthChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const next = event.target.value;
    setMonth(next);
  }, []);

  const handleActionError = useCallback(
    (error: ApiError) => {
      pushToast({
        variant: "error",
        title: "Nie udało się wykonać akcji",
        description: error.message,
      });
    },
    [pushToast]
  );

  const handleGenerate = useCallback(
    async (item: AdminReportListItem) => {
      if (pendingAction) {
        return;
      }

      const permissions = item.permissions;
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

      setPendingAction(true);

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
        await loadReports();
      } catch (error) {
        handleActionError(toApiError(error));
      } finally {
        setPendingAction(false);
      }
    },
    [handleActionError, loadReports, month, pendingAction, pushToast]
  );

  const handleRegenerate = useCallback(
    async (item: AdminReportListItem) => {
      if (pendingAction) {
        return;
      }

      const permissions = item.permissions;
      if (permissions && (!permissions.canRegenerate || permissions.regenerateDisabledReason)) {
        if (permissions?.regenerateDisabledReason) {
          pushToast({
            variant: "info",
            title: "Nie można przeliczyć raportu",
            description: permissions.regenerateDisabledReason,
          });
        }
        return;
      }

      setPendingAction(true);

      try {
        await apiPost<void>(`/api/v1/reports/${encodeURIComponent(item.report.id)}/regenerate`);
        pushToast({
          variant: "success",
          title: "Przeliczanie zaplanowane",
          description: "Raport zostanie wygenerowany ponownie.",
        });
        await loadReports();
      } catch (error) {
        handleActionError(toApiError(error));
      } finally {
        setPendingAction(false);
      }
    },
    [handleActionError, loadReports, pendingAction, pushToast]
  );

  const handleResend = useCallback(
    async (item: AdminReportListItem) => {
      if (pendingAction) {
        return;
      }

      const permissions = item.permissions;
      if (permissions && (!permissions.canSendEmail || permissions.sendEmailDisabledReason)) {
        if (permissions?.sendEmailDisabledReason) {
          pushToast({
            variant: "info",
            title: "Nie można wysłać wiadomości",
            description: permissions.sendEmailDisabledReason,
          });
        }
        return;
      }

      setPendingAction(true);

      try {
        await apiPost<void>(`/api/v1/reports/${encodeURIComponent(item.report.id)}/send-email`);
        pushToast({
          variant: "success",
          title: "E-mail wysłany",
          description: "Raport został ponownie wysłany do najemcy.",
        });
        await loadReports();
      } catch (error) {
        handleActionError(toApiError(error));
      } finally {
        setPendingAction(false);
      }
    },
    [handleActionError, loadReports, pendingAction, pushToast]
  );

  const handleToggleRealized = useCallback(
    async (item: AdminReportListItem) => {
      if (pendingAction) {
        return;
      }

      const permissions = item.permissions;
      if (permissions && (!permissions.canToggleRealized || permissions.toggleRealizedDisabledReason)) {
        if (permissions?.toggleRealizedDisabledReason) {
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
        const confirmed = window.confirm("Czy na pewno chcesz odblokować raport? Zmiany staną się widoczne dla najemcy.");
        if (!confirmed) {
          return;
        }
      }

      setPendingAction(true);
      try {
        await apiPost<void>(`/api/v1/reports/${encodeURIComponent(item.report.id)}`, {
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
        await loadReports();
      } catch (error) {
        handleActionError(toApiError(error));
      } finally {
        setPendingAction(false);
      }
    },
    [handleActionError, loadReports, pendingAction, pushToast]
  );

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
      {fetchError ? <ErrorAlert error={fetchError} /> : null}

      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <header className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Raporty</h2>
            <p className="text-sm text-muted-foreground">
              {month ? `Zestawienie raportów dla miesiąca ${formatMonth(month)}.` : "Wybierz miesiąc, aby wyświetlić raporty."}
            </p>
          </div>
          <Button
            variant="secondary"
            type="button"
            onClick={() => loadReports().catch(() => {})}
            disabled={loading}
          >
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
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-4 py-4 text-center text-muted-foreground" colSpan={5}>
                    Ładowanie raportów…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-center text-muted-foreground" colSpan={5}>
                    Brak raportów dla wybranego miesiąca.
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const report = item.report;
                  const permissions = item.permissions ?? {};

                  return (
                    <tr key={report.id} className="rounded-lg border border-border bg-background/80 align-top shadow-sm">
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <a
                            className="font-medium text-foreground underline-offset-2 hover:underline"
                            href={`/app/reports/${encodeURIComponent(report.id)}`}
                          >
                            {formatMonth(report.month)}
                          </a>
                          <span className="text-xs text-muted-foreground">Kontrakt: {report.contractId}</span>
                          <span className="text-xs text-muted-foreground">
                            Utworzono: {formatDateTime(report.createdAt)} | Aktualizacja: {formatDateTime(report.updatedAt)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-medium text-foreground">
                            {report.status === "realized"
                              ? "Zaksięgowany"
                              : report.status === "generated"
                              ? "Wygenerowany"
                              : "Do wygenerowania"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Kotwica: {report.anchorReadingId ? "tak" : "brak"} | Następna:{" "}
                            {report.anchorReadingNextId ? "tak" : "brak"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1 text-sm text-foreground">
                          <span>Saldo: {formatCurrency(report.balanceRaw)}</span>
                          <span className="text-xs text-muted-foreground">
                            Koszty: {formatCurrency(report.meterCostColdRaw)} / {formatCurrency(report.meterCostHotRaw)} /{" "}
                            {formatCurrency(report.meterCostHeatingRaw)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {item.lastEmailAttempt ? (
                          <>
                            <span>{formatDateTime(item.lastEmailAttempt.attemptedAt)}</span>
                            <span className="block">
                              Status: {item.lastEmailAttempt.status}
                              {item.lastEmailAttempt.errorMessage ? ` – ${item.lastEmailAttempt.errorMessage}` : ""}
                            </span>
                          </>
                        ) : (
                          "Brak wysyłek"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap justify-end gap-2">
                          <Button
                            type="button"
                            variant="secondary"
                            disabled={pendingAction}
                            onClick={() => handleGenerate(item)}
                            title={permissions.generateDisabledReason ?? undefined}
                          >
                            Generuj
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            disabled={pendingAction}
                            onClick={() => handleRegenerate(item)}
                            title={permissions.regenerateDisabledReason ?? undefined}
                          >
                            Przelicz
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            disabled={pendingAction}
                            onClick={() => handleResend(item)}
                            title={permissions.sendEmailDisabledReason ?? undefined}
                          >
                            Wyślij e-mail
                          </Button>
                          <Button
                            type="button"
                            variant={report.status === "realized" ? "destructive" : "default"}
                            disabled={pendingAction}
                            onClick={() => handleToggleRealized(item)}
                            title={permissions.toggleRealizedDisabledReason ?? undefined}
                          >
                            {report.status === "realized" ? "Odblokuj" : "Zaksięguj"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export function AdminReportsTable(): JSX.Element {
  return (
    <ToastProvider>
      <AdminReportsContent />
    </ToastProvider>
  );
}

