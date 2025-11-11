import { memo, useCallback, useEffect, useMemo, useState, type ChangeEvent, type InputHTMLAttributes } from "react";

import { ErrorAlert } from "@/components/common/ErrorAlert";
import { ToastProvider, useToast } from "@/components/common/ToastProvider";
import { Button } from "@/components/ui/button";
import { apiDelete, apiGet, apiPatch, apiPost, type ApiError } from "@/lib/client/http";
import type { MonthlyAdvanceDTO, PropertyDTO } from "@/types";
import type { MonthlyAdvanceListResponse, MonthlyAdvanceResponse } from "@/types/monthlyConditions";
import type { PropertyListResponse } from "@/lib/services/PropertyService";

const PROPERTY_STORAGE_KEY = "admin-monthly-advances:propertyId";

interface FiltersState {
  propertyId: string;
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

const FIELD_PROPS: Partial<Record<FormField, InputHTMLAttributes<HTMLInputElement>>> = {
  month: { type: "month" },
  managerFee: { inputMode: "decimal", placeholder: "0.00" },
  priceCold: { inputMode: "decimal", placeholder: "0.00" },
  priceHotHeating: { inputMode: "decimal", placeholder: "0.00" },
  priceHeating: { inputMode: "decimal", placeholder: "0.00" },
  forecastCold: { inputMode: "decimal", placeholder: "0.000" },
  forecastHot: { inputMode: "decimal", placeholder: "0.000" },
  forecastHeating: { inputMode: "decimal", placeholder: "0.000" },
  advancePayment: { inputMode: "decimal", placeholder: "0.00" },
};

function resolveInitialMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, "0")}`;
}

function resolveInitialFilters(): FiltersState {
  if (typeof window === "undefined") {
    return {
      propertyId: "",
    };
  }

  const params = new URLSearchParams(window.location.search);
  const propertyParam = params.get("propertyId") ?? "";

  const storedProperty = window.localStorage.getItem(PROPERTY_STORAGE_KEY) ?? "";

  return {
    propertyId: propertyParam || storedProperty,
  };
}

function buildFormState(dto: MonthlyAdvanceDTO): FormState {
  return {
    id: dto.id,
    month: dto.month.substring(0, 7),
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
    month: `${draft.month}-01`,
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
    const raw = draft[field] ?? "";
    const parsed = Number.parseFloat(raw);
    if (raw === "" || raw === undefined) {
      errors[field] = "Pole jest wymagane.";
    } else if (!Number.isFinite(parsed)) {
      errors[field] = "Wprowadź liczbę.";
    }
  }

  return errors;
}

interface MonthlyAdvancesContentProps {
  useOwnProvider?: boolean;
}

function MonthlyAdvancesContent(): JSX.Element {
  const { pushToast } = useToast();

  const [filters, setFilters] = useState<FiltersState>(() => resolveInitialFilters());
  const [items, setItems] = useState<MonthlyAdvanceDTO[]>([]);

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
  const [properties, setProperties] = useState<PropertyDTO[]>([]);

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

    window.history.replaceState(null, "", url.toString());
  }, [filters.propertyId]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(PROPERTY_STORAGE_KEY, filters.propertyId);
  }, [filters.propertyId]);

  const loadProperties = useCallback(async () => {
    try {
      const response = await apiGet<PropertyListResponse>("/api/v1/properties");
      setProperties(Array.isArray(response.items) ? response.items : []);
    } catch (error) {
      const apiError = toApiError(error);
      pushToast({
        variant: "error",
        title: "Nie udało się pobrać nieruchomości",
        description: apiError.message,
      });
    }
  }, [pushToast]);

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

      const response = await apiGet<MonthlyAdvanceListResponse>(`/api/v1/monthly-conditions?${params.toString()}`);
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
      setCreateDraft(buildEmptyFormState(resolveInitialMonth()));
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
        title: "Nie udało się pobrać zaliczek miesięcznych",
        description: apiError.message,
      });
    } finally {
      setLoading(false);
    }
  }, [filters.propertyId, pushToast]);

  useEffect(() => {
    loadProperties().catch(() => {
      /* obsługa w loadProperties */
    });
  }, [loadProperties]);

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

    return isCreateDraftDirty(createDraft, resolveInitialMonth());
  }, [baselineDrafts, createDraft, draftsById, filters.propertyId, items]);

  const confirmDiscardChanges = useCallback(() => {
    if (!hasUnsavedChanges) {
      return true;
    }
    return window.confirm("Masz niezapisane zmiany. Czy na pewno chcesz je odrzucić?");
  }, [hasUnsavedChanges]);

  const handleFiltersPropertyChange = useCallback(
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
      setCreateDraft(buildEmptyFormState(resolveInitialMonth()));
      setCreateErrors({});
    },
    [confirmDiscardChanges, filters.propertyId]
  );

  const handleDraftChange = useCallback((id: string, field: FormField, value: string) => {
    setDraftsById((prev) => {
      const current = prev[id];
      if (current && current[field] === value) {
        return prev;
      }

      return {
        ...prev,
        [id]: {
          ...current,
          id,
          [field]: value,
        },
      };
    });

    setDraftErrorsById((prev) => {
      const current = prev[id];
      if (!current || current[field] === undefined) {
        return prev;
      }

      return {
        ...prev,
        [id]: {
          ...current,
          [field]: undefined,
        },
      };
    });
  }, []);

  const handleCreateDraftChange = useCallback((field: FormField, value: string) => {
    setCreateDraft((prev) => {
      if (prev[field] === value) {
        return prev;
      }

      return {
        ...prev,
        [field]: value,
      };
    });

    setCreateErrors((prev) => {
      if (prev[field] === undefined) {
        return prev;
      }

      return {
        ...prev,
        [field]: undefined,
      };
    });
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
        await apiPatch<MonthlyAdvanceResponse>(`/api/v1/monthly-conditions/${encodeURIComponent(id)}`, {
          ...mapDraftToPayload(draft, filters.propertyId),
        });

        pushToast({
          variant: "success",
          title: "Zapisano zaliczkę",
          description: `Zmiany dla miesiąca ${draft.month} zostały zapisane.`,
        });
        await loadConditions();
      } catch (error) {
        const apiError = toApiError(error);

        if (apiError.code === "forbidden") {
          setActionAccessError(apiError.message);
        } else if (apiError.code === "monthly_advance_locked") {
          setLockedById((prev) => ({
            ...prev,
            [id]: apiError.message || "Zaliczka jest zablokowana przez zaksięgowane raporty.",
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
          const isNotFound = apiError.code === "monthly_advance_not_found" || apiError.status === 404;
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
              description: "Zaliczka została zaktualizowana lub usunięta przez innego użytkownika.",
            });
            await loadConditions();
          } else if (!apiError.status || apiError.status >= 500) {
            pushToast({
              variant: "error",
              title: "Nie udało się zapisać zaliczki",
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

      const confirmed = window.confirm("Czy na pewno chcesz usunąć tę zaliczkę?");
      if (!confirmed) {
        return;
      }

      setDeletePendingById((prev) => ({ ...prev, [id]: true }));
      setActionAccessError(null);

      try {
        await apiDelete(`/api/v1/monthly-conditions/${encodeURIComponent(id)}`);
        pushToast({
          variant: "success",
          title: "Usunięto zaliczkę",
          description: "Rekord został pomyślnie usunięty.",
        });
        await loadConditions();
      } catch (error) {
        const apiError = toApiError(error);

        if (apiError.code === "forbidden") {
          setActionAccessError(apiError.message);
        } else if (apiError.code === "monthly_advance_locked") {
          setLockedById((prev) => ({
            ...prev,
            [id]: apiError.message || "Nie można usunąć zaliczki powiązanej z raportami.",
          }));
          pushToast({
            variant: "info",
            title: "Zaliczka zablokowana",
            description: apiError.message,
          });
        } else {
          const isNotFound = apiError.code === "monthly_advance_not_found" || apiError.status === 404;
          if (isNotFound) {
            pushToast({
              variant: "info",
              title: "Rekord nie istnieje",
              description: "Zaliczka została już usunięta.",
            });
            await loadConditions();
          } else if (!apiError.status || apiError.status >= 500) {
            pushToast({
              variant: "error",
              title: "Nie udało się usunąć zaliczki",
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
        month: "Wybierz nieruchomość przed dodaniem zaliczki.",
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
      await apiPost<MonthlyAdvanceResponse>(
        "/api/v1/monthly-conditions",
        mapDraftToPayload(createDraft, filters.propertyId)
      );

      pushToast({
        variant: "success",
        title: "Dodano zaliczkę",
        description: `Zaliczka dla miesiąca ${createDraft.month} została utworzona.`,
      });

      setCreateDraft(buildEmptyFormState(resolveInitialMonth()));
      setCreateErrors({});
      await loadConditions();
    } catch (error) {
      const apiError = toApiError(error);

      if (apiError.code === "forbidden") {
        setActionAccessError(apiError.message);
      } else if (apiError.code === "monthly_advance_locked") {
        setCreateLockedMessage(apiError.message || "Nie można dodać zaliczki z powodu zablokowanych raportów.");
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
          title: "Zaliczka już istnieje",
          description: apiError.message,
        });
        await loadConditions();
      } else if (!apiError.status || apiError.status >= 500) {
        pushToast({
          variant: "error",
          title: "Nie udało się dodać zaliczki",
          description: apiError.message,
        });
      }
    } finally {
      setPendingCreate(false);
    }
  }, [createDraft, filters.propertyId, loadConditions, pushToast]);

  const handleRefresh = useCallback(() => {
    loadConditions().catch(() => {
      /* obsługa w loadConditions */
    });
  }, [loadConditions]);

  return (
    <section className="space-y-8">
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground" htmlFor="monthly-filter-property">
            Nieruchomość
          </label>
          <select
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            id="monthly-filter-property"
            value={filters.propertyId}
            onChange={handleFiltersPropertyChange}
          >
            <option value="">-- Wybierz nieruchomość --</option>
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {property.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {accessError ? <ErrorAlert error={accessError} /> : null}
      {fetchError ? <ErrorAlert error={fetchError} /> : null}
      {actionAccessError ? <ErrorAlert error={actionAccessError} /> : null}

      {lockMessages.length > 0 ? (
        <div
          className="space-y-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"
          role="status"
        >
          {lockMessages.map((message) => (
            <p key={message}>{message}</p>
          ))}
        </div>
      ) : null}

      <div className="space-y-4 rounded-lg border bg-card p-6 shadow-sm">
        <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h2 className="text-lg font-semibold text-foreground">Zaliczki miesięczne</h2>
          <Button type="button" variant="secondary" onClick={handleRefresh} disabled={loading || !filters.propertyId}>
            Odśwież
          </Button>
        </header>

        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full border-collapse text-sm">
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
                    Ładowanie zaliczek…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td className="px-3 py-4 text-center text-muted-foreground" colSpan={10}>
                    Brak zaliczek dla wybranych filtrów.
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const baseline = baselineDrafts[item.id] ?? buildFormState(item);
                  const draft = draftsById[item.id] ?? baseline;

                  return (
                    <MonthlyAdvanceRow
                      key={item.id}
                      id={item.id}
                      draft={draft}
                      baseline={baseline}
                      errors={draftErrorsById[item.id] ?? {}}
                      pending={Boolean(pendingById[item.id])}
                      deletePending={Boolean(deletePendingById[item.id])}
                      lockReason={lockedById[item.id]}
                      onFieldChange={handleDraftChange}
                      onSave={handleSave}
                      onDelete={handleDelete}
                    />
                  );
                })
              )}

              {!loading && filters.propertyId ? (
                <tr className="bg-muted/20">
                  {DRAFT_FIELDS.map((field) => (
                    <td key={field} className="px-3 py-3 align-top">
                      <AdvanceInput
                        value={createDraft[field] ?? ""}
                        onChange={(value) => handleCreateDraftChange(field, value)}
                        disabled={pendingCreate || Boolean(createLockedMessage)}
                        error={createErrors[field]}
                        inputProps={{
                          ...FIELD_PROPS[field],
                          title: createLockedMessage ?? undefined,
                        }}
                      />
                    </td>
                  ))}
                  <td className="px-3 py-3 align-top">
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={pendingCreate || Boolean(createLockedMessage)}
                        onClick={handleCreate}
                        title={createLockedMessage ?? undefined}
                      >
                        {pendingCreate ? "Dodawanie…" : "Dodaj zaliczkę"}
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

export function MonthlyAdvancesTable({ useOwnProvider }: MonthlyAdvancesContentProps = {}): JSX.Element {
  if (useOwnProvider) {
    return (
      <ToastProvider>
        <MonthlyAdvancesContent />
      </ToastProvider>
    );
  }

  return <MonthlyAdvancesContent />;
}

interface AdvanceInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  error?: string;
  inputProps?: InputHTMLAttributes<HTMLInputElement>;
}

function AdvanceInput({ value, onChange, disabled, error, inputProps }: AdvanceInputProps): JSX.Element {
  return (
    <div className="space-y-1">
      <input
        {...inputProps}
        className={[
          "w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
          error ? "border-destructive focus-visible:ring-destructive/40" : "border-input",
        ].join(" ")}
        disabled={disabled || inputProps?.disabled}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

interface MonthlyAdvanceRowProps {
  id: string;
  draft: FormState;
  baseline?: FormState;
  errors: Partial<Record<FormField, string>>;
  pending: boolean;
  deletePending: boolean;
  lockReason?: string;
  onFieldChange: (id: string, field: FormField, value: string) => void;
  onSave: (id: string) => void;
  onDelete: (id: string) => void;
}

const MonthlyAdvanceRow = memo(function MonthlyAdvanceRow({
  id,
  draft,
  baseline,
  errors,
  pending,
  deletePending,
  lockReason,
  onFieldChange,
  onSave,
  onDelete,
}: MonthlyAdvanceRowProps): JSX.Element {
  const isDirty = baseline ? !areDraftsEqual(draft, baseline) : true;
  const isLocked = Boolean(lockReason);
  const rowClassName = isDirty ? "bg-muted/40" : undefined;

  return (
    <tr className={rowClassName}>
      {DRAFT_FIELDS.map((field) => (
        <td key={field} className="px-3 py-3 align-top">
          <AdvanceInput
            value={draft[field] ?? ""}
            onChange={(value) => onFieldChange(id, field, value)}
            disabled={pending || isLocked}
            error={errors[field]}
            inputProps={{
              ...FIELD_PROPS[field],
              title: lockReason ?? FIELD_PROPS[field]?.title,
            }}
          />
        </td>
      ))}
      <td className="px-3 py-3 align-top">
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            disabled={!isDirty || pending || deletePending || isLocked}
            onClick={() => onSave(id)}
            title={lockReason ?? undefined}
          >
            {pending ? "Zapisywanie…" : "Zapisz"}
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={deletePending || pending || isLocked}
            onClick={() => onDelete(id)}
            title={lockReason ?? undefined}
          >
            {deletePending ? "Usuwanie…" : "Usuń"}
          </Button>
        </div>
      </td>
    </tr>
  );
});
