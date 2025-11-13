import { useCallback, useEffect, useState, type ReactElement } from "react";

import { ErrorAlert } from "@/components/common/ErrorAlert";
import { apiGet, type ApiError } from "@/lib/client/http";
import type { ReportItemDTO } from "@/types";

interface ReportItemsViewProps {
  reportId: string;
}

interface MonthlyAdvanceInfo {
  managerFeeRaw: number;
  // Prices (unit costs)
  priceColdRaw: number;
  priceHotHeatingRaw: number;
  priceHeatingRaw: number;
  // Forecasts (expected usage)
  forecastColdM3: number;
  forecastHotM3: number;
  forecastHeatingGj: number;
  // Advance allocations
  advanceColdRaw: number;
  advanceHotRaw: number;
  advanceHeatingRaw: number;
  advancePaymentRaw: number;
}

interface ReportItemsResponse {
  items: ReportItemDTO[];
  monthlyAdvance: MonthlyAdvanceInfo | null;
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
  const [monthlyAdvance, setMonthlyAdvance] = useState<MonthlyAdvanceInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | string | null>(null);

  const loadItems = useCallback(async () => {
    if (!reportId) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiGet<ReportItemsResponse>(`/api/v1/reports/${reportId}/items`);
      setItems(response.items ?? []);
      setMonthlyAdvance(response.monthlyAdvance ?? null);
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
    <section aria-label="Pozycje raportu" className="space-y-6">
      {monthlyAdvance ? (
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-foreground">Warunki miesięczne</h3>

          <div className="space-y-4">
            <div className="rounded-md border bg-muted/20 p-4">
              <h4 className="mb-3 font-medium text-foreground">Opłata administracyjna</h4>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Kwota opłaty administracyjnej</span>
                <span className="text-lg font-bold text-foreground">
                  {currencyFormatter.format(monthlyAdvance.managerFeeRaw)}
                </span>
              </div>
            </div>

            <div className="rounded-md border bg-muted/20 p-4">
              <h4 className="mb-3 font-medium text-foreground">Zaliczki na media</h4>
              <div className="space-y-4">
                {/* Zimna woda */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">Zimna woda</span>
                    <span className="text-sm font-semibold text-foreground">
                      {currencyFormatter.format(monthlyAdvance.advanceColdRaw)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Cena: {currencyFormatter.format(monthlyAdvance.priceColdRaw)}/m³</span>
                    <span>Prognoza: {decimalFormatter.format(monthlyAdvance.forecastColdM3)} m³</span>
                  </div>
                </div>

                {/* Ciepła woda - grupa z komponentami */}
                <div className="rounded-md border border-muted/40 bg-muted/10 p-3 space-y-3">
                  {/* Zimna woda w ciepłej wodzie */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Zimna woda (w c.w.)</span>
                      <span className="text-sm font-semibold text-muted-foreground">
                        {currencyFormatter.format(monthlyAdvance.forecastHotM3 * monthlyAdvance.priceColdRaw)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Cena: {currencyFormatter.format(monthlyAdvance.priceColdRaw)}/m³</span>
                      <span>Prognoza: {decimalFormatter.format(monthlyAdvance.forecastHotM3)} m³</span>
                    </div>
                  </div>

                  {/* Podgrzanie wody */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Podgrzanie wody</span>
                      <span className="text-sm font-semibold text-muted-foreground">
                        {currencyFormatter.format(monthlyAdvance.forecastHotM3 * monthlyAdvance.priceHotHeatingRaw)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Cena: {currencyFormatter.format(monthlyAdvance.priceHotHeatingRaw)}/m³</span>
                      <span>Prognoza: {decimalFormatter.format(monthlyAdvance.forecastHotM3)} m³</span>
                    </div>
                  </div>

                  {/* Suma: Ciepła woda */}
                  <div className="flex items-center justify-between border-t border-muted/40 pt-2">
                    <span className="text-sm font-medium text-foreground">Ciepła woda</span>
                    <span className="text-sm font-semibold text-foreground">
                      {currencyFormatter.format(
                        monthlyAdvance.forecastHotM3 * monthlyAdvance.priceColdRaw +
                          monthlyAdvance.forecastHotM3 * monthlyAdvance.priceHotHeatingRaw
                      )}
                    </span>
                  </div>
                </div>

                {/* Ogrzewanie */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">Ogrzewanie</span>
                    <span className="text-sm font-semibold text-foreground">
                      {currencyFormatter.format(monthlyAdvance.advanceHeatingRaw)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Cena: {currencyFormatter.format(monthlyAdvance.priceHeatingRaw)}/GJ</span>
                    <span>Prognoza: {decimalFormatter.format(monthlyAdvance.forecastHeatingGj)} GJ</span>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between border-t pt-3">
                  <span className="text-sm font-medium text-foreground">Łączna zaliczka</span>
                  <span className="text-base font-bold text-foreground">
                    {currencyFormatter.format(monthlyAdvance.advancePaymentRaw)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="rounded-lg border bg-card p-6 shadow-sm">
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
                  <p className="text-sm text-muted-foreground">Zużycie: {decimalFormatter.format(item.usageHotM3)} m³</p>
                  <p className="text-sm font-semibold text-foreground">{currencyFormatter.format(item.costHotRaw)}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-foreground">Ogrzewanie</p>
                  <p className="text-sm text-muted-foreground">
                    Zużycie: {decimalFormatter.format(item.usageHeatingGj)} GJ
                  </p>
                  <p className="text-sm font-semibold text-foreground">
                    {currencyFormatter.format(item.costHeatingRaw)}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between border-t pt-3">
                <span className="text-sm font-medium text-muted-foreground">Koszt stały</span>
                <span className="text-sm font-semibold text-foreground">
                  {currencyFormatter.format(item.fixedCostRaw)}
                </span>
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
      </div>
    </section>
  );
}
