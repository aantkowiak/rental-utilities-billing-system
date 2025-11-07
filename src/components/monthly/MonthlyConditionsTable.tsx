import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type InputHTMLAttributes } from "react";

import { ErrorAlert } from "@/components/common/ErrorAlert";
import { ToastProvider, useToast } from "@/components/common/ToastProvider";
import { Button } from "@/components/ui/button";
import { apiDelete, apiGet, apiPatch, apiPost, type ApiError } from "@/lib/client/http";
import type { MonthlyConditionDTO } from "@/types";
import type {
  MonthlyConditionListResponse,
  MonthlyConditionResponse,
} from "@/types/monthlyConditions";

const PROPERTY_STORAGE_KEY = "admin-monthly:propertyId";
const MONTH_STORAGE_KEY = "admin-monthly:month";

interface FiltersState {
  propertyId: string;
  month: string;
}

interface FormState {
  id?: string;
  month: string;
  managerFee: string;
  priceCold: string;
  priceHotHeating: string;
  priceHeating: string;
  forecastCold: string;
  forecastHot: string;
  forecastHeating: string;
  advancePayment: string;
}

type FormField = keyof FormState;

type DraftMap = Record<string, FormState>;
type DraftErrorsMap = Record<string, Partial<Record<FormField, string>>>;
type PendingMap = Record<string, boolean>;

const DRAFT_FIELDS: FormField[] = [
  "month",
  "managerFee",
  "priceCold",
  "priceHotHeating",
  "priceHeating",
  "forecastCold",
  "forecastHot",
  "forecastHeating",
  "advancePayment",
];

const NUMERIC_FIELDS: FormField[] = [
  "managerFee",
  "priceCold",
  "priceHotHeating",
  "priceHeating",
  "forecastCold",
  "forecastHot",
  "forecastHeating",
  "advancePayment",
];

function resolveInitialMonth(value?: string): string {
  if (value && /^\d{4}-\d{2}$/.test(value)) {
    return value;
  }
  const now = new Date();
  return `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, "0")}`;
}

function normalizeMonth(value: string, fallback: string): string {
  if (value && /^\d{4}-\d{2}$/.test(value)) {
    return value;
  }
  return fallback;
}

function resolveInitialFilters(): FiltersState {
  if (typeof window === "undefined") {
    return {
      propertyId: "",
      month: resolveInitialMonth(),
    };
  }

  const params = new URLSearchParams(window.location.search);
  const propertyParam = params.get("propertyId") ?? "";
  const monthParam = params.get("month") ?? "";

  const storedProperty = window.localStorage.getItem(PROPERTY_STORAGE_KEY) ?? "";
  const storedMonth = window.localStorage.getItem(MONTH_STORAGE_KEY) ?? "";

  return {
    propertyId: propertyParam || storedProperty,
    month: resolveInitialMonth(monthParam || storedMonth),
  };
}

function buildFormState(dto: MonthlyConditionDTO): FormState {
  return {
    id: dto.id,
    month: dto.month,
    managerFee: dto.managerFee.toString(),
    priceCold: dto.priceCold.toString(),
    priceHotHeating: dto.priceHotHeating.toString(),
    priceHeating: dto.priceHeating.toString(),
    forecastCold: dto.forecastCold.toString(),
    forecastHot: dto.forecastHot.toString(),
    forecastHeating: dto.forecastHeating.toString(),
    advancePayment: dto.advancePayment.toString(),
  };
}

function buildEmptyFormState(month: string): FormState {
  return {
    month,
    managerFee: "",
    priceCold: "",
    priceHotHeating: "",
    priceHeating: "",
    forecastCold: "",
    forecastHot: "",
    forecastHeating: "",
    advancePayment: "",
  };
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
  for (const [key, value] of Object.entries(details as Record<string, unknown>)) {
    if (DRAFT_FIELDS.includes(key as FormField) && typeof value === "string") {
      result[key as FormField] = value;
    }
  }
  return result;
}

function areDraftsEqual(a: FormState | undefined, b: FormState | undefined): boolean {
  if (!a || !b) {
    return false;
  }

  return DRAFT_FIELDS.every((field) => (a[field] ?? "") === (b[field] ?? ""));
}

