import { useCallback, useState, type FormEvent, type ReactElement } from "react";

import { ErrorAlert } from "@/components/common/ErrorAlert";
import { Button } from "@/components/ui/button";
import { apiPatch, type ApiError } from "@/lib/client/http";
import type { ReadingDTO, YearMonth } from "@/types";
import { isoDateToYearMonth } from "@/lib/date/month";

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
  const [baseForMonth, setBaseForMonth] = useState<string>(
    reading.baseForMonth ? isoDateToYearMonth(reading.baseForMonth) : ""
  );
  const [finalForMonth, setFinalForMonth] = useState<string>(
    reading.finalForMonth ? isoDateToYearMonth(reading.finalForMonth) : ""
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | string | null>(null);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (pending) {
        return;
      }

      setPending(true);
      setError(null);

      try {
        const payload: { baseForMonth?: YearMonth | null; finalForMonth?: YearMonth | null } = {};

        // Only include fields that changed
        const currentBase = reading.baseForMonth ? isoDateToYearMonth(reading.baseForMonth) : "";
        const currentFinal = reading.finalForMonth ? isoDateToYearMonth(reading.finalForMonth) : "";

        if (baseForMonth !== currentBase) {
          payload.baseForMonth = baseForMonth || null;
        }

        if (finalForMonth !== currentFinal) {
          payload.finalForMonth = finalForMonth || null;
        }

        if (Object.keys(payload).length === 0) {
          // No changes
          return;
        }

        const response = await apiPatch<{ reading: ReadingDTO }>(`/api/v1/readings/${reading.id}/months`, payload);

        onSuccess?.(response.reading);
      } catch (err) {
        const apiError = toApiError(err);
        setError(apiError);
      } finally {
        setPending(false);
      }
    },
    [baseForMonth, finalForMonth, onSuccess, pending, reading.baseForMonth, reading.finalForMonth, reading.id]
  );

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
              <input
                className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                id="base-for-month"
                type="month"
                value={baseForMonth}
                disabled={pending}
                onChange={(e) => setBaseForMonth(e.target.value)}
              />
              <Button type="button" variant="outline" size="sm" disabled={pending || !baseForMonth} onClick={handleClearBase}>
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
              <input
                className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                id="final-for-month"
                type="month"
                value={finalForMonth}
                disabled={pending}
                onChange={(e) => setFinalForMonth(e.target.value)}
              />
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

