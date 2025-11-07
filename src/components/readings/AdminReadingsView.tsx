import { Fragment, useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";

import { ErrorAlert } from "@/components/common/ErrorAlert";
import { ToastProvider, useToast } from "@/components/common/ToastProvider";
import { Button } from "@/components/ui/button";
import { AnchorRecalcPanel } from "@/components/tasks/AnchorRecalcPanel";
import { ReplacementForm } from "@/components/readings/ReplacementForm";
import { apiDelete, apiGet, apiPatch, apiPost, type ApiError } from "@/lib/client/http";
import type { CreateReadingCmd, ReadingDTO, UpdateReadingCmd } from "@/types";
import type { ReadingListResponse, ReadingResponse } from "@/types/readings";

const PROPERTY_STORAGE_KEY = "admin-readings:propertyId";
const MONTH_STORAGE_KEY = "admin-readings:month";

interface FiltersState {
  propertyId: string;
  month: string;
}

interface FormState {
  readingAt: string;
  coldM3: string;
  hotM3: string;
  heatingGj: string;
  commentText: string;
}

type FormField = keyof FormState;

const DECIMAL_FORMATTER = new Intl.NumberFormat("pl-PL", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 3,
});

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("pl-PL", {
  dateStyle: "medium",
  timeStyle: "short",
});

const DATE_FORMATTER = new Intl.DateTimeFormat("pl-PL", {
  dateStyle: "medium",
});

function resolveInitialFilters(): FiltersState {
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, "0")}`;

  if (typeof window === "undefined") {
    return {
      propertyId: "",
      month: currentMonth,
    };
  }

  const params = new URLSearchParams(window.location.search);
  const paramProperty = params.get("propertyId") ?? "";
  const paramMonth = params.get("month") ?? "";

  const storedProperty = window.localStorage.getItem(PROPERTY_STORAGE_KEY) ?? "";
  const storedMonth = window.localStorage.getItem(MONTH_STORAGE_KEY);

  return {
    propertyId: paramProperty || storedProperty,
    month: normalizeMonth(paramMonth || storedMonth, currentMonth),
  };
}

function buildDefaultFormState(): FormState {
  const now = new Date();
  return {
    readingAt: toLocalDateTimeInput(now.toISOString()),
    coldM3: "",
    hotM3: "",
    heatingGj: "",
    commentText: "",
  };
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

function fromLocalDateTimeInput(value: string): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function computeMonthRange(month: string): { from: string; to: string } | null {
  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return null;
  }

  const [yearRaw, monthRaw] = month.split("-");
  const year = Number(yearRaw);
  const monthIndex = Number(monthRaw) - 1;

  if (Number.isNaN(year) || Number.isNaN(monthIndex)) {
    return null;
  }

  const from = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0));
  const to = new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59, 999));
  return {
    from: from.toISOString(),
    to: to.toISOString(),
  };
}

function normalizeMonth(value: string | null | undefined, fallback: string): string {
  if (value && /^\d{4}-\d{2}$/.test(value)) {
    return value;
  }
  return fallback;
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

function extractFieldErrors(details: unknown): Partial<Record<FormField, string>> {
  if (!details || typeof details !== "object") {
    return {};
  }

  const result: Partial<Record<FormField, string>> = {};
  for (const [key, value] of Object.entries(details)) {
    if (["readingAt", "coldM3", "hotM3", "heatingGj", "commentText"].includes(key) && typeof value === "string") {
      result[key as FormField] = value;
    }
  }
  return result;
}

function findFirstFieldWithError(errors: Partial<Record<FormField, string>>): FormField | null {
  const fields: FormField[] = ["readingAt", "coldM3", "hotM3", "heatingGj", "commentText"];
  return fields.find((field) => Boolean(errors[field])) ?? null;
}

function formatNumber(value: number | null | undefined): string {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "—";
  }
  return DECIMAL_FORMATTER.format(value);
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return DATE_TIME_FORMATTER.format(date);
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return DATE_FORMATTER.format(date);
}

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, "0")}`;
}

