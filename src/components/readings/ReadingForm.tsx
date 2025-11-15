import {
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type JSX,
} from "react";

import { ErrorAlert } from "@/components/common/ErrorAlert";
import { ToastProvider, useToast } from "@/components/common/ToastProvider";
import { Button } from "@/components/ui/button";
import type { ApiError } from "@/lib/client/http";
import { apiGet, apiPatch, apiPost } from "@/lib/client/http";
import type { CreateReadingCmd, ReadingDTO, ReadingType, UpdateReadingCmd, YearMonth } from "@/types";
import type { ReadingListResponse, ReadingResponse } from "@/types/readings";
import {
  formatYearMonthLabel,
  getAllowedMonths,
  isoDateToYearMonth,
  isValidYearMonth,
  yearMonthToDate,
} from "@/lib/date/month";

// const TIME_ZONE = "Europe/Warsaw"; // Unused for now
const DECIMAL_PRECISION = 3;
const MS_IN_DAY = 86_400_000;

const decimalFormatter = new Intl.NumberFormat("pl-PL", {
  minimumFractionDigits: 0,
  maximumFractionDigits: DECIMAL_PRECISION,
});

// Formatter for reading dates if needed in future
// const readingDateFormatter = new Intl.DateTimeFormat("pl-PL", {
//   dateStyle: "medium",
//   timeStyle: "short",
//   timeZone: TIME_ZONE,
// });

type DecimalField = "coldM3" | "hotM3" | "heatingGj";
type FieldName = DecimalField | "readingAt" | "commentText" | "baseForMonth" | "finalForMonth" | "readingType";

interface FormState {
  readingAt: string;
  coldM3: string;
  hotM3: string;
  heatingGj: string;
  commentText: string;
  baseForMonth: string;
  finalForMonth: string;
  readingType: ReadingType;
}

interface WindowStatus {
  withinWindow: boolean;
  message: string | null;
}

interface ReadingFormProps {
  propertyId: string | null;
  /** Inject custom clock for tests */
  nowFactory?: () => Date;
}

type FieldErrors = Partial<Record<FieldName, string>>;

