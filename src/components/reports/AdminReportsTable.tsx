/* eslint-disable no-console */
import type { JSX } from "react";
import { memo, useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";

import { ErrorAlert } from "@/components/common/ErrorAlert";
import { ToastProvider, useToast } from "@/components/common/ToastProvider";
import { Button } from "@/components/ui/button";
import { apiGet, apiPost, type ApiError } from "@/lib/client/http";
import type { PropertyDTO } from "@/types";
import { formatYearMonthLabel, isoDateToYearMonth, isValidYearMonth } from "@/lib/date/month";

const PROPERTY_STORAGE_KEY = "admin-reports:propertyId";

interface AdminReportSummary {
  id: string;
  contractId: string;
  propertyId: string;
  month: string;
  status: "draft" | "realized" | "unlocked";
  sent: boolean;
  realizedAt: string | null;
  createdAt: string;
  updatedAt: string;
  lastSentAt: string | null;
  balanceRaw: number;
}

interface AdminReportListItem {
  report: AdminReportSummary;
}

interface AdminReportsResponse {
  items: AdminReportListItem[];
}

function normalizePropertyId(value: string | null | undefined): string | null {
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }
  return value;
}

function resolveInitialPropertyId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const searchParams = new URLSearchParams(window.location.search);
  const param = normalizePropertyId(searchParams.get("propertyId"));
  const stored = normalizePropertyId(window.localStorage.getItem(PROPERTY_STORAGE_KEY));

  return param ?? stored ?? null;
}

function toApiError(error: unknown): ApiError {
  if (error && typeof error === "object" && "code" in error && "message" in error) {
    return error as ApiError;
  }

  return {
    code: "unexpected_error",
    message: error instanceof Error ? error.message : "Wystąpił nieoczekiwany błąd.",
    status: error && typeof error === "object" && "status" in error ? (error as ApiError).status : undefined,
    details: error && typeof error === "object" && "details" in error ? (error as ApiError).details : undefined,
  };
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
  }).format(raw);
}

function formatStatus(status: AdminReportSummary["status"]): string {
  switch (status) {
    case "realized":
      return "Zaksięgowany";
    case "unlocked":
      return "Odblokowany";
    case "draft":
    default:
      return "Szkic";
  }
}

const STATUS_CLASS_MAP: Record<AdminReportSummary["status"], string> = {
  draft: "border-input bg-secondary text-secondary-foreground",
  realized: "border-transparent bg-emerald-500/10 text-emerald-600",
  unlocked: "border-transparent bg-amber-500/10 text-amber-600",
};

function shouldToast(code: string | undefined): boolean {
  if (!code) {
    return true;
  }

  return ["unexpected_error", "internal_error", "conflict", "too_many_requests", "rate_limited"].includes(code);
}