function AdminReadingsContent(): JSX.Element {
  const { pushToast } = useToast();

  const [filters, setFilters] = useState<FiltersState>(() => resolveInitialFilters());
  const [items, setItems] = useState<ReadingDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [formPending, setFormPending] = useState(false);
  const [formPendingTargetId, setFormPendingTargetId] = useState<string | null>(null);
  const [deletePendingById, setDeletePendingById] = useState<Record<string, boolean>>({});
  const [replacementPendingById, setReplacementPendingById] = useState<Record<string, boolean>>({});
  const [recalcPending, setRecalcPending] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [actionAccessError, setActionAccessError] = useState<string | null>(null);
  const [formError, setFormError] = useState<ApiError | string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FormField, string>>>({});
  const [formState, setFormState] = useState<FormState>(() => buildDefaultFormState());
  const [editing, setEditing] = useState<ReadingDTO | null>(null);
  const [replacementSource, setReplacementSource] = useState<ReadingDTO | null>(null);

  const monthRange = useMemo(() => computeMonthRange(filters.month), [filters.month]);

  const clearReplacementPending = useCallback((id: string) => {
    setReplacementPendingById((prev) => {
      if (!prev[id]) {
        return prev;
      }
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const url = new URL(window.location.href);
    if (filters.propertyId) {
      url.searchParams.set("propertyId", filters.propertyId);
    } else {
      url.searchParams.delete("propertyId");
    }

    if (filters.month) {
      url.searchParams.set("month", filters.month);
    } else {
      url.searchParams.delete("month");
    }

    window.history.replaceState(null, "", url.toString());
  }, [filters.propertyId, filters.month]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(PROPERTY_STORAGE_KEY, filters.propertyId);
    window.localStorage.setItem(MONTH_STORAGE_KEY, normalizeMonth(filters.month, getCurrentMonth()));
  }, [filters.propertyId, filters.month]);

  const loadReadings = useCallback(async () => {
    if (!filters.propertyId) {
      setItems([]);
      setFetchError(null);
      setAccessError(null);
      setActionAccessError(null);
      return;
    }

    setLoading(true);
    setFetchError(null);
    setAccessError(null);
    setActionAccessError(null);

    try {
      const search = new URLSearchParams();
      search.set("propertyId", filters.propertyId);
      if (monthRange) {
        search.set("from", monthRange.from);
        search.set("to", monthRange.to);
      }

      const response = await apiGet<ReadingListResponse>(`/api/v1/readings?${search.toString()}`);
      setItems(Array.isArray(response.items) ? response.items : []);
    } catch (error) {
      const apiError = toApiError(error);

      if (apiError.code === "forbidden") {
        setAccessError(apiError.message);
        setItems([]);
        return;
      }

      setFetchError(apiError.message);
      pushToast({
        variant: "error",
        title: "Nie udało się pobrać odczytów",
        description: apiError.message,
      });
    } finally {
      setLoading(false);
    }
  }, [filters.propertyId, monthRange, pushToast]);

  useEffect(() => {
    loadReadings().catch(() => {
      // handled in loadReadings
    });
  }, [loadReadings]);

  const resetForm = useCallback(() => {
    setFormState(buildDefaultFormState());
    setFieldErrors({});
    setFormError(null);
    setEditing(null);
  }, []);

  const handleFiltersPropertyChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value.trim();
    setFilters((prev) => ({
      ...prev,
      propertyId: value,
    }));
  }, []);

  const handleFiltersMonthChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setFilters((prev) => ({
      ...prev,
      month: normalizeMonth(value, getCurrentMonth()),
    }));
  }, []);

  const handleFormChange = useCallback((field: FormField, value: string) => {
    setFormState((prev) => ({
      ...prev,
      [field]: value,
    }));
    setFieldErrors((prev) => ({
      ...prev,
      [field]: undefined,
    }));
  }, []);

  const focusFieldRef = useCallback((field: FormField) => {
    const element = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[data-admin-reading-field="${field}"]`);
    element?.focus();
  }, []);

  const handleEdit = useCallback(
    (reading: ReadingDTO) => {
      setEditing(reading);
      setFormState({
        readingAt: toLocalDateTimeInput(reading.readingAt),
        coldM3: reading.coldM3.toString(),
        hotM3: reading.hotM3.toString(),
        heatingGj: reading.heatingGj.toString(),
        commentText: reading.commentText ?? "",
      });
      setFieldErrors({});
      setFormError(null);
      setActionAccessError(null);
    },
    []
  );

  const handleDelete = useCallback(
    async (reading: ReadingDTO) => {
      if (deletePendingById[reading.id]) {
        return;
      }

      const confirmed = window.confirm("Czy na pewno chcesz usunąć ten odczyt?");
      if (!confirmed) {
        return;
      }

      setDeletePendingById((prev) => ({ ...prev, [reading.id]: true }));
      setActionAccessError(null);

      try {
        await apiDelete(`/api/v1/readings/${encodeURIComponent(reading.id)}`);
        pushToast({
          variant: "success",
          title: "Usunięto odczyt",
          description: "Rekord został pomyślnie usunięty.",
        });
        await loadReadings();
        if (editing?.id === reading.id) {
          resetForm();
        }
      } catch (error) {
        const apiError = toApiError(error);

        if (apiError.code === "forbidden" || apiError.status === 403) {
          setActionAccessError(apiError.message);
        } else {
          const isNotFound = apiError.code === "not_found" || apiError.status === 404;
          pushToast({
            variant: isNotFound ? "info" : "error",
            title: isNotFound ? "Odczyt już nie istnieje" : "Nie udało się usunąć odczytu",
            description: apiError.message,
          });

          if (isNotFound || apiError.code === "conflict" || apiError.status === 409) {
            await loadReadings();
          }
        }
      } finally {
        setDeletePendingById((prev) => {
          const next = { ...prev };
          delete next[reading.id];
          return next;
        });
      }
    },
    [deletePendingById, editing?.id, loadReadings, pushToast, resetForm]
  );

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (formPending) {
        return;
      }

      const trimmedComment = formState.commentText.trim();
      const readingAtIso = fromLocalDateTimeInput(formState.readingAt);
      const cold = Number.parseFloat(formState.coldM3);
      const hot = Number.parseFloat(formState.hotM3);
      const heating = Number.parseFloat(formState.heatingGj);

      const nextFieldErrors: Partial<Record<FormField, string>> = {};

      if (!filters.propertyId) {
        nextFieldErrors.coldM3 = "Wybierz identyfikator nieruchomości w filtrach.";
      }

      if (!formState.readingAt || !readingAtIso) {
        nextFieldErrors.readingAt = "Podaj prawidłową datę i godzinę.";
      }

      if (!Number.isFinite(cold)) {
        nextFieldErrors.coldM3 = "Wprowadź poprawną wartość zużycia zimnej wody.";
      }

      if (!Number.isFinite(hot)) {
        nextFieldErrors.hotM3 = "Wprowadź poprawną wartość zużycia ciepłej wody.";
      }

      if (!Number.isFinite(heating)) {
        nextFieldErrors.heatingGj = "Wprowadź poprawną wartość energii cieplnej.";
      }

      if (Object.keys(nextFieldErrors).length > 0) {
        setFieldErrors(nextFieldErrors);
        const fieldToFocus = findFirstFieldWithError(nextFieldErrors);
        if (fieldToFocus) {
          focusFieldRef(fieldToFocus);
        }
        return;
      }

      const basePayload: CreateReadingCmd = {
        propertyId: filters.propertyId,
        readingAt: readingAtIso!,
        coldM3: cold,
        hotM3: hot,
        heatingGj: heating,
      };

      if (trimmedComment) {
        basePayload.commentText = trimmedComment;
        basePayload.commentVisibleToTenant = false;
      }

      setFormPending(true);
      setFormPendingTargetId(editing ? editing.id : null);
      setFormError(null);
      setFieldErrors({});
      setActionAccessError(null);

      try {
        let response: ReadingResponse;

        if (editing) {
          const updatePayload: UpdateReadingCmd = {
            ...basePayload,
          };
          response = await apiPatch<ReadingResponse>(
            `/api/v1/readings/${encodeURIComponent(editing.id)}`,
            updatePayload
          );
          pushToast({
            variant: "success",
            title: "Zaktualizowano odczyt",
            description: "Zmiany zostały zapisane.",
          });
        } else {
          response = await apiPost<ReadingResponse>("/api/v1/readings", basePayload);
          pushToast({
            variant: "success",
            title: "Dodano odczyt",
            description: "Nowy odczyt został zapisany.",
          });
        }

        await loadReadings();
        setEditing(null);
        setFormState({
          ...buildDefaultFormState(),
          coldM3: response.reading.coldM3.toString(),
          hotM3: response.reading.hotM3.toString(),
          heatingGj: response.reading.heatingGj.toString(),
          commentText: response.reading.commentText ?? "",
        });
      } catch (error) {
        const apiError = toApiError(error);

        if (apiError.code === "validation_error") {
          const extracted = extractFieldErrors((apiError as ApiError).details);
          if (Object.keys(extracted).length > 0) {
            setFieldErrors(extracted);
            const fieldToFocus = findFirstFieldWithError(extracted);
            if (fieldToFocus) {
              focusFieldRef(fieldToFocus);
            }
            return;
          }
        }

        if (apiError.code === "forbidden" || apiError.status === 403) {
          setActionAccessError(apiError.message);
        } else {
          if (apiError.code === "conflict" || apiError.status === 409) {
            pushToast({
              variant: "info",
              title: "Dane zostały zmienione",
              description: apiError.message,
            });
            await loadReadings();
          } else if (!apiError.status || apiError.status >= 500) {
            pushToast({
              variant: "error",
              title: "Nie udało się zapisać odczytu",
              description: apiError.message,
            });
          }
          setFormError(apiError);
        }
      } finally {
        setFormPending(false);
        setFormPendingTargetId(null);
      }
    },
    [
      editing,
      filters.propertyId,
      focusFieldRef,
      formPending,
      formState,
      loadReadings,
      pushToast,
    ]
  );

  const handleCancelEdit = useCallback(() => {
    resetForm();
  }, [resetForm]);

  const closeReplacementModal = useCallback(() => {
    if (replacementSource) {
      clearReplacementPending(replacementSource.id);
    }
    setReplacementSource(null);
    setActionAccessError(null);
  }, [clearReplacementPending, replacementSource]);

  const handleReplacementSuccess = useCallback(async () => {
    pushToast({
      variant: "success",
      title: "Dodano odczyt zastępczy",
      description: "Rekalkulacja kotwic została zaplanowana.",
    });
    closeReplacementModal();
    await loadReadings();
  }, [closeReplacementModal, loadReadings, pushToast]);

  const replacementModalPending = replacementSource ? Boolean(replacementPendingById[replacementSource.id]) : false;

  return (
    <section aria-busy={recalcPending} className="space-y-8">
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground">Filtry</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="admin-readings-property">
              Identyfikator nieruchomości
            </label>
            <input
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
              id="admin-readings-property"
              inputMode="text"
              placeholder="UUID nieruchomości"
              value={filters.propertyId}
              onChange={handleFiltersPropertyChange}
            />
            <p className="text-xs text-muted-foreground">Wymagany do pobrania odczytów oraz zapisów.</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="admin-readings-month">
              Miesiąc rozliczeniowy
            </label>
            <input
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
              id="admin-readings-month"
              type="month"
              value={filters.month}
              onChange={handleFiltersMonthChange}
            />
            <p className="text-xs text-muted-foreground">Zapisywane w adresie URL i w pamięci przeglądarki.</p>
          </div>
        </div>
      </div>

      {accessError ? <ErrorAlert error={accessError} /> : null}
      {fetchError ? <ErrorAlert error={fetchError} /> : null}
      {actionAccessError ? <ErrorAlert error={actionAccessError} /> : null}

      <div className="grid gap-8 lg:grid-cols-[2fr_3fr]">
        <section className="space-y-4 rounded-lg border bg-card p-6 shadow-sm">
          <header className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {editing ? "Edytuj odczyt" : "Dodaj odczyt"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {editing
                  ? "Aktualizujesz istniejący odczyt. Zmiany zostaną zapisane po zatwierdzeniu."
                  : "Uzupełnij wartości dla wskazanej nieruchomości i miesiąca."}
              </p>
            </div>
            {editing ? (
              <Button variant="secondary" type="button" onClick={handleCancelEdit}>
                Anuluj edycję
              </Button>
            ) : null}
          </header>

          <form className="space-y-4" noValidate onSubmit={handleSubmit}>
            <ErrorAlert error={formError} />

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="admin-reading-at">
                Data i godzina odczytu
              </label>
              <input
                className={buildInputClasses(fieldErrors.readingAt)}
                data-admin-reading-field="readingAt"
                disabled={formPending || !filters.propertyId || recalcPending}
                id="admin-reading-at"
                type="datetime-local"
                value={formState.readingAt}
                onChange={(event) => handleFormChange("readingAt", event.target.value)}
                required
              />
              {fieldErrors.readingAt ? (
                <p className="text-sm text-destructive">{fieldErrors.readingAt}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Daty przechowywane są w strefie UTC. Formularz przelicza je względem lokalnej strefy czasowej.
                </p>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="admin-reading-cold">
                  Zimna woda (m³)
                </label>
                <input
                  className={buildInputClasses(fieldErrors.coldM3)}
                  data-admin-reading-field="coldM3"
                  disabled={formPending || !filters.propertyId || recalcPending}
                  id="admin-reading-cold"
                  inputMode="decimal"
                  value={formState.coldM3}
                  onChange={(event) => handleFormChange("coldM3", event.target.value)}
                  placeholder="0.000"
                  required
                />
                {fieldErrors.coldM3 ? <p className="text-sm text-destructive">{fieldErrors.coldM3}</p> : null}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="admin-reading-hot">
                  Ciepła woda (m³)
                </label>
                <input
                  className={buildInputClasses(fieldErrors.hotM3)}
                  data-admin-reading-field="hotM3"
                  disabled={formPending || !filters.propertyId || recalcPending}
                  id="admin-reading-hot"
                  inputMode="decimal"
                  value={formState.hotM3}
                  onChange={(event) => handleFormChange("hotM3", event.target.value)}
                  placeholder="0.000"
                  required
                />
                {fieldErrors.hotM3 ? <p className="text-sm text-destructive">{fieldErrors.hotM3}</p> : null}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="admin-reading-heating">
                  Energia cieplna (GJ)
                </label>
                <input
                  className={buildInputClasses(fieldErrors.heatingGj)}
                  data-admin-reading-field="heatingGj"
                  disabled={formPending || !filters.propertyId || recalcPending}
                  id="admin-reading-heating"
                  inputMode="decimal"
                  value={formState.heatingGj}
                  onChange={(event) => handleFormChange("heatingGj", event.target.value)}
                  placeholder="0.000"
                  required
                />
                {fieldErrors.heatingGj ? <p className="text-sm text-destructive">{fieldErrors.heatingGj}</p> : null}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="admin-reading-comment">
                Notatka techniczna (tylko dla administratora)
              </label>
              <textarea
                className={buildTextareaClasses(fieldErrors.commentText)}
                data-admin-reading-field="commentText"
                disabled={formPending || recalcPending}
                id="admin-reading-comment"
                maxLength={2000}
                onChange={(event) => handleFormChange("commentText", event.target.value)}
                value={formState.commentText}
              />
              {fieldErrors.commentText ? (
                <p className="text-sm text-destructive">{fieldErrors.commentText}</p>
              ) : (
                <p className="text-xs text-muted-foreground">Notatka nie jest widoczna dla najemcy.</p>
              )}
            </div>

            <div className="flex justify-end">
              <Button disabled={formPending || !filters.propertyId || recalcPending} type="submit">
                {formPending ? "Zapisywanie..." : editing ? "Zapisz zmiany" : "Dodaj odczyt"}
              </Button>
            </div>
          </form>
        </section>

        <section className="space-y-4 rounded-lg border bg-card p-6 shadow-sm">
          <header className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Odczyty</h2>
              <p className="text-sm text-muted-foreground">
                {filters.propertyId
                  ? `Wyniki dla nieruchomości ${filters.propertyId}${
                      filters.month ? `, miesiąc ${filters.month}` : ""
                    }.`
                  : "Wprowadź identyfikator nieruchomości, aby wczytać odczyty."}
              </p>
            </div>
            <Button
              variant="secondary"
              type="button"
              onClick={() => loadReadings().catch(() => {})}
              disabled={loading || !filters.propertyId}
            >
              Odśwież
            </Button>
          </header>

          <div className="rounded-md border">
            <table className="w-full border-separate border-spacing-y-1 text-sm">
              <thead className="text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Data</th>
                  <th className="px-4 py-2 text-left font-medium">Wartości</th>
                  <th className="px-4 py-2 text-left font-medium">Typ</th>
                  <th className="px-4 py-2 text-left font-medium">Komentarz</th>
                  <th className="px-4 py-2 text-right font-medium">Akcje</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td className="px-4 py-4 text-center text-muted-foreground" colSpan={5}>
                      Ładowanie odczytów…
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td className="px-4 py-4 text-center text-muted-foreground" colSpan={5}>
                      Brak odczytów dla wybranych filtrów.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => {
                    const deletePending = Boolean(deletePendingById[item.id]);
                    const replacementPending = Boolean(replacementPendingById[item.id]);
                    const updatePending = formPending && formPendingTargetId === item.id;
                    const rowBusy = deletePending || replacementPending || updatePending;

                    return (
                      <Fragment key={item.id}>
                      <tr className="rounded-lg border border-border bg-background/80 align-top shadow-sm">
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            <span className="font-medium text-foreground">{formatDateTime(item.readingAt)}</span>
                            <span className="text-xs text-muted-foreground">
                              Utworzono {formatDateTime(item.createdAt)} • Aktualizacja {formatDateTime(item.updatedAt)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="grid gap-1 text-sm">
                            <span>Zimna woda: {formatNumber(item.coldM3)} m³</span>
                            <span>Ciepła woda: {formatNumber(item.hotM3)} m³</span>
                            <span>Energia: {formatNumber(item.heatingGj)} GJ</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            <span className="inline-flex items-center rounded-full border border-input bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                              {item.origin === "admin_replacement" ? "Zastępczy" : "Regularny"}
                            </span>
                            <div className="text-xs text-muted-foreground">
                              {item.readingType === "baseline" ? "Kotwica" : "Odczyt cykliczny"}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">
                          {item.commentText ? item.commentText : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap justify-end gap-2">
                            <Button
                              variant="secondary"
                              type="button"
                              disabled={rowBusy || recalcPending}
                              onClick={() => handleEdit(item)}
                            >
                              Edytuj
                            </Button>
                            <Button
                              variant="ghost"
                              type="button"
                              disabled={replacementPending || recalcPending}
                              onClick={() => {
                                setActionAccessError(null);
                                setReplacementSource(item);
                              }}
                            >
                              Zastąp
                            </Button>
                            <Button
                              variant="destructive"
                              type="button"
                              disabled={deletePending || recalcPending}
                              onClick={() => handleDelete(item)}
                            >
                              Usuń
                            </Button>
                          </div>
                        </td>
                      </tr>
                    </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <AnchorRecalcPanel
        propertyId={filters.propertyId}
        defaultMonth={filters.month}
        disabled={!filters.propertyId}
        onSuccess={() => {
          loadReadings().catch(() => {
            /* handled elsewhere */
          });
        }}
        onPendingChange={setRecalcPending}
      />

      {recalcPending ? (
        <div
          aria-live="assertive"
          className="fixed inset-0 z-40 flex items-center justify-center bg-background/75 p-4 backdrop-blur-sm"
          role="status"
        >
          <div className="flex flex-col items-center gap-3 rounded-lg border bg-card px-6 py-4 shadow-xl">
            <div aria-hidden="true" className="size-10 animate-spin rounded-full border-2 border-muted border-t-transparent" />
            <p className="text-sm font-medium text-foreground">Planowanie przeliczenia kotwic…</p>
            <p className="text-xs text-muted-foreground text-center">
              Poczekaj na zakończenie operacji, aby uniknąć konfliktów danych.
            </p>
          </div>
        </div>
      ) : null}

      {replacementSource ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm" role="presentation">
          <div
            aria-busy={replacementModalPending}
            aria-labelledby="replacement-modal-title"
            aria-modal="true"
            role="dialog"
            className="relative w-full max-w-lg rounded-lg border bg-card p-6 shadow-xl"
          >
            {replacementModalPending ? (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/60">
                <div className="flex flex-col items-center gap-3" aria-live="assertive">
                  <div aria-hidden="true" className="size-8 animate-spin rounded-full border-2 border-muted border-t-transparent" />
                  <p className="text-sm font-medium text-foreground">Zapisywanie odczytu zastępczego…</p>
                </div>
              </div>
            ) : null}
            <header className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground" id="replacement-modal-title">
                  Odczyt zastępczy
                </h2>
                <p className="text-sm text-muted-foreground">
                  Wprowadź wartości zastępcze. Po zapisaniu zostanie uruchomione ponowne wyliczenie kotwic.
                </p>
                <p className="text-xs text-muted-foreground">
                  Źródło: {formatDate(replacementSource.readingAt)} • {formatNumber(replacementSource.coldM3)} / {formatNumber(replacementSource.hotM3)} /{" "}
                  {formatNumber(replacementSource.heatingGj)}
                </p>
              </div>
              <Button variant="ghost" type="button" onClick={closeReplacementModal} disabled={replacementModalPending}>
                Zamknij
              </Button>
            </header>
            <ReplacementForm
              source={replacementSource}
              onClose={closeReplacementModal}
              onSuccess={handleReplacementSuccess}
              onPendingChange={(pending) => {
                const id = replacementSource.id;
                if (pending) {
                  setReplacementPendingById((prev) => ({ ...prev, [id]: true }));
                } else {
                  clearReplacementPending(id);
                }
              }}
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}

function buildInputClasses(error?: string): string {
  return [
    "w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
    error ? "border-destructive focus-visible:ring-destructive/40" : "border-input",
  ].join(" ");
}

function buildTextareaClasses(error?: string): string {
  return [
    "min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
    error ? "border-destructive focus-visible:ring-destructive/40" : "border-input",
  ].join(" ");
}

export function AdminReadingsView(): JSX.Element {
  return (
    <ToastProvider>
      <AdminReadingsContent />
    </ToastProvider>
  );
}

