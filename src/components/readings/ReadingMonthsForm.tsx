import { useCallback, useMemo, useState, type ChangeEvent, type FormEvent, type ReactElement } from "react";

import { ErrorAlert } from "@/components/common/ErrorAlert";
import { useToast } from "@/components/common/ToastProvider";
import { Button } from "@/components/ui/button";
import { apiGet, apiPatch, type ApiError } from "@/lib/client/http";
import type { ReadingDTO, YearMonth } from "@/types";
import {
  formatYearMonthLabel,
  getAllowedMonths,
  isoDateToYearMonth,
  isValidYearMonth,
  yearMonthToDate,
} from "@/lib/date/month";

interface ReadingMonthsFormProps {
  reading: ReadingDTO;
  onSuccess?: (updatedReading: ReadingDTO) => void;
}

function toApiError(error: unknown): ApiError {
  if (error && typeof error === "object" && "code" in error && "message" in error) {
    return error as ApiError;
  }

  return {
    code: "unexpected_error",
    message: error instanceof Error ? error.message : "Nie udało się zaktualizować miesięcy.",
  };
}

/**
 * Form for admin to assign baseForMonth and finalForMonth to a reading.
 */
export function ReadingMonthsForm({ reading, onSuccess }: ReadingMonthsFormProps): ReactElement {
  const { pushToast } = useToast();
  const initialBaseForMonth = reading.baseForMonth ? isoDateToYearMonth(reading.baseForMonth) : "";
  const initialFinalForMonth = reading.finalForMonth ? isoDateToYearMonth(reading.finalForMonth) : "";
  const [baseForMonth, setBaseForMonth] = useState<string>(initialBaseForMonth);
  const [finalForMonth, setFinalForMonth] = useState<string>(initialFinalForMonth);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | string | null>(null);
  const propertyId = reading.propertyId;
  const allowedMonths = useMemo(() => {
    const months = [...getAllowedMonths()];
    const seen = new Set(months.map((month) => month.token));

    const ensureIncluded = (value: string): void => {
      if (!isValidYearMonth(value) || seen.has(value)) {
        return;
      }

      months.push({
        token: value,
        label: formatYearMonthLabel(value),
        date: yearMonthToDate(value),
      });
      seen.add(value);
    };

    ensureIncluded(initialBaseForMonth);
    ensureIncluded(initialFinalForMonth);

    months.sort((a, b) => b.token.localeCompare(a.token));
    return months;
  }, [initialBaseForMonth, initialFinalForMonth]);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (pending) {
        return;
      }

      setPending(true);
      setError(null);

      try {
        const monthsToCheckBefore = new Set<string>();
        const payload: { baseForMonth?: YearMonth | null; finalForMonth?: YearMonth | null } = {};

        // Only include fields that changed
        const currentBase = reading.baseForMonth ? isoDateToYearMonth(reading.baseForMonth) : "";
        const currentFinal = reading.finalForMonth ? isoDateToYearMonth(reading.finalForMonth) : "";

        if (baseForMonth !== currentBase) {
          payload.baseForMonth = baseForMonth || null;
          if (payload.baseForMonth) {
            monthsToCheckBefore.add(payload.baseForMonth);
          }
        }

        if (finalForMonth !== currentFinal) {
          payload.finalForMonth = finalForMonth || null;
          if (payload.finalForMonth) {
            monthsToCheckBefore.add(payload.finalForMonth);
          }
        }

        if (Object.keys(payload).length === 0) {
          // No changes
          return;
        }

        const existedBefore = monthsToCheckBefore.size ? await fetchReportMonths(propertyId) : new Set<string>();

        const response = await apiPatch<{ reading: ReadingDTO }>(`/api/v1/readings/${reading.id}/months`, payload);

        if (monthsToCheckBefore.size > 0) {
          const targetMonths = extractMonths(response.reading).filter((month) => monthsToCheckBefore.has(month));
          if (targetMonths.length > 0) {
            await pollForReportCreation({
              propertyId,
              months: targetMonths,
              existedBefore,
              pushToast,
            });
          }
        }

        onSuccess?.(response.reading);
      } catch (err) {
        const apiError = toApiError(err);
        setError(apiError);
      } finally {
        setPending(false);
      }
    },
    [
      baseForMonth,
      finalForMonth,
      onSuccess,
      pending,
      propertyId,
      pushToast,
      reading.baseForMonth,
      reading.finalForMonth,
      reading.id,
    ]
  );

  const handleBaseChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    const { value } = event.target;
    if (value === "") {
      setBaseForMonth("");
      return;
    }

    if (isValidYearMonth(value)) {
      setBaseForMonth(value);
    }
  }, []);

  const handleFinalChange = useCallback((event: ChangeEvent<HTMLSelectElement>) => {
    const { value } = event.target;
    if (value === "") {
      setFinalForMonth("");
      return;
    }

    if (isValidYearMonth(value)) {
      setFinalForMonth(value);
    }
  }, []);

  const handleClearBase = useCallback(() => {
    setBaseForMonth("");
  }, []);

  const handleClearFinal = useCallback(() => {
    setFinalForMonth("");
  }, []);

  return (
    <section aria-label="Przypisanie miesięcy do odczytu" className="rounded-lg border bg-card p-6 shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-foreground">Przypisanie miesięcy</h3>
        <p className="text-sm text-muted-foreground">
          Określ dla jakich miesięcy ten odczyt jest bazowy (początek okresu) i finalny (koniec okresu).
        </p>
      </div>

      <form className="space-y-4" noValidate onSubmit={handleSubmit}>
        <ErrorAlert error={error} />

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="base-for-month">
              Bazowy dla miesiąca
            </label>
            <div className="flex gap-2">
              <select
                className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                id="base-for-month"
                value={baseForMonth}
                disabled={pending}
                onChange={handleBaseChange}
              >
                <option value="">Brak przypisania</option>
                {allowedMonths.map((month) => (
                  <option key={month.token} value={month.token}>
                    {month.label}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pending || !baseForMonth}
                onClick={handleClearBase}
              >
                Wyczyść
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Odczyt będzie użyty jako wartość początkowa dla wybranego miesiąca.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="final-for-month">
              Finalny dla miesiąca
            </label>
            <div className="flex gap-2">
              <select
                className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                id="final-for-month"
                value={finalForMonth}
                disabled={pending}
                onChange={handleFinalChange}
              >
                <option value="">Brak przypisania</option>
                {allowedMonths.map((month) => (
                  <option key={month.token} value={month.token}>
                    {month.label}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pending || !finalForMonth}
                onClick={handleClearFinal}
              >
                Wyczyść
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Odczyt będzie użyty jako wartość końcowa dla wybranego miesiąca.
            </p>
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={pending}>
            {pending ? "Zapisywanie…" : "Zapisz przypisania"}
          </Button>
        </div>
      </form>
    </section>
  );
}

interface ReportsListResponse {
  items: {
    report: {
      id: string;
      propertyId: string;
      month: string;
    };
  }[];
}

const REPORT_POLL_INTERVAL_MS = 500;
const REPORT_POLL_TIMEOUT_MS = 5000;

async function fetchReportMonths(propertyId: string): Promise<Set<string>> {
  const result = new Set<string>();

  if (!propertyId) {
    return result;
  }

  try {
    const response = await apiGet<ReportsListResponse>(`/api/v1/reports?propertyId=${encodeURIComponent(propertyId)}`);
    for (const item of response.items ?? []) {
      if (item.report.propertyId === propertyId && item.report.month) {
        result.add(item.report.month);
      }
    }
  } catch (error) {
    console.error("[ReadingMonthsForm] Failed to fetch reports before update:", error);
  }

  return result;
}

function extractMonths(reading: ReadingDTO): string[] {
  const months: string[] = [];
  if (reading.baseForMonth) {
    months.push(reading.baseForMonth.substring(0, 7));
  }
  if (reading.finalForMonth) {
    const month = reading.finalForMonth.substring(0, 7);
    if (!months.includes(month)) {
      months.push(month);
    }
  }
  return months;
}

async function pollForReportCreation({
  propertyId,
  months,
  existedBefore,
  pushToast,
}: {
  propertyId: string;
  months: string[];
  existedBefore: Set<string>;
  pushToast: ReturnType<typeof useToast>["pushToast"];
}): Promise<void> {
  const remaining = months.filter((month) => !existedBefore.has(month));
  if (remaining.length === 0) {
    return;
  }

  const deadline = Date.now() + REPORT_POLL_TIMEOUT_MS;
  const notified = new Set<string>();

  while (Date.now() < deadline && notified.size < remaining.length) {
    try {
      const response = await apiGet<ReportsListResponse>(
        `/api/v1/reports?propertyId=${encodeURIComponent(propertyId)}`
      );
      const existingMonths = new Set<string>(
        (response.items ?? []).filter((item) => item.report.propertyId === propertyId).map((item) => item.report.month)
      );

      for (const month of remaining) {
        if (!notified.has(month) && existingMonths.has(month)) {
          pushToast({
            variant: "success",
            title: "Utworzono raport",
            description: `Raport dla ${formatToastMonth(month)} został wygenerowany.`,
          });
          notified.add(month);
        }
      }

      if (notified.size === remaining.length) {
        break;
      }
    } catch (error) {
      console.error("[ReadingMonthsForm] Failed to poll reports:", error);
    }

    await delay(REPORT_POLL_INTERVAL_MS);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function formatToastMonth(month: string): string {
  const date = new Date(`${month}-01T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    return month;
  }

  return new Intl.DateTimeFormat("pl-PL", {
    month: "long",
    year: "numeric",
  }).format(date);
}