const AdminReportRow = memo(function AdminReportRowComponent({
  item,
  sendPending,
  onSend,
}: {
  item: AdminReportListItem;
  sendPending: boolean;
  onSend: (item: AdminReportListItem) => void;
}): JSX.Element {
  const handleSendClick = useCallback(() => {
    onSend(item);
  }, [item, onSend]);

  const balance = item.report.balanceRaw;
  const balanceClass =
    balance < 0 ? "text-destructive" : balance > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground";

  return (
    <tr className="rounded-lg border border-border bg-background/80 text-sm shadow-sm">
      <td className="px-4 py-3 align-top">
        <div className="space-y-1">
          <a
            className="font-medium text-foreground underline-offset-2 hover:underline"
            href={`/admin/reports/${item.report.id}`}
          >
            {formatMonth(item.report.month)}
          </a>
          <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_CLASS_MAP[item.report.status]}`}
          >
            {formatStatus(item.report.status)}
          </span>
          <p className="text-xs text-muted-foreground">
            Kontrakt: <span className="font-medium text-foreground">{item.report.contractId}</span>
          </p>
        </div>
      </td>
      <td className="px-4 py-3 align-top text-sm text-muted-foreground">{formatDateTime(item.report.updatedAt)}</td>
      <td className="px-4 py-3 align-top text-sm text-muted-foreground">{formatDateTime(item.report.lastSentAt)}</td>
      <td className={`px-4 py-3 align-top text-sm font-semibold ${balanceClass}`}>{formatCurrency(balance)}</td>
      <td className="px-4 py-3 align-top">
        <div className="flex justify-end gap-2">
          <Button asChild size="sm" variant="ghost">
            <a href={`/admin/reports/${item.report.id}`}>Szczegóły</a>
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={handleSendClick}
            disabled={sendPending}
            aria-disabled={sendPending}
          >
            {sendPending ? "Wysyłanie…" : "Wyślij"}
          </Button>
        </div>
      </td>
    </tr>
  );
});

const AdminReportsContent = memo(function AdminReportsContentComponent(): JSX.Element {
  const { pushToast } = useToast();

  const [propertyId, setPropertyId] = useState<string | null>(() => resolveInitialPropertyId());
  const [properties, setProperties] = useState<PropertyDTO[]>([]);
  const [items, setItems] = useState<AdminReportListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [propertiesLoading, setPropertiesLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [sendPendingById, setSendPendingById] = useState<Record<string, boolean>>({});

  const lastLoadedQueryRef = useRef<string | null>(null);
  const loadingRef = useRef(false);
  const invalidatePromiseRef = useRef<Promise<void> | null>(null);

  const listQuery = useMemo(() => {
    const params = new URLSearchParams();
    if (propertyId) {
      params.set("propertyId", propertyId);
    }
    return params.toString();
  }, [propertyId]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const url = new URL(window.location.href);
    if (propertyId) {
      url.searchParams.set("propertyId", propertyId);
    } else {
      url.searchParams.delete("propertyId");
    }
    window.history.replaceState(null, "", url.toString());
  }, [propertyId]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    if (propertyId) {
      window.localStorage.setItem(PROPERTY_STORAGE_KEY, propertyId);
    } else {
      window.localStorage.removeItem(PROPERTY_STORAGE_KEY);
    }
  }, [propertyId]);

  const loadProperties = useCallback(async () => {
    setPropertiesLoading(true);
    try {
      const response = await apiGet<{ items: PropertyDTO[] }>("/api/v1/properties");
      setProperties(response.items || []);
    } catch (error) {
      console.error("Failed to load properties:", error);
    } finally {
      setPropertiesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProperties().catch(() => {
      /* handled inside loadProperties */
    });
  }, [loadProperties]);

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
      setActionError(null);

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
      /* handled inside loadReports */
    });
  }, [loadReports]);

  const handlePropertyChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    const next = normalizePropertyId(event.target.value);
    setPropertyId(next);
  }, []);

  const handleSend = useCallback(
    async (item: AdminReportListItem) => {
      const reportId = item.report.id;

      setActionError(null);

      setSendPendingById((prev) => {
        if (prev[reportId]) {
          return prev;
        }
        return { ...prev, [reportId]: true };
      });

      try {
        await apiPost(`/api/v1/reports/${encodeURIComponent(reportId)}/send-email`);
        pushToast({
          variant: "success",
          title: "E-mail wysłany",
          description: "Raport został wysłany do najemcy.",
        });
        await invalidateReports();
      } catch (error) {
        const apiError = toApiError(error);

        if (apiError.code === "forbidden" || apiError.status === 403) {
          setActionError(apiError.message);
        } else {
          pushToast({
            variant: "error",
            title: "Nie udało się wysłać e-maila",
            description: apiError.message,
          });

          if (apiError.code === "conflict" || apiError.status === 409) {
            await invalidateReports();
          }
        }
      } finally {
        setSendPendingById((prev) => {
          const next = { ...prev };
          delete next[reportId];
          return next;
        });
      }
    },
    [invalidateReports, pushToast]
  );

  const handleRefreshClick = useCallback(() => {
    invalidateReports().catch(() => {
      /* handled inside invalidateReports */
    });
  }, [invalidateReports]);

  const renderedRows = useMemo(() => {
    if (loading) {
      return (
        <tr>
          <td className="px-4 py-4 text-center text-muted-foreground" colSpan={5}>
            Ładowanie raportów…
          </td>
        </tr>
      );
    }

    if (items.length === 0) {
      return (
        <tr>
          <td className="px-4 py-4 text-center text-muted-foreground" colSpan={5}>
            Brak raportów dla wybranego zakresu.
          </td>
        </tr>
      );
    }

    return items.map((item) => (
      <AdminReportRow
        key={item.report.id}
        item={item}
        sendPending={Boolean(sendPendingById[item.report.id])}
        onSend={handleSend}
      />
    ));
  }, [handleSend, items, loading, sendPendingById]);

  return (
    <section className="space-y-8">
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground">Filtry</h2>
        <div className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="admin-reports-property">
                Nieruchomość
              </label>
              <select
                id="admin-reports-property"
                className="w-full max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                value={propertyId ?? ""}
                onChange={handlePropertyChange}
                disabled={propertiesLoading}
              >
                <option value="">Wszystkie nieruchomości</option>
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Wybrana nieruchomość jest zapisywana w adresie URL i pamięci przeglądarki.
              </p>
            </div>
          </div>
        </div>
      </div>

      {accessError ? <ErrorAlert error={accessError} /> : null}
      {actionError ? <ErrorAlert error={actionError} /> : null}
      {fetchError ? <ErrorAlert error={fetchError} /> : null}

      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <header className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Raporty</h2>
            <p className="text-sm text-muted-foreground">
              {propertyId ? "Wszystkie raporty dla wybranej nieruchomości." : "Raporty dla wszystkich nieruchomości."}
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
                <th className="px-4 py-2 text-left font-medium">Miesiąc</th>
                <th className="px-4 py-2 text-left font-medium">Ostatnia modyfikacja</th>
                <th className="px-4 py-2 text-left font-medium">Ostatnia wysyłka</th>
                <th className="px-4 py-2 text-left font-medium">Saldo</th>
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

export function AdminReportsTable(): JSX.Element {
  return (
    <ToastProvider>
      <AdminReportsContent />
    </ToastProvider>
  );
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

    if (areReportsEqual(existing.report, item.report)) {
      return previous[index] ?? existing;
    }

    didChange = true;
    return item;
  });

  if (!didChange) {
    return previous;
  }

  return merged;
}

function areReportsEqual(previous: AdminReportSummary, next: AdminReportSummary): boolean {
  return (
    previous.contractId === next.contractId &&
    previous.propertyId === next.propertyId &&
    previous.month === next.month &&
    previous.status === next.status &&
    previous.sent === next.sent &&
    previous.realizedAt === next.realizedAt &&
    previous.createdAt === next.createdAt &&
    previous.updatedAt === next.updatedAt &&
    previous.lastSentAt === next.lastSentAt &&
    previous.balanceRaw === next.balanceRaw
  );
}
