import { useCallback, useEffect, useState, type ReactElement } from "react";

import { ErrorAlert } from "@/components/common/ErrorAlert";
import { apiGet, type ApiError } from "@/lib/client/http";
import type { ReportItemDTO } from "@/types";

interface ReportItemsViewProps {
  reportId: string;
}

const currencyFormatter = new Intl.NumberFormat("pl-PL", {
  currency: "PLN",
  style: "currency",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const decimalFormatter = new Intl.NumberFormat("pl-PL", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 3,
});

function toApiError(error: unknown): ApiError {
  if (error && typeof error === "object" && "code" in error && "message" in error) {
    return error as ApiError;
  }

  return {
    code: "unexpected_error",
    message: error instanceof Error ? error.message : "Nie udało się pobrać pozycji raportu.",
  };
}

/**
 * Display report items (meter readings and costs) for a report.
 */
export function ReportItemsView({ reportId }: ReportItemsViewProps): ReactElement {
  const [items, setItems] = useState<ReportItemDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | string | null>(null);

  const loadItems = useCallback(async () => {
    if (!reportId) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiGet<{ items: ReportItemDTO[] }>(`/api/v1/reports/${reportId}/items`);
      setItems(response.items ?? []);
    } catch (err) {
      const apiError = toApiError(err);
      setError(apiError);
    } finally {
      setLoading(false);
    }
  }, [reportId]);

  useEffect(() => {
    loadItems().catch(() => {
      /* handled internally */
    });
  }, [loadItems]);

  if (loading) {
    return (
      <section aria-label="Pozycje raportu" className="rounded-lg border bg-card p-6 shadow-sm">
        <p className="text-sm text-muted-foreground">Ładowanie pozycji raportu...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section aria-label="Pozycje raportu" className="rounded-lg border bg-card p-6 shadow-sm">
        <ErrorAlert error={error} />
      </section>
    );
  }

  if (items.length === 0) {
    return (
      <section aria-label="Pozycje raportu" className="rounded-lg border bg-card p-6 shadow-sm">
        <p className="text-sm text-muted-foreground">Brak pozycji w raporcie.</p>
      </section>
    );
  }

  // Calculate totals
  const totals = items.reduce(
    (acc, item) => ({
      usageCold: acc.usageCold + item.usageColdM3,
      usageHot: acc.usageHot + item.usageHotM3,
      usageHeating: acc.usageHeating + item.usageHeatingGj,
      costCold: acc.costCold + item.costColdRaw,
      costHot: acc.costHot + item.costHotRaw,
      costHeating: acc.costHeating + item.costHeatingRaw,
      fixedCost: acc.fixedCost + item.fixedCostRaw,
      amount: acc.amount + item.amountRaw,
    }),
    {
      usageCold: 0,
      usageHot: 0,
      usageHeating: 0,
      costCold: 0,
      costHot: 0,
      costHeating: 0,
      fixedCost: 0,
      amount: 0,
    }
  );

  return (
    <section aria-label="Pozycje raportu" className="rounded-lg border bg-card p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-foreground">Szczegóły zużycia i kosztów</h3>

      <div className="space-y-6">
        {items.map((item) => (
          <div key={item.id} className="rounded-md border bg-muted/30 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="font-medium text-foreground">Licznik</h4>
              <span className="text-xs text-muted-foreground">ID: {item.propertyId.substring(0, 8)}...</span>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-sm font-medium text-foreground">Zimna woda</p>
                <p className="text-sm text-muted-foreground">
                  Zużycie: {decimalFormatter.format(item.usageColdM3)} m³
                </p>
                <p className="text-sm font-semibold text-foreground">{currencyFormatter.format(item.costColdRaw)}</p>
              </div>

              <div>
                <p className="text-sm font-medium text-foreground">Ciepła woda</p>
                <p className="text-sm text-muted-foreground">
                  Zużycie: {decimalFormatter.format(item.usageHotM3)} m³
                </p>
                <p className="text-sm font-semibold text-foreground">{currencyFormatter.format(item.costHotRaw)}</p>
              </div>

              <div>
                <p className="text-sm font-medium text-foreground">Ogrzewanie</p>
                <p className="text-sm text-muted-foreground">
                  Zużycie: {decimalFormatter.format(item.usageHeatingGj)} GJ
                </p>
                <p className="text-sm font-semibold text-foreground">{currencyFormatter.format(item.costHeatingRaw)}</p>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between border-t pt-3">
              <span className="text-sm font-medium text-muted-foreground">Koszt stały</span>
              <span className="text-sm font-semibold text-foreground">{currencyFormatter.format(item.fixedCostRaw)}</span>
            </div>

            <div className="mt-2 flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Suma dla licznika</span>
              <span className="text-base font-bold text-foreground">{currencyFormatter.format(item.amountRaw)}</span>
            </div>
          </div>
        ))}

        {items.length > 1 && (
          <div className="rounded-md border-2 border-primary/20 bg-primary/5 p-4">
            <h4 className="mb-3 font-semibold text-foreground">Podsumowanie całkowite</h4>

            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <p className="text-sm text-muted-foreground">Zimna woda</p>
                <p className="text-sm">{decimalFormatter.format(totals.usageCold)} m³</p>
                <p className="font-semibold">{currencyFormatter.format(totals.costCold)}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Ciepła woda</p>
                <p className="text-sm">{decimalFormatter.format(totals.usageHot)} m³</p>
                <p className="font-semibold">{currencyFormatter.format(totals.costHot)}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Ogrzewanie</p>
                <p className="text-sm">{decimalFormatter.format(totals.usageHeating)} GJ</p>
                <p className="font-semibold">{currencyFormatter.format(totals.costHeating)}</p>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between border-t pt-3">
              <span className="font-medium text-muted-foreground">Koszt stały</span>
              <span className="font-semibold">{currencyFormatter.format(totals.fixedCost)}</span>
            </div>

            <div className="mt-2 flex items-center justify-between">
              <span className="text-lg font-semibold text-foreground">Suma całkowita</span>
              <span className="text-xl font-bold text-primary">{currencyFormatter.format(totals.amount)}</span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