export function ReadingForm(props: ReadingFormProps): JSX.Element {
  const { propertyId, nowFactory } = props;
  const { pushToast } = useToast();

  const resolvedPropertyId = useMemo(() => propertyId ?? getPropertyIdFromLocation(), [propertyId]);
  const [formState, setFormState] = useState<FormState>(() => createEmptyForm(nowFactory?.() ?? new Date()));
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [loading, setLoading] = useState(false);
  const [currentReading, setCurrentReading] = useState<ReadingDTO | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [nowTick, setNowTick] = useState<number>(() => (nowFactory?.() ?? new Date()).getTime());

  const isDirtyRef = useRef(isDirty);
  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  const nowDate = useMemo(() => new Date(nowTick), [nowTick]);
  const windowStatus = useMemo(() => computeWindowStatus(formState.readingAt, nowDate), [formState.readingAt, nowDate]);
  const allowedMonths = useMemo(() => {
    const months = [...getAllowedMonths(6, nowDate)];
    const seen = new Set(months.map((month) => month.token));

    const include = (iso: string | null | undefined): void => {
      if (!iso) {
        return;
      }

      let token: YearMonth;
      try {
        token = isoDateToYearMonth(iso);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("[ReadingForm] Failed to normalize month token:", error);
        return;
      }

      if (seen.has(token)) {
        return;
      }

      months.push({
        token,
        label: formatYearMonthLabel(token),
        date: yearMonthToDate(token),
      });
      seen.add(token);
    };

    include(currentReading?.baseForMonth ?? null);
    include(currentReading?.finalForMonth ?? null);

    months.sort((a, b) => b.token.localeCompare(a.token));
    return months;
  }, [currentReading?.baseForMonth, currentReading?.finalForMonth, nowDate]);
  const readingTypeOptions = useMemo(
    () => [
      { value: "regular" as ReadingType, label: "Regularny" },
      { value: "overwrite" as ReadingType, label: "Nadpisujący (np. zmiana licznika)" },
    ],
    []
  );

  const fieldRefs = useRef<Record<FieldName, HTMLElement | null>>({
    coldM3: null,
    hotM3: null,
    heatingGj: null,
    readingAt: null,
    commentText: null,
    baseForMonth: null,
    finalForMonth: null,
    readingType: null,
  });

  const refocusOnErrors = useCallback((errors: FieldErrors) => {
    const order: FieldName[] = [
      "coldM3",
      "hotM3",
      "heatingGj",
      "readingAt",
      "baseForMonth",
      "finalForMonth",
      "readingType",
      "commentText",
    ];
    const firstInvalid = order.find((field) => Boolean(errors[field]));
    if (!firstInvalid) {
      return;
    }

    const target = fieldRefs.current[firstInvalid];
    window.requestAnimationFrame(() => {
      target?.focus({ preventScroll: false });
    });
  }, []);
  useEffect(() => {
    if (submitted) {
      refocusOnErrors(fieldErrors);
    }
  }, [fieldErrors, refocusOnErrors, submitted]);

  const loadLatest = useCallback(async () => {
    if (!resolvedPropertyId) {
      setCurrentReading(null);
      return;
    }

    setLoading(true);
    setServerError(null);
    setAccessError(null);
    try {
      const referenceDate = nowFactory?.() ?? new Date();
      const { from, to } = getUtcMonthRange(referenceDate);
      const query = new URLSearchParams({ propertyId: resolvedPropertyId, from, to });
      const response = await apiGet<ReadingListResponse>(`/api/v1/readings?${query.toString()}`);
      const items = response.items ?? [];

      const monthKey = buildMonthKey(referenceDate);
      const readingForMonth = items.find((item) => buildMonthKey(new Date(item.readingAt)) === monthKey);
      const latest = readingForMonth ?? items[0] ?? null;

      setCurrentReading(latest ?? null);

      if (!isDirtyRef.current) {
        if (latest) {
          setFormState({
            readingAt: latest.readingAt,
            coldM3: formatDecimal(latest.coldM3),
            hotM3: formatDecimal(latest.hotM3),
            heatingGj: formatDecimal(latest.heatingGj),
            commentText: latest.commentText ?? "",
            baseForMonth: latest.baseForMonth ? isoDateToYearMonth(latest.baseForMonth) : "",
            finalForMonth: latest.finalForMonth ? isoDateToYearMonth(latest.finalForMonth) : "",
            readingType: toFormReadingType(latest.readingType),
          });
        } else {
          setFormState(createEmptyForm(referenceDate));
        }
        setIsDirty(false);
      }
    } catch (error) {
      const apiError = toApiError(error);
      if (apiError.code === "forbidden") {
        setAccessError(apiError.message);
        return;
      }

      setServerError(apiError.message);
    } finally {
      setLoading(false);
    }
  }, [nowFactory, resolvedPropertyId]);

  const refetchTimer = useRef<number | null>(null);
  const scheduleRefetch = useCallback(() => {
    if (typeof window === "undefined" || pending || isDirtyRef.current) {
      return;
    }

    if (refetchTimer.current) {
      window.clearTimeout(refetchTimer.current);
    }

    refetchTimer.current = window.setTimeout(() => {
      loadLatest().catch(() => {
        /* no-op */
      });
    }, 350);
  }, [loadLatest, pending]);

  useEffect(() => {
    loadLatest().catch(() => {
      /* handled internally */
    });
  }, [loadLatest]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const onFocus = (): void => {
      setNowTick(Date.now());
      scheduleRefetch();
    };

    const onVisibilityChange = (): void => {
      if (document.visibilityState === "visible") {
        setNowTick(Date.now());
        scheduleRefetch();
      }
    };

    const interval = window.setInterval(() => {
      setNowTick(Date.now());
      scheduleRefetch();
    }, 60_000);

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.clearInterval(interval);
    };
  }, [scheduleRefetch]);

  useEffect(() => {
    return () => {
      if (refetchTimer.current) {
        window.clearTimeout(refetchTimer.current);
      }
    };
  }, []);

  const updateField = useCallback(<K extends keyof FormState>(field: K, value: FormState[K]) => {
    setFormState((prev) => {
      if (prev[field] === value) {
        return prev;
      }

      return { ...prev, [field]: value };
    });

    setIsDirty((prev) => (prev ? prev : true));
    setFieldErrors((prev) => {
      if (!prev[field as FieldName]) {
        return prev;
      }

      const { [field as FieldName]: removedValue, ...rest } = prev;
      void removedValue;
      return rest;
    });
  }, []);

  const clampFieldPrecision = useCallback((field: DecimalField) => {
    setFormState((prev) => {
      const value = prev[field];
      const clamped = clampDecimalInput(value);
      if (value === clamped) {
        return prev;
      }

      return { ...prev, [field]: clamped };
    });
  }, []);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setSubmitted(true);
      setServerError(null);
      setAccessError(null);

      if (!resolvedPropertyId) {
        setServerError("Brak przypisanej nieruchomości. Skontaktuj się z administratorem.");
        return;
      }

      const validationErrors: FieldErrors = {};

      const cold = parseDecimal(formState.coldM3);
      if (cold === null) {
        validationErrors.coldM3 = "Podaj prawidłowy odczyt zimnej wody.";
      }

      const hot = parseDecimal(formState.hotM3);
      if (hot === null) {
        validationErrors.hotM3 = "Podaj prawidłowy odczyt ciepłej wody.";
      }

      const heating = parseDecimal(formState.heatingGj);
      if (heating === null) {
        validationErrors.heatingGj = "Podaj prawidłowy odczyt ogrzewania.";
      }

      const readingIso = formState.readingAt;
      let readingDate: Date | null = null;
      if (!readingIso) {
        validationErrors.readingAt = "Wybierz datę i godzinę odczytu.";
      } else {
        const parsed = new Date(readingIso);
        if (Number.isNaN(parsed.getTime())) {
          validationErrors.readingAt = "Nieprawidłowa data odczytu.";
        } else {
          readingDate = parsed;
        }
      }

      if (!windowStatus.withinWindow) {
        validationErrors.readingAt = windowStatus.message ?? "Wybrana data jest poza dozwolonym oknem zgłoszenia.";
      }

      if (Object.keys(validationErrors).length > 0) {
        setFieldErrors(validationErrors);
        return;
      }

      if (cold === null || hot === null || heating === null || !readingDate) {
        return;
      }

      const payload: CreateReadingCmd = {
        propertyId: resolvedPropertyId,
        readingAt: readingDate.toISOString(),
        coldM3: cold,
        hotM3: hot,
        heatingGj: heating,
      };

      const trimmedComment = formState.commentText.trim();
      if (trimmedComment) {
        payload.commentText = trimmedComment;
      }

      const baseForMonthValue = formState.baseForMonth ? (formState.baseForMonth as YearMonth) : null;
      const finalForMonthValue = formState.finalForMonth ? (formState.finalForMonth as YearMonth) : null;

      payload.baseForMonth = baseForMonthValue;
      payload.finalForMonth = finalForMonthValue;
      (payload as CreateReadingCmd & { readingType?: ReadingType }).readingType = formState.readingType;

      const command: UpdateReadingCmd = { ...payload };

      if (currentReading) {
        const originalBase = currentReading.baseForMonth ? isoDateToYearMonth(currentReading.baseForMonth) : "";
        const originalFinal = currentReading.finalForMonth ? isoDateToYearMonth(currentReading.finalForMonth) : "";
        const originalType = toFormReadingType(currentReading.readingType);

        if (formState.baseForMonth === originalBase) {
          delete (command as { baseForMonth?: YearMonth | null }).baseForMonth;
        } else {
          command.baseForMonth = baseForMonthValue;
        }

        if (formState.finalForMonth === originalFinal) {
          delete (command as { finalForMonth?: YearMonth | null }).finalForMonth;
        } else {
          command.finalForMonth = finalForMonthValue;
        }

        if (originalType === formState.readingType) {
          delete (command as { readingType?: ReadingType }).readingType;
        } else {
          (command as { readingType?: ReadingType }).readingType = formState.readingType;
        }
      }

      setPending(true);
      try {
        let saved: ReadingDTO;
        if (currentReading) {
          const response = await apiPatch<ReadingResponse>(
            `/api/v1/readings/${encodeURIComponent(currentReading.id)}`,
            command
          );
          saved = response.reading;
          pushToast({
            variant: "success",
            title: "Zmieniono odczyt",
            description: "Aktualne wartości zostały zapisane.",
          });
        } else {
          const response = await apiPost<ReadingResponse>("/api/v1/readings", payload);
          saved = response.reading;
          pushToast({
            variant: "success",
            title: "Dodano odczyt",
            description: "Dziękujemy! Odczyt został zapisany.",
          });
        }

        setCurrentReading(saved);
        setFieldErrors({});
        setIsDirty(false);
        setSubmitted(false);
        setFormState({
          readingAt: saved.readingAt,
          coldM3: formatDecimal(saved.coldM3),
          hotM3: formatDecimal(saved.hotM3),
          heatingGj: formatDecimal(saved.heatingGj),
          commentText: saved.commentText ?? "",
          baseForMonth: saved.baseForMonth ? isoDateToYearMonth(saved.baseForMonth) : "",
          finalForMonth: saved.finalForMonth ? isoDateToYearMonth(saved.finalForMonth) : "",
          readingType: toFormReadingType(saved.readingType),
        });
        setNowTick(Date.now());
      } catch (error) {
        const apiError = toApiError(error);

        if (apiError.code === "conflict") {
          pushToast({
            variant: "error",
            title: "Nie zapisano odczytu",
            description: apiError.message,
          });
          setIsDirty(false);
          await loadLatest();
          return;
        }

        if (apiError.code === "forbidden") {
          setAccessError(apiError.message);
          return;
        }

        if (apiError.code === "validation_error") {
          const extracted = extractFieldErrors(apiError.details);
          if (Object.keys(extracted).length > 0) {
            setFieldErrors(extracted);
            return;
          }
        }

        pushToast({
          variant: "error",
          title: "Błąd zapisu odczytu",
          description: apiError.message,
        });
      } finally {
        setPending(false);
      }
    },
    [currentReading, formState, loadLatest, pushToast, resolvedPropertyId, windowStatus]
  );

  const handleMonthSelectChange = useCallback(
    (field: "baseForMonth" | "finalForMonth") => (event: ChangeEvent<HTMLSelectElement>) => {
      const { value } = event.target;
      if (value === "") {
        updateField(field, "");
        return;
      }

      if (isValidYearMonth(value)) {
        updateField(field, value);
      }
    },
    [updateField]
  );

  const handleReadingTypeChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      const { value } = event.target;
      if (value === "regular" || value === "overwrite") {
        updateField("readingType", value as ReadingType);
      }
    },
    [updateField]
  );

  const numericDisabled = pending || Boolean(accessError) || !resolvedPropertyId || !windowStatus.withinWindow;
  const readingAtDisabled = pending || Boolean(accessError) || !resolvedPropertyId;
  const submitDisabled = pending || !windowStatus.withinWindow || Boolean(accessError) || !resolvedPropertyId;
  const monthSelectDisabled = pending || Boolean(accessError) || !resolvedPropertyId;
  const readingTypeDisabled = pending || Boolean(accessError) || !resolvedPropertyId;

  return (
    <form className="space-y-6" noValidate onSubmit={handleSubmit}>
      {!resolvedPropertyId ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Brak przypisanej nieruchomości. Skontaktuj się z administratorem, aby uzyskać dostęp do formularza.
        </div>
      ) : null}

      <section className="rounded-lg border bg-card p-6 shadow-sm">
        <div className="space-y-6">
          <header className="space-y-1">
            <h2 className="text-lg font-semibold text-foreground">
              {currentReading ? "Zaktualizuj odczyt" : "Dodaj odczyt"}
            </h2>
            <p className="text-sm text-muted-foreground">
              Akceptujemy wartości z dokładnością do trzech miejsc po przecinku. Możesz używać kropki lub przecinka.
            </p>
          </header>

          {accessError ? <ErrorAlert error={accessError} /> : null}
          {serverError ? <ErrorAlert error={serverError} /> : null}

          {!windowStatus.withinWindow ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {windowStatus.message}
            </p>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-medium text-foreground" htmlFor="readingAt">
                Data i godzina odczytu
              </label>
              <input
                ref={(node) => {
                  fieldRefs.current.readingAt = node;
                }}
                aria-invalid={Boolean(fieldErrors.readingAt)}
                className={buildInputClasses(fieldErrors.readingAt)}
                disabled={readingAtDisabled}
                id="readingAt"
                name="readingAt"
                onBlur={(event) => {
                  updateField("readingAt", parseLocalInput(event.target.value));
                }}
                onChange={(event) => {
                  updateField("readingAt", parseLocalInput(event.target.value));
                }}
                required
                type="datetime-local"
                value={toLocalInput(formState.readingAt)}
              />
              {fieldErrors.readingAt ? (
                <p className="text-sm text-destructive">{fieldErrors.readingAt}</p>
              ) : windowStatus.withinWindow && windowStatus.message ? (
                <p className="text-sm text-muted-foreground">{windowStatus.message}</p>
              ) : null}
            </div>

            <DecimalInputField
              ref={(node) => {
                fieldRefs.current.coldM3 = node;
              }}
              disabled={numericDisabled}
              error={fieldErrors.coldM3}
              id="coldM3"
              label="Zimna woda (m³)"
              name="coldM3"
              onBlur={() => clampFieldPrecision("coldM3")}
              onChange={(value) => updateField("coldM3", value)}
              value={formState.coldM3}
            />
            <DecimalInputField
              ref={(node) => {
                fieldRefs.current.hotM3 = node;
              }}
              disabled={numericDisabled}
              error={fieldErrors.hotM3}
              id="hotM3"
              label="Ciepła woda (m³)"
              name="hotM3"
              onBlur={() => clampFieldPrecision("hotM3")}
              onChange={(value) => updateField("hotM3", value)}
              value={formState.hotM3}
            />
            <DecimalInputField
              ref={(node) => {
                fieldRefs.current.heatingGj = node;
              }}
              disabled={numericDisabled}
              error={fieldErrors.heatingGj}
              id="heatingGj"
              label="Ogrzewanie (GJ)"
              name="heatingGj"
              onBlur={() => clampFieldPrecision("heatingGj")}
              onChange={(value) => updateField("heatingGj", value)}
              value={formState.heatingGj}
            />

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="baseForMonth">
                Bazowy dla miesiąca (opcjonalnie)
              </label>
              <select
                ref={(node) => {
                  fieldRefs.current.baseForMonth = node;
                }}
                aria-invalid={Boolean(fieldErrors.baseForMonth)}
                className={buildInputClasses(fieldErrors.baseForMonth)}
                disabled={monthSelectDisabled}
                id="baseForMonth"
                name="baseForMonth"
                onChange={handleMonthSelectChange("baseForMonth")}
                value={formState.baseForMonth}
              >
                <option value="">Brak przypisania</option>
                {allowedMonths.map((month) => (
                  <option key={month.token} value={month.token}>
                    {month.label}
                  </option>
                ))}
              </select>
              {fieldErrors.baseForMonth ? (
                <p className="text-sm text-destructive">{fieldErrors.baseForMonth}</p>
              ) : (
                <p className="text-xs text-muted-foreground">Określa początek okresu rozliczeniowego.</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="finalForMonth">
                Finalny dla miesiąca (opcjonalnie)
              </label>
              <select
                ref={(node) => {
                  fieldRefs.current.finalForMonth = node;
                }}
                aria-invalid={Boolean(fieldErrors.finalForMonth)}
                className={buildInputClasses(fieldErrors.finalForMonth)}
                disabled={monthSelectDisabled}
                id="finalForMonth"
                name="finalForMonth"
                onChange={handleMonthSelectChange("finalForMonth")}
                value={formState.finalForMonth}
              >
                <option value="">Brak przypisania</option>
                {allowedMonths.map((month) => (
                  <option key={month.token} value={month.token}>
                    {month.label}
                  </option>
                ))}
              </select>
              {fieldErrors.finalForMonth ? (
                <p className="text-sm text-destructive">{fieldErrors.finalForMonth}</p>
              ) : (
                <p className="text-xs text-muted-foreground">Określa koniec okresu rozliczeniowego.</p>
              )}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-medium text-foreground" htmlFor="readingType">
                Typ odczytu
              </label>
              <select
                ref={(node) => {
                  fieldRefs.current.readingType = node;
                }}
                aria-invalid={Boolean(fieldErrors.readingType)}
                className={buildInputClasses(fieldErrors.readingType)}
                disabled={readingTypeDisabled}
                id="readingType"
                name="readingType"
                onChange={handleReadingTypeChange}
                value={formState.readingType}
              >
                {readingTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {fieldErrors.readingType ? (
                <p className="text-sm text-destructive">{fieldErrors.readingType}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Wybierz „Nadpisujący”, gdy odczyt zastępuje wcześniejsze wartości (np. wymiana licznika).
                </p>
              )}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <label className="text-sm font-medium text-foreground" htmlFor="commentText">
                Notatka (opcjonalnie)
              </label>
              <textarea
                ref={(node) => {
                  fieldRefs.current.commentText = node;
                }}
                className={buildTextareaClasses(fieldErrors.commentText)}
                disabled={pending || Boolean(accessError) || !resolvedPropertyId}
                id="commentText"
                maxLength={2000}
                name="commentText"
                onChange={(event) => updateField("commentText", event.target.value)}
                value={formState.commentText}
              />
              {fieldErrors.commentText ? (
                <p className="text-sm text-destructive">{fieldErrors.commentText}</p>
              ) : (
                <p className="text-xs text-muted-foreground">Wiadomość będzie widoczna dla administratora.</p>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <Button className="min-w-40" disabled={submitDisabled} type="submit">
              {pending ? "Zapisywanie..." : currentReading ? "Zapisz zmiany" : "Zapisz odczyt"}
            </Button>
          </div>
        </div>
      </section>
    </form>
  );
}

export function TenantReadingsView(props: ReadingFormProps): JSX.Element {
  return (
    <ToastProvider>
      <ReadingForm {...props} />
    </ToastProvider>
  );
}

interface DecimalInputFieldProps {
  id: string;
  name: string;
  label: string;
  value: string;
  disabled: boolean;
  error?: string;
  onChange: (value: string) => void;
  onBlur: () => void;
}

const DecimalInputField = forwardRef<HTMLInputElement, DecimalInputFieldProps>(
  ({ id, name, label, value, disabled, error, onChange, onBlur }, ref): JSX.Element => {
    return (
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground" htmlFor={id}>
          {label}
        </label>
        <input
          ref={ref}
          aria-invalid={Boolean(error)}
          autoComplete="off"
          className={buildInputClasses(error)}
          disabled={disabled}
          id={id}
          inputMode="decimal"
          min="0"
          name={name}
          onBlur={onBlur}
          onChange={(event) => onChange(event.target.value)}
          placeholder="0"
          step="0.001"
          value={value}
        />
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>
    );
  }
);
DecimalInputField.displayName = "DecimalInputField";

function buildInputClasses(error?: string): string {
  return [
    "w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
    error ? "border-destructive focus-visible:ring-destructive/40" : "border-input",
  ].join(" ");
}

function buildTextareaClasses(error?: string): string {
  return [
    "min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
    error ? "border-destructive focus-visible:ring-destructive/40" : "border-input",
  ].join(" ");
}

function createEmptyForm(now: Date): FormState {
  return {
    readingAt: now.toISOString(),
    coldM3: "",
    hotM3: "",
    heatingGj: "",
    commentText: "",
    baseForMonth: "",
    finalForMonth: "",
    readingType: "regular" as ReadingType,
  };
}

function computeWindowStatus(readingAtIso: string, now: Date): WindowStatus {
  if (!readingAtIso) {
    return {
      withinWindow: false,
      message: "Podaj datę odczytu, aby sprawdzić dostępność okna zgłoszenia.",
    };
  }

  const readingAt = new Date(readingAtIso);
  if (Number.isNaN(readingAt.getTime())) {
    return {
      withinWindow: false,
      message: "Nieprawidłowa data odczytu.",
    };
  }

  const diffDays = (readingAt.getTime() - now.getTime()) / MS_IN_DAY;

  if (diffDays < -3) {
    return {
      withinWindow: false,
      message: "Odczyt można zgłosić maksymalnie 3 dni wstecz.",
    };
  }

  if (diffDays > 5) {
    return {
      withinWindow: false,
      message: "Odczyt można zgłosić maksymalnie 5 dni naprzód.",
    };
  }

  return {
    withinWindow: true,
    message: "Okno zgłoszenia jest otwarte: 3 dni wstecz i 5 dni naprzód od wybranej daty.",
  };
}

function clampDecimalInput(value: string): string {
  const numeric = parseDecimal(value);
  if (numeric === null) {
    return value;
  }

  const factor = 10 ** DECIMAL_PRECISION;
  const clamped = Math.round(numeric * factor) / factor;
  return formatDecimal(clamped);
}

function parseDecimal(value: string): number | null {
  const normalized = value.replace(/\s+/g, "").replace(/,/g, ".").trim();
  if (normalized === "") {
    return null;
  }

  const numeric = Number(normalized);
  if (!Number.isFinite(numeric) || numeric < 0) {
    return null;
  }

  return numeric;
}

function formatDecimal(value: number): string {
  return decimalFormatter.format(value);
}

function toLocalInput(iso: string): string {
  if (!iso) {
    return "";
  }

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  const hours = `${date.getHours()}`.padStart(2, "0");
  const minutes = `${date.getMinutes()}`.padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function parseLocalInput(value: string): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString();
}

function getUtcMonthRange(date: Date): { from: string; to: string } {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0));
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 23, 59, 59, 999));
  return { from: start.toISOString(), to: end.toISOString() };
}

function buildMonthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${date.getUTCMonth()}`;
}

function extractFieldErrors(details: unknown): FieldErrors {
  if (!details || typeof details !== "object") {
    return {};
  }

  const record = details as Record<string, unknown>;
  const errors = record.errors;
  if (!errors || typeof errors !== "object") {
    return {};
  }

  const fieldErrors: FieldErrors = {};
  for (const [field, value] of Object.entries(errors as Record<string, unknown>)) {
    if (!value || typeof value !== "object") {
      continue;
    }

    const firstError = Array.isArray((value as { _errors?: string[] })._errors)
      ? (value as { _errors: string[] })._errors[0]
      : undefined;

    if (firstError) {
      fieldErrors[field as FieldName] = firstError;
    }
  }

  return fieldErrors;
}

function toApiError(error: unknown): ApiError & { details?: unknown } {
  if (error && typeof error === "object" && "code" in error && "message" in error) {
    return error as ApiError & { details?: unknown };
  }

  return {
    code: "unexpected_error",
    message: error instanceof Error ? error.message : "Wystąpił nieoczekiwany błąd.",
    details: error && typeof error === "object" && "details" in error ? (error as ApiError).details : undefined,
    status: error && typeof error === "object" && "status" in error ? (error as ApiError).status : undefined,
  };
}

function getPropertyIdFromLocation(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const url = new URL(window.location.href);
  return url.searchParams.get("propertyId");
}

// Helper function to check if reading is anchored (may be used in future)
// function isAnchoredReading(reading: ReadingDTO): boolean {
//   return Boolean(reading.effectiveMonth);
// }

function toFormReadingType(readingType: ReadingDTO["readingType"] | null | undefined): ReadingType {
  if (!readingType) {
    return "regular";
  }

  if (readingType === "baseline") {
    return "overwrite";
  }

  if (readingType === "overwrite") {
    return "overwrite";
  }

  return "regular";
}