function isCreateDraftDirty(draft: FormState, referenceMonth: string): boolean {
  if (draft.month !== referenceMonth) {
    return true;
  }

  return NUMERIC_FIELDS.some((field) => draft[field]?.trim());
}

function mapDraftToPayload(draft: FormState, propertyId: string) {
  return {
    propertyId,
    month: draft.month,
    managerFee: Number.parseFloat(draft.managerFee),
    priceCold: Number.parseFloat(draft.priceCold),
    priceHotHeating: Number.parseFloat(draft.priceHotHeating),
    priceHeating: Number.parseFloat(draft.priceHeating),
    forecastCold: Number.parseFloat(draft.forecastCold),
    forecastHot: Number.parseFloat(draft.forecastHot),
    forecastHeating: Number.parseFloat(draft.forecastHeating),
    advancePayment: Number.parseFloat(draft.advancePayment),
  };
}

function validateDraft(draft: FormState, requireMonth = true): Partial<Record<FormField, string>> {
  const errors: Partial<Record<FormField, string>> = {};

  if (requireMonth && (!draft.month || !/^\d{4}-\d{2}$/.test(draft.month))) {
    errors.month = "Podaj miesiąc w formacie RRRR-MM.";
  }

  for (const field of NUMERIC_FIELDS) {
    const raw = draft[field];
    const parsed = Number.parseFloat(raw);
    if (raw === "" || raw === undefined) {
      errors[field] = "Pole jest wymagane.";
    } else if (!Number.isFinite(parsed)) {
      errors[field] = "Wprowadź liczbę.";
    }
  }

  return errors;
}

interface MonthlyConditionsContentProps {
  useOwnProvider?: boolean;
}

