import { memo, useCallback, useEffect, useMemo, useState } from "react";
import type { JSX } from "react";

import { ErrorAlert } from "@/components/common/ErrorAlert";
import { ToastProvider, useToast } from "@/components/common/ToastProvider";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { MessageSquare } from "lucide-react";
import { apiGet, type ApiError } from "@/lib/client/http";
import type { ReadingDTO } from "@/types";
import type { ReadingListResponse } from "@/types/readings";
import { formatYearMonthLabel, isoDateToYearMonth } from "@/lib/date/month";

const DECIMAL_FORMATTER = new Intl.NumberFormat("pl-PL", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 3,
});

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("pl-PL", {
  dateStyle: "medium",
  timeStyle: "short",
});

interface TenantReadingsHistoryProps {
  propertyId: string | null;
}

interface ReadingRowProps {
  reading: ReadingDTO;
}

function TenantReadingsHistoryTable({ propertyId }: TenantReadingsHistoryProps): JSX.Element {
  const { pushToast } = useToast();
  const [readings, setReadings] = useState<ReadingDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReadings = useCallback(async () => {
    if (!propertyId) {
      setReadings([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({ propertyId });
      const response = await apiGet<ReadingListResponse>(`/api/v1/readings?${params.toString()}`);
      setReadings(response.items ?? []);
    } catch (err) {
      const apiError = toApiError(err);
      setError(apiError.message);
      pushToast({
        variant: "error",
        title: "Nie udało się pobrać odczytów",
        description: apiError.message,
      });
    } finally {
      setLoading(false);
    }
  }, [propertyId, pushToast]);

  useEffect(() => {
    loadReadings().catch(() => {
      /* błąd obsłużony w loadReadings */
    });
  }, [loadReadings]);

  if (!propertyId) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
        Brak przypisanej nieruchomości. Skontaktuj się z administratorem, aby uzyskać dostęp do odczytów.
      </div>
    );
  }

  return (
    <section className="space-y-6">
      {error ? <ErrorAlert error={error} /> : null}

      <div className="rounded-lg border bg-card">
        {loading ? (
          <div className="p-6 text-sm text-muted-foreground">Ładowanie odczytów...</div>
        ) : readings.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">Brak odczytów dla tej nieruchomości.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-2">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-2 font-medium">Data i godzina</th>
                  <th className="px-4 py-2 font-medium">Zimna woda (m³)</th>
                  <th className="px-4 py-2 font-medium">Ciepła woda (m³)</th>
                  <th className="px-4 py-2 font-medium">Ogrzewanie (GJ)</th>
                  <th className="px-4 py-2 font-medium">Typ</th>
                  <th className="px-4 py-2 font-medium">Bazowy dla</th>
                  <th className="px-4 py-2 font-medium">Finalny dla</th>
                </tr>
              </thead>
              <tbody>
                {readings.map((reading) => (
                  <ReadingRow key={reading.id} reading={reading} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

const ReadingRow = memo(function ReadingRow({ reading }: ReadingRowProps): JSX.Element {
  const readingDate = useMemo(() => {
    const date = new Date(reading.readingAt);
    return Number.isNaN(date.getTime()) ? reading.readingAt : DATE_TIME_FORMATTER.format(date);
  }, [reading.readingAt]);

  const hasComment = Boolean(reading.commentText && reading.commentVisibleToTenant);

  return (
    <tr className="rounded-lg border border-border bg-background/60 text-sm shadow-sm">
      <td className="px-4 py-3 align-top">
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">{readingDate}</span>
          {hasComment ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="text-muted-foreground transition hover:text-foreground"
                  type="button"
                  aria-label="Pokaż komentarz"
                >
                  <MessageSquare className="size-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">{reading.commentText}</p>
              </TooltipContent>
            </Tooltip>
          ) : null}
        </div>
      </td>
      <td className="px-4 py-3 align-top text-foreground">{DECIMAL_FORMATTER.format(reading.coldM3)}</td>
      <td className="px-4 py-3 align-top text-foreground">{DECIMAL_FORMATTER.format(reading.hotM3)}</td>
      <td className="px-4 py-3 align-top text-foreground">{DECIMAL_FORMATTER.format(reading.heatingGj)}</td>
      <td className="px-4 py-3 align-top">
        <span
          className={[
            "inline-flex items-center rounded-full border px-2 py-1 text-xs font-medium",
            reading.readingType === "baseline"
              ? "border-amber-200 bg-amber-50 text-amber-900"
              : "border-slate-200 bg-slate-50 text-slate-700",
          ].join(" ")}
        >
          {formatReadingType(reading.readingType)}
        </span>
      </td>
      <td className="px-4 py-3 align-top text-muted-foreground">
        {reading.baseForMonth ? formatMonth(reading.baseForMonth) : "—"}
      </td>
      <td className="px-4 py-3 align-top text-muted-foreground">
        {reading.finalForMonth ? formatMonth(reading.finalForMonth) : "—"}
      </td>
    </tr>
  );
});

export function TenantReadingsHistory(props: TenantReadingsHistoryProps): JSX.Element {
  return (
    <ToastProvider>
      <TenantReadingsHistoryTable {...props} />
    </ToastProvider>
  );
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

function formatReadingType(type: string | null): string {
  switch (type) {
    case "baseline":
      return "Bazowy";
    case "regular":
      return "Regularny";
    case "overwrite":
      return "Nadpisujący";
    default:
      return type ?? "—";
  }
}

function formatMonth(isoDate: string): string {
  try {
    const yearMonth = isoDateToYearMonth(isoDate);
    return formatYearMonthLabel(yearMonth);
  } catch {
    return isoDate;
  }
}
