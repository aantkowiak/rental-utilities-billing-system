import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

import { ErrorAlert } from "@/components/common/ErrorAlert";
import { Button } from "@/components/ui/button";
import { apiPost, type ApiError } from "@/lib/client/http";
import type { ReadingDTO } from "@/types";

interface ReplacementFormProps {
  source: ReadingDTO;
  onSuccess?: () => void;
  onClose?: () => void;
  onPendingChange?: (pending: boolean) => void;
}

interface ReplacementFormState {
  readingAt: string;
  effectiveMonth: string;
  coldM3: string;
  hotM3: string;
  heatingGj: string;
  commentText: string;
}

type ReplacementFormField = keyof ReplacementFormState;

const DATE_TIME_INPUT_FORMATTER = new Intl.DateTimeFormat("pl-PL", {
  dateStyle: "medium",
  timeStyle: "short",
});

const DECIMAL_FORMATTER = new Intl.NumberFormat("pl-PL", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 3,
});

function formatDecimalInput(value: number): string {
  return value.toString().replace(".", ",");
}

function parsePolishDecimal(value: string): number {
  return Number.parseFloat(value.replace(",", "."));
}

function toLocalDateTimeInput(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const pad = (value: number): string => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
    date.getMinutes()
  )}`;
}

function fromLocalDateTimeInput(input: string): string | null {
  if (!input) {
    return null;
  }
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
}

function buildInitialState(source: ReadingDTO): ReplacementFormState {
  const readingDate = new Date(source.readingAt);
  const effectiveDate = new Date(Date.UTC(readingDate.getUTCFullYear(), readingDate.getUTCMonth(), 1));
  const effectiveMonth = effectiveDate.toISOString().slice(0, 10);

  return {
    readingAt: toLocalDateTimeInput(source.readingAt),
    effectiveMonth,
    coldM3: formatDecimalInput(source.coldM3),
    hotM3: formatDecimalInput(source.hotM3),
    heatingGj: formatDecimalInput(source.heatingGj),
    commentText: "",
  };
}

function toApiError(error: unknown): ApiError {
  if (error && typeof error === "object" && "code" in error && "message" in error) {
    return error as ApiError;
  }

  return {
    code: "unexpected_error",
    message: error instanceof Error ? error.message : "Nie udało się zapisać odczytu zastępczego.",
  };
}

export function ReplacementForm({ source, onClose, onSuccess, onPendingChange }: ReplacementFormProps): JSX.Element {
  const [formState, setFormState] = useState<ReplacementFormState>(() => buildInitialState(source));
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<ApiError | string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<ReplacementFormField, string>>>({});

  useEffect(() => {
    onPendingChange?.(pending);
  }, [onPendingChange, pending]);

  const handleChange = useCallback((field: ReplacementFormField, value: string) => {
    setFormState((prev) => ({
      ...prev,
      [field]: value,
    }));
    setFieldErrors((prev) => ({
      ...prev,
      [field]: undefined,
    }));
  }, []);

  const reset = useCallback(() => {
    setFormState(buildInitialState(source));
    setFieldErrors({});
    setFormError(null);
    setStatusMessage(null);
  }, [source]);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (pending) {
        return;
      }

      const nextFieldErrors: Partial<Record<ReplacementFormField, string>> = {};

      const readingAtIso = fromLocalDateTimeInput(formState.readingAt);
      if (!readingAtIso) {
        nextFieldErrors.readingAt = "Wprowadź poprawną datę i godzinę.";
      }

      if (!formState.effectiveMonth || !/^\d{4}-\d{2}-\d{2}$/.test(formState.effectiveMonth)) {
        nextFieldErrors.effectiveMonth = "Wprowadź prawidłowy dzień obowiązywania (RRRR-MM-DD).";
      }

      const cold = parsePolishDecimal(formState.coldM3);
      const hot = parsePolishDecimal(formState.hotM3);
      const heating = parsePolishDecimal(formState.heatingGj);

      if (!Number.isFinite(cold)) {
        nextFieldErrors.coldM3 = "Podaj liczbę dla zużycia zimnej wody.";
      }
      if (!Number.isFinite(hot)) {
        nextFieldErrors.hotM3 = "Podaj liczbę dla zużycia ciepłej wody.";
      }
      if (!Number.isFinite(heating)) {
        nextFieldErrors.heatingGj = "Podaj liczbę dla energii cieplnej.";
      }

      if (Object.keys(nextFieldErrors).length > 0) {
        setFieldErrors(nextFieldErrors);
        return;
      }

      setPending(true);
      setFormError(null);
      setStatusMessage(null);

      try {
        await apiPost(`/api/v1/readings/${encodeURIComponent(source.id)}/replacement`, {
          propertyId: source.propertyId,
          readingAt: readingAtIso,
          effectiveMonth: formState.effectiveMonth,
          coldM3: cold,
          hotM3: hot,
          heatingGj: heating,
          commentText: formState.commentText.trim() || null,
          commentVisibleToTenant: false,
        });

        await apiPost("/api/v1/readings/recalculate-anchors", {
          propertyId: source.propertyId,
          fromMonth: formState.effectiveMonth,
          toMonth: formState.effectiveMonth,
        });

        setStatusMessage("Rekalkulacja kotwic została zaplanowana dla wybranego miesiąca.");
        onSuccess?.();
        reset();
      } catch (error) {
        const apiError = toApiError(error);
        setFormError(apiError);
      } finally {
        setPending(false);
      }
    },
    [formState, onSuccess, pending, reset, source.id, source.propertyId]
  );

  const formattedSourceDate = useMemo(
    () => DATE_TIME_INPUT_FORMATTER.format(new Date(source.readingAt)),
    [source.readingAt]
  );
  const formattedSourceValues = useMemo(
    () =>
      `${DECIMAL_FORMATTER.format(source.coldM3)} / ${DECIMAL_FORMATTER.format(source.hotM3)} / ${DECIMAL_FORMATTER.format(
        source.heatingGj
      )}`,
    [source.coldM3, source.heatingGj, source.hotM3]
  );

  return (
    <form className="space-y-4" noValidate onSubmit={handleSubmit}>
      <ErrorAlert error={formError} />
      {statusMessage ? (
        <div
          className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
          role="status"
        >
          {statusMessage}
        </div>
      ) : null}

      <div className="rounded-md border border-dashed border-muted-foreground/30 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">Oryginalny odczyt</p>
        <p>{formattedSourceDate}</p>
        <p>
          Zużycie: {formattedSourceValues} • Nieruchomość: {source.propertyId}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground" htmlFor="replacement-reading-at">
            Nowa data odczytu
          </label>
          <input
            className={buildInputClasses(fieldErrors.readingAt)}
            id="replacement-reading-at"
            type="datetime-local"
            value={formState.readingAt}
            onChange={(event) => handleChange("readingAt", event.target.value)}
            required
            disabled={pending}
          />
          {fieldErrors.readingAt ? <p className="text-sm text-destructive">{fieldErrors.readingAt}</p> : null}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground" htmlFor="replacement-effective-month">
            Dzień obowiązywania
          </label>
          <input
            className={buildInputClasses(fieldErrors.effectiveMonth)}
            id="replacement-effective-month"
            type="date"
            value={formState.effectiveMonth}
            onChange={(event) => handleChange("effectiveMonth", event.target.value)}
            required
            disabled={pending}
          />
          {fieldErrors.effectiveMonth ? <p className="text-sm text-destructive">{fieldErrors.effectiveMonth}</p> : null}
          <p className="text-xs text-muted-foreground">
            Kotwice zostaną wyliczone dla miesiąca zawierającego wskazany dzień.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground" htmlFor="replacement-cold">
            Zimna woda (m³)
          </label>
          <input
            className={buildInputClasses(fieldErrors.coldM3)}
            id="replacement-cold"
            inputMode="decimal"
            placeholder="0.000"
            value={formState.coldM3}
            onChange={(event) => handleChange("coldM3", event.target.value)}
            required
            disabled={pending}
          />
          {fieldErrors.coldM3 ? <p className="text-sm text-destructive">{fieldErrors.coldM3}</p> : null}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground" htmlFor="replacement-hot">
            Ciepła woda (m³)
          </label>
          <input
            className={buildInputClasses(fieldErrors.hotM3)}
            id="replacement-hot"
            inputMode="decimal"
            placeholder="0.000"
            value={formState.hotM3}
            onChange={(event) => handleChange("hotM3", event.target.value)}
            required
            disabled={pending}
          />
          {fieldErrors.hotM3 ? <p className="text-sm text-destructive">{fieldErrors.hotM3}</p> : null}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground" htmlFor="replacement-heating">
            Energia cieplna (GJ)
          </label>
          <input
            className={buildInputClasses(fieldErrors.heatingGj)}
            id="replacement-heating"
            inputMode="decimal"
            placeholder="0.000"
            value={formState.heatingGj}
            onChange={(event) => handleChange("heatingGj", event.target.value)}
            required
            disabled={pending}
          />
          {fieldErrors.heatingGj ? <p className="text-sm text-destructive">{fieldErrors.heatingGj}</p> : null}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground" htmlFor="replacement-comment">
          Notatka (opcjonalnie)
        </label>
        <textarea
          className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
          id="replacement-comment"
          maxLength={2000}
          value={formState.commentText}
          onChange={(event) => handleChange("commentText", event.target.value)}
          disabled={pending}
        />
        <p className="text-xs text-muted-foreground">Notatka pozostaje wewnętrzna.</p>
      </div>

      <div className="flex items-center justify-end gap-3">
        {onClose ? (
          <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
            Zamknij
          </Button>
        ) : null}
        <Button type="submit" disabled={pending}>
          {pending ? "Zapisywanie…" : "Zapisz odczyt zastępczy"}
        </Button>
      </div>
    </form>
  );
}

function buildInputClasses(error?: string): string {
  return [
    "w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
    error ? "border-destructive focus-visible:ring-destructive/40" : "border-input",
  ].join(" ");
}