function MonthlyConditionsContent(): JSX.Element {
  const { pushToast } = useToast();

  const [filters, setFilters] = useState<FiltersState>(() => resolveInitialFilters());
  const [items, setItems] = useState<MonthlyConditionDTO[]>([]);

  const [draftsById, setDraftsById] = useState<DraftMap>({});
  const [draftErrorsById, setDraftErrorsById] = useState<DraftErrorsMap>({});
  const [pendingById, setPendingById] = useState<PendingMap>({});
  const [deletePendingById, setDeletePendingById] = useState<PendingMap>({});
  const [lockedById, setLockedById] = useState<Record<string, string>>({});

  const [createDraft, setCreateDraft] = useState<FormState>(() => buildEmptyFormState(resolveInitialMonth()));
  const [createErrors, setCreateErrors] = useState<Partial<Record<FormField, string>>>({});
  const [pendingCreate, setPendingCreate] = useState(false);
  const [createLockedMessage, setCreateLockedMessage] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [actionAccessError, setActionAccessError] = useState<string | null>(null);

  const baselineDrafts = useMemo(() => {
    const map: DraftMap = {};
    for (const item of items) {
      map[item.id] = buildFormState(item);
    }
    return map;
  }, [items]);

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
    window.localStorage.setItem(MONTH_STORAGE_KEY, filters.month);
  }, [filters.propertyId, filters.month]);

  const loadConditions = useCallback(async () => {
    if (!filters.propertyId) {
      setItems([]);
      setDraftsById({});
      setDraftErrorsById({});
      setLockedById({});
      setFetchError(null);
      setAccessError(null);
      return;
    }

    setLoading(true);
    setFetchError(null);
    setAccessError(null);
    setActionAccessError(null);

    try {
      const params = new URLSearchParams();
      params.set("propertyId", filters.propertyId);
      if (filters.month) {
        params.set("month", filters.month);
      }

      const response = await apiGet<MonthlyConditionListResponse>(`/api/v1/monthly-conditions?${params.toString()}`);
      const sorted = Array.isArray(response.items)
        ? [...response.items].sort((a, b) => b.month.localeCompare(a.month))
        : [];

      setItems(sorted);
      const nextDrafts: DraftMap = {};
      for (const item of sorted) {
        nextDrafts[item.id] = buildFormState(item);
      }
      setDraftsById(nextDrafts);
      setDraftErrorsById({});
      setLockedById({});
      setCreateLockedMessage(null);
      setCreateDraft(buildEmptyFormState(filters.month));
      setCreateErrors({});
    } catch (error) {
      const apiError = toApiError(error);

      if (apiError.code === "forbidden") {
        setAccessError(apiError.message);
        setItems([]);
        setDraftsById({});
        return;
      }

      setFetchError(apiError.message);
      pushToast({
        variant: "error",
        title: "Nie udało się pobrać warunków miesięcznych",
        description: apiError.message,
      });
    } finally {
      setLoading(false);
    }
  }, [filters.month, filters.propertyId, pushToast]);

  useEffect(() => {
    loadConditions().catch(() => {
      /* obsługa w loadConditions */
    });
  }, [loadConditions]);

  const hasUnsavedChanges = useMemo(() => {
    if (filters.propertyId === "") {
      return false;
    }

    for (const item of items) {
      const baseline = baselineDrafts[item.id];
      const current = draftsById[item.id];
      if (!areDraftsEqual(current, baseline)) {
        return true;
      }
    }

    return isCreateDraftDirty(createDraft, filters.month);
  }, [baselineDrafts, createDraft, draftsById, filters.month, filters.propertyId, items]);

  const confirmDiscardChanges = useCallback(() => {
    if (!hasUnsavedChanges) {
      return true;
    }
    return window.confirm("Masz niezapisane zmiany. Czy na pewno chcesz je odrzucić?");
  }, [hasUnsavedChanges]);

  const handleFiltersPropertyChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value.trim();
      if (value === filters.propertyId) {
        return;
      }
      if (!confirmDiscardChanges()) {
        return;
      }

      setFilters((prev) => ({
        ...prev,
        propertyId: value,
      }));
      setDraftsById({});
      setDraftErrorsById({});
      setLockedById({});
      setCreateLockedMessage(null);
      setCreateDraft(buildEmptyFormState(filters.month));
      setCreateErrors({});
    },
    [confirmDiscardChanges, filters.month, filters.propertyId]
  );

  const handleFiltersMonthChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const sanitized = normalizeMonth(event.target.value, filters.month);
      if (sanitized === filters.month) {
        return;
      }

      if (!confirmDiscardChanges()) {
        return;
      }

      setFilters((prev) => ({
        ...prev,
        month: sanitized,
      }));
      setCreateDraft(buildEmptyFormState(sanitized));
      setCreateErrors({});
      setLockedById({});
      setCreateLockedMessage(null);
    },
    [confirmDiscardChanges, filters.month]
  );

  const handleDraftChange = useCallback((id: string, field: FormField, value: string) => {
    setDraftsById((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        id,
        [field]: value,
      },
    }));
    setDraftErrorsById((prev) => {
      const next = { ...prev };
      if (next[id]) {
        next[id] = { ...next[id], [field]: undefined };
      }
      return next;
    });
  }, []);

  const handleCreateDraftChange = useCallback((field: FormField, value: string) => {
    setCreateDraft((prev) => ({
      ...prev,
      [field]: value,
    }));
    setCreateErrors((prev) => ({
      ...prev,
      [field]: undefined,
    }));
  }, []);

  const lockMessages = useMemo(() => {
    const messages = new Set<string>();
    Object.values(lockedById).forEach((message) => {
      if (message) {
        messages.add(message);
      }
    });
    if (createLockedMessage) {
      messages.add(createLockedMessage);
    }
    return Array.from(messages);
  }, [createLockedMessage, lockedById]);

  const handleSave = useCallback(
    async (id: string) => {
      if (!filters.propertyId) {
        return;
      }

      const draft = draftsById[id];
      if (!draft) {
        return;
      }

      const validationErrors = validateDraft(draft);
      if (Object.keys(validationErrors).length > 0) {
        setDraftErrorsById((prev) => ({
          ...prev,
          [id]: validationErrors,
        }));
        return;
      }

      setPendingById((prev) => ({ ...prev, [id]: true }));
      setActionAccessError(null);

      try {
        await apiPatch<MonthlyConditionResponse>(`/api/v1/monthly-conditions/${encodeURIComponent(id)}`, {
          ...mapDraftToPayload(draft, filters.propertyId),
        });

        pushToast({
          variant: "success",
          title: "Zapisano warunki",
          description: `Zmiany dla miesiąca ${draft.month} zostały zapisane.`,
        });
        await loadConditions();
      } catch (error) {
        const apiError = toApiError(error);

        if (apiError.code === "forbidden") {
          setActionAccessError(apiError.message);
        } else if (apiError.code === "monthly_condition_locked") {
          setLockedById((prev) => ({
            ...prev,
            [id]: apiError.message || "Warunki są zablokowane przez zaksięgowane raporty.",
          }));
        } else if (apiError.code === "validation_error") {
          const extracted = extractFieldErrors(apiError.details);
          if (Object.keys(extracted).length > 0) {
            setDraftErrorsById((prev) => ({
              ...prev,
              [id]: extracted,
            }));
            return;
          }
          setDraftErrorsById((prev) => ({
            ...prev,
            [id]: { month: apiError.message },
          }));
        } else {
          const isConflict = apiError.code === "conflict" || apiError.status === 409;
          const isNotFound = apiError.code === "monthly_condition_not_found" || apiError.status === 404;
          if (isConflict) {
            pushToast({
              variant: "info",
              title: "Wartości uległy zmianie",
              description: apiError.message,
            });
            await loadConditions();
          } else if (isNotFound) {
            pushToast({
              variant: "info",
              title: "Rekord nie istnieje",
              description: "Warunki zostały zaktualizowane lub usunięte przez innego użytkownika.",
            });
            await loadConditions();
          } else if (!apiError.status || apiError.status >= 500) {
            pushToast({
              variant: "error",
              title: "Nie udało się zapisać warunków",
              description: apiError.message,
            });
          }
        }
      } finally {
        setPendingById((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }
    },
    [draftsById, filters.propertyId, loadConditions, pushToast]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      if (deletePendingById[id]) {
        return;
      }

      const confirmed = window.confirm("Czy na pewno chcesz usunąć te warunki?");
      if (!confirmed) {
        return;
      }

      setDeletePendingById((prev) => ({ ...prev, [id]: true }));
      setActionAccessError(null);

      try {
        await apiDelete(`/api/v1/monthly-conditions/${encodeURIComponent(id)}`);
        pushToast({
          variant: "success",
          title: "Usunięto warunki",
          description: "Rekord został pomyślnie usunięty.",
        });
        await loadConditions();
      } catch (error) {
        const apiError = toApiError(error);

        if (apiError.code === "forbidden") {
          setActionAccessError(apiError.message);
        } else if (apiError.code === "monthly_condition_locked") {
          setLockedById((prev) => ({
            ...prev,
            [id]: apiError.message || "Nie można usunąć warunków powiązanych z raportami.",
          }));
          pushToast({
            variant: "info",
            title: "Warunki zablokowane",
            description: apiError.message,
          });
        } else {
          const isNotFound = apiError.code === "monthly_condition_not_found" || apiError.status === 404;
          if (isNotFound) {
            pushToast({
              variant: "info",
              title: "Rekord nie istnieje",
              description: "Warunki zostały już usunięte.",
            });
            await loadConditions();
          } else if (!apiError.status || apiError.status >= 500) {
            pushToast({
              variant: "error",
              title: "Nie udało się usunąć warunków",
              description: apiError.message,
            });
          }
        }
      } finally {
        setDeletePendingById((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }
    },
    [deletePendingById, loadConditions, pushToast]
  );

  const handleCreate = useCallback(async () => {
    if (!filters.propertyId) {
      setCreateErrors((prev) => ({
        ...prev,
        month: "Wybierz nieruchomość przed dodaniem warunków.",
      }));
      return;
    }

    const validationErrors = validateDraft(createDraft);
    if (Object.keys(validationErrors).length > 0) {
      setCreateErrors(validationErrors);
      return;
    }

    setPendingCreate(true);
    setActionAccessError(null);
    setCreateLockedMessage(null);

    try {
      await apiPost<MonthlyConditionResponse>("/api/v1/monthly-conditions", mapDraftToPayload(createDraft, filters.propertyId));

      pushToast({
        variant: "success",
        title: "Dodano warunki",
        description: `Warunki dla miesiąca ${createDraft.month} zostały utworzone.`,
      });

      setCreateDraft(buildEmptyFormState(filters.month));
      setCreateErrors({});
      await loadConditions();
    } catch (error) {
      const apiError = toApiError(error);

      if (apiError.code === "forbidden") {
        setActionAccessError(apiError.message);
      } else if (apiError.code === "monthly_condition_locked") {
        setCreateLockedMessage(apiError.message || "Nie można dodać warunków z powodu zablokowanych raportów.");
      } else if (apiError.code === "validation_error") {
        const extracted = extractFieldErrors(apiError.details);
        if (Object.keys(extracted).length > 0) {
          setCreateErrors(extracted);
        } else {
          setCreateErrors({ month: apiError.message });
        }
      } else if (apiError.code === "conflict" || apiError.status === 409) {
        pushToast({
          variant: "info",
          title: "Warunki już istnieją",
          description: apiError.message,
        });
        await loadConditions();
      } else if (!apiError.status || apiError.status >= 500) {
        pushToast({
          variant: "error",
          title: "Nie udało się dodać warunków",
          description: apiError.message,
        });
      }
    } finally {
      setPendingCreate(false);
    }
  }, [createDraft, filters.month, filters.propertyId, loadConditions, pushToast]);

  const handleRefresh = useCallback(() => {
    loadConditions().catch(() => {
      /* obsługa w loadConditions */
    });
  }, [loadConditions]);

  const renderInput = (
    value: string,
    onChange: (value: string) => void,
    disabled: boolean,
    error?: string,
    props?: Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "disabled">
  ): JSX.Element => (
    <div className="space-y-1">
      <input
        {...props}
        className={[
          "w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
          error ? "border-destructive focus-visible:ring-destructive/40" : "border-input",
        ].join(" ")}
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );

  return (
    <section className="space-y-8">
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground">Filtry</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="monthly-filter-property">
              Identyfikator nieruchomości
            </label>
            <input
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
              id="monthly-filter-property"
              placeholder="UUID nieruchomości"
              value={filters.propertyId}
              onChange={handleFiltersPropertyChange}
            />
            <p className="text-xs text-muted-foreground">Wymagany do wczytania danych i wykonywania operacji.</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="monthly-filter-month">
              Miesiąc rozliczeniowy
            </label>
            <input
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
              id="monthly-filter-month"
              type="month"
              value={filters.month}
              onChange={handleFiltersMonthChange}
            />
            <p className="text-xs text-muted-foreground">Przechowywane w adresie URL i pamięci przeglądarki.</p>
          </div>
        </div>
      </div>

      {accessError ? <ErrorAlert error={accessError} /> : null}
      {fetchError ? <ErrorAlert error={fetchError} /> : null}
      {actionAccessError ? <ErrorAlert error={actionAccessError} /> : null}

      {lockMessages.length > 0 ? (
        <div className="space-y-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900" role="status">
          {lockMessages.map((message) => (
            <p key={message}>{message}</p>
          ))}
        </div>
      ) : null}

      <div className="space-y-4 rounded-lg border bg-card p-6 shadow-sm">
        <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Warunki miesięczne</h2>
            <p className="text-sm text-muted-foreground">
              {filters.propertyId
                ? `Zarządzaj warunkami dla nieruchomości ${filters.propertyId}.`
                : "Wybierz nieruchomość, aby rozpocząć edycję warunków."}
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={handleRefresh}
            disabled={loading || !filters.propertyId}
          >
            Odśwież
          </Button>
        </header>

        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full min-w-[960px] border-collapse text-sm">
            <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground md:sticky md:top-0">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">Miesiąc</th>
                <th className="px-3 py-2 text-left font-semibold">Opłata adm. (PLN)</th>
                <th className="px-3 py-2 text-left font-semibold">Cena zimnej wody (PLN)</th>
                <th className="px-3 py-2 text-left font-semibold">Cena ciepłej wody (PLN)</th>
                <th className="px-3 py-2 text-left font-semibold">Cena ogrzewania (PLN)</th>
                <th className="px-3 py-2 text-left font-semibold">Prognoza zimnej wody (m³)</th>
                <th className="px-3 py-2 text-left font-semibold">Prognoza ciepłej wody (m³)</th>
                <th className="px-3 py-2 text-left font-semibold">Prognoza ogrzewania (GJ)</th>
                <th className="px-3 py-2 text-left font-semibold">Zaliczka (PLN)</th>
                <th className="px-3 py-2 text-right font-semibold">Akcje</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-3 py-4 text-center text-muted-foreground" colSpan={10}>
                    Ładowanie warunków…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td className="px-3 py-4 text-center text-muted-foreground" colSpan={10}>
                    Brak warunków dla wybranych filtrów.
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const draft = draftsById[item.id] ?? buildFormState(item);
                  const errors = draftErrorsById[item.id] ?? {};
                  const isPending = Boolean(pendingById[item.id]);
                  const isDeletePending = Boolean(deletePendingById[item.id]);
                  const lockReason = lockedById[item.id];
                  const isLocked = Boolean(lockReason);
                  const isDirty = !areDraftsEqual(draft, baselineDrafts[item.id]);

                  return (
                    <tr key={item.id} className={isDirty ? "bg-muted/40" : undefined}>
                      <td className="px-3 py-3 align-top">
                        {renderInput(draft.month, (value) => handleDraftChange(item.id, "month", value), isPending || isLocked, errors.month, {
                          type: "month",
                        })}
                      </td>
                      <td className="px-3 py-3 align-top">
                        {renderInput(draft.managerFee, (value) => handleDraftChange(item.id, "managerFee", value), isPending || isLocked, errors.managerFee, {
                          inputMode: "decimal",
                          placeholder: "0.00",
                        })}
                      </td>
                      <td className="px-3 py-3 align-top">
                        {renderInput(draft.priceCold, (value) => handleDraftChange(item.id, "priceCold", value), isPending || isLocked, errors.priceCold, {
                          inputMode: "decimal",
                          placeholder: "0.00",
                        })}
                      </td>
                      <td className="px-3 py-3 align-top">
                        {renderInput(
                          draft.priceHotHeating,
                          (value) => handleDraftChange(item.id, "priceHotHeating", value),
                          isPending || isLocked,
                          errors.priceHotHeating,
                          {
                            inputMode: "decimal",
                            placeholder: "0.00",
                          }
                        )}
                      </td>
                      <td className="px-3 py-3 align-top">
                        {renderInput(draft.priceHeating, (value) => handleDraftChange(item.id, "priceHeating", value), isPending || isLocked, errors.priceHeating, {
                          inputMode: "decimal",
                          placeholder: "0.00",
                        })}
                      </td>
                      <td className="px-3 py-3 align-top">
                        {renderInput(
                          draft.forecastCold,
                          (value) => handleDraftChange(item.id, "forecastCold", value),
                          isPending || isLocked,
                          errors.forecastCold,
                          {
                            inputMode: "decimal",
                            placeholder: "0.000",
                          }
                        )}
                      </td>
                      <td className="px-3 py-3 align-top">
                        {renderInput(
                          draft.forecastHot,
                          (value) => handleDraftChange(item.id, "forecastHot", value),
                          isPending || isLocked,
                          errors.forecastHot,
                          {
                            inputMode: "decimal",
                            placeholder: "0.000",
                          }
                        )}
                      </td>
                      <td className="px-3 py-3 align-top">
                        {renderInput(
                          draft.forecastHeating,
                          (value) => handleDraftChange(item.id, "forecastHeating", value),
                          isPending || isLocked,
                          errors.forecastHeating,
                          {
                            inputMode: "decimal",
                            placeholder: "0.000",
                          }
                        )}
                      </td>
                      <td className="px-3 py-3 align-top">
                        {renderInput(
                          draft.advancePayment,
                          (value) => handleDraftChange(item.id, "advancePayment", value),
                          isPending || isLocked,
                          errors.advancePayment,
                          {
                            inputMode: "decimal",
                            placeholder: "0.00",
                          }
                        )}
                      </td>
                      <td className="px-3 py-3 align-top">
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            disabled={!isDirty || isPending || isDeletePending || isLocked}
                            onClick={() => handleSave(item.id)}
                            title={lockReason ?? undefined}
                          >
                            {isPending ? "Zapisywanie…" : "Zapisz"}
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            disabled={isDeletePending || isPending || isLocked}
                            onClick={() => handleDelete(item.id)}
                            title={lockReason ?? undefined}
                          >
                            {isDeletePending ? "Usuwanie…" : "Usuń"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}

              {!loading && filters.propertyId ? (
                <tr className="bg-muted/20">
                  <td className="px-3 py-3 align-top">
                    {renderInput(createDraft.month, (value) => handleCreateDraftChange("month", value), pendingCreate, createErrors.month, {
                      type: "month",
                      title: createLockedMessage ?? undefined,
                      disabled: pendingCreate || Boolean(createLockedMessage),
                    })}
                  </td>
                  <td className="px-3 py-3 align-top">
                    {renderInput(
                      createDraft.managerFee,
                      (value) => handleCreateDraftChange("managerFee", value),
                      pendingCreate || Boolean(createLockedMessage),
                      createErrors.managerFee,
                      {
                        inputMode: "decimal",
                        placeholder: "0.00",
                        title: createLockedMessage ?? undefined,
                      }
                    )}
                  </td>
                  <td className="px-3 py-3 align-top">
                    {renderInput(
                      createDraft.priceCold,
                      (value) => handleCreateDraftChange("priceCold", value),
                      pendingCreate || Boolean(createLockedMessage),
                      createErrors.priceCold,
                      {
                        inputMode: "decimal",
                        placeholder: "0.00",
                        title: createLockedMessage ?? undefined,
                      }
                    )}
                  </td>
                  <td className="px-3 py-3 align-top">
                    {renderInput(
                      createDraft.priceHotHeating,
                      (value) => handleCreateDraftChange("priceHotHeating", value),
                      pendingCreate || Boolean(createLockedMessage),
                      createErrors.priceHotHeating,
                      {
                        inputMode: "decimal",
                        placeholder: "0.00",
                        title: createLockedMessage ?? undefined,
                      }
                    )}
                  </td>
                  <td className="px-3 py-3 align-top">
                    {renderInput(
                      createDraft.priceHeating,
                      (value) => handleCreateDraftChange("priceHeating", value),
                      pendingCreate || Boolean(createLockedMessage),
                      createErrors.priceHeating,
                      {
                        inputMode: "decimal",
                        placeholder: "0.00",
                        title: createLockedMessage ?? undefined,
                      }
                    )}
                  </td>
                  <td className="px-3 py-3 align-top">
                    {renderInput(
                      createDraft.forecastCold,
                      (value) => handleCreateDraftChange("forecastCold", value),
                      pendingCreate || Boolean(createLockedMessage),
                      createErrors.forecastCold,
                      {
                        inputMode: "decimal",
                        placeholder: "0.000",
                        title: createLockedMessage ?? undefined,
                      }
                    )}
                  </td>
                  <td className="px-3 py-3 align-top">
                    {renderInput(
                      createDraft.forecastHot,
                      (value) => handleCreateDraftChange("forecastHot", value),
                      pendingCreate || Boolean(createLockedMessage),
                      createErrors.forecastHot,
                      {
                        inputMode: "decimal",
                        placeholder: "0.000",
                        title: createLockedMessage ?? undefined,
                      }
                    )}
                  </td>
                  <td className="px-3 py-3 align-top">
                    {renderInput(
                      createDraft.forecastHeating,
                      (value) => handleCreateDraftChange("forecastHeating", value),
                      pendingCreate || Boolean(createLockedMessage),
                      createErrors.forecastHeating,
                      {
                        inputMode: "decimal",
                        placeholder: "0.000",
                        title: createLockedMessage ?? undefined,
                      }
                    )}
                  </td>
                  <td className="px-3 py-3 align-top">
                    {renderInput(
                      createDraft.advancePayment,
                      (value) => handleCreateDraftChange("advancePayment", value),
                      pendingCreate || Boolean(createLockedMessage),
                      createErrors.advancePayment,
                      {
                        inputMode: "decimal",
                        placeholder: "0.00",
                        title: createLockedMessage ?? undefined,
                      }
                    )}
                  </td>
                  <td className="px-3 py-3 align-top">
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={pendingCreate || Boolean(createLockedMessage)}
                        onClick={handleCreate}
                        title={createLockedMessage ?? undefined}
                      >
                        {pendingCreate ? "Dodawanie…" : "Dodaj warunki"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export function MonthlyConditionsTable({ useOwnProvider }: MonthlyConditionsContentProps = {}): JSX.Element {
  if (useOwnProvider) {
    return (
      <ToastProvider>
        <MonthlyConditionsContent />
      </ToastProvider>
    );
  }

  return <MonthlyConditionsContent />;
}


