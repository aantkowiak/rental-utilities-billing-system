import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";

import { ErrorAlert } from "@/components/common/ErrorAlert";
import { ToastProvider, useToast } from "@/components/common/ToastProvider";
import { Button } from "@/components/ui/button";
import { apiDelete, apiGet, apiPatch, apiPost, type ApiError } from "@/lib/client/http";
import type { ContractDTO, ContractPeriod, CreateContractCmd, UpdateContractCmd } from "@/types";
import type { ListContractsResponse, ContractResponse } from "@/types/contracts";

type ActiveFilter = "all" | "active" | "inactive";

interface FiltersState {
  propertyId: string;
  tenantUserId: string;
  active: ActiveFilter;
}

interface FormState {
  propertyId: string;
  tenantUserId: string;
  periodFrom: string;
  periodTo: string;
}

type FormField = keyof FormState;

const FILTERS_STORAGE_KEY = "admin-contracts:filters";

const DATE_FORMATTER = new Intl.DateTimeFormat("pl-PL", {
  dateStyle: "medium",
});

function resolveInitialFilters(): FiltersState {
  if (typeof window === "undefined") {
    return {
      propertyId: "",
      tenantUserId: "",
      active: "all",
    };
  }

  const params = new URLSearchParams(window.location.search);
  const storedRaw = window.localStorage.getItem(FILTERS_STORAGE_KEY);
  let stored: Partial<FiltersState> = {};

  if (storedRaw) {
    try {
      stored = JSON.parse(storedRaw) as Partial<FiltersState>;
    } catch {
      stored = {};
    }
  }

  const active = (params.get("active") as ActiveFilter | null) ?? stored.active ?? "all";

  return {
    propertyId: params.get("propertyId") ?? stored.propertyId ?? "",
    tenantUserId: params.get("tenantUserId") ?? stored.tenantUserId ?? "",
    active: active === "active" || active === "inactive" ? active : "all",
  };
}

function buildDefaultFormState(): FormState {
  return {
    propertyId: "",
    tenantUserId: "",
    periodFrom: "",
    periodTo: "",
  };
}

function toApiError(error: unknown): ApiError {
  if (error && typeof error === "object" && "code" in error && "message" in error) {
    return error as ApiError;
  }

  return {
    code: "unexpected_error",
    message: error instanceof Error ? error.message : "Wystąpił nieoczekiwany błąd.",
    details: error && typeof error === "object" && "details" in error ? (error as ApiError).details : undefined,
    status: error && typeof error === "object" && "status" in error ? (error as ApiError).status : undefined,
  };
}

function isForbiddenError(error: ApiError): boolean {
  return error.code === "forbidden" || error.status === 403;
}

function shouldRefetchAfterAction(error: ApiError): boolean {
  if (!error) {
    return false;
  }

  const refetchCodes = new Set([
    "contract_overlap",
    "conflict",
    "too_many_requests",
    "rate_limited",
    "internal_error",
    "not_found",
  ]);
  if (refetchCodes.has(error.code)) {
    return true;
  }

  if (!error.status) {
    return false;
  }

  return [400, 404, 409, 429, 500].includes(error.status);
}

function periodsOverlap(a: { from: string; to: string }, b: { from: string; to: string }): boolean {
  const fromA = new Date(a.from).getTime();
  const toA = new Date(a.to).getTime();
  const fromB = new Date(b.from).getTime();
  const toB = new Date(b.to).getTime();

  if ([fromA, toA, fromB, toB].some((value) => Number.isNaN(value))) {
    return false;
  }

  return Math.max(fromA, fromB) <= Math.min(toA, toB);
}

function formatDate(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return DATE_FORMATTER.format(date);
}

function isActive(period: ContractPeriod | undefined | null): boolean {
  if (!period?.from || !period?.to) {
    return false;
  }

  const now = Date.now();
  const from = new Date(period.from).getTime();
  const to = new Date(period.to).getTime();

  if (Number.isNaN(from) || Number.isNaN(to)) {
    return false;
  }

  return from <= now && now <= to;
}

function buildInputClasses(error?: string): string {
  return [
    "w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
    error ? "border-destructive focus-visible:ring-destructive/40" : "border-input",
  ].join(" ");
}

function AdminContractsContent(): JSX.Element {
  const { pushToast } = useToast();

  const [filters, setFilters] = useState<FiltersState>(() => resolveInitialFilters());
  const [items, setItems] = useState<ContractDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [formPending, setFormPending] = useState(false);
  const [deletePendingById, setDeletePendingById] = useState<Record<string, boolean>>({});
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [actionAccessError, setActionAccessError] = useState<string | null>(null);
  const [formError, setFormError] = useState<ApiError | string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FormField, string>>>({});
  const [formState, setFormState] = useState<FormState>(() => buildDefaultFormState());
  const [editing, setEditing] = useState<ContractDTO | null>(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();

    if (filters.propertyId) {
      params.set("propertyId", filters.propertyId);
    }

    if (filters.tenantUserId) {
      params.set("tenantUserId", filters.tenantUserId);
    }

    if (filters.active !== "all") {
      params.set("active", filters.active);
    }

    return params.toString();
  }, [filters]);

  const propertyOptions = useMemo(() => {
    const unique = new Set<string>();
    for (const contract of items) {
      if (contract.propertyId) {
        unique.add(contract.propertyId);
      }
    }
    return Array.from(unique).sort();
  }, [items]);

  const tenantOptions = useMemo(() => {
    const unique = new Set<string>();
    for (const contract of items) {
      if (contract.tenantUserId) {
        unique.add(contract.tenantUserId);
      }
    }
    return Array.from(unique).sort();
  }, [items]);

  const tableItems = useMemo(
    () =>
      items.map((contract) => ({
        contract,
        deletePending: Boolean(deletePendingById[contract.id]),
      })),
    [deletePendingById, items]
  );

  const actionsLocked = Boolean(actionAccessError);
  const submitDisabled = formPending || actionsLocked;

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

    if (filters.tenantUserId) {
      url.searchParams.set("tenantUserId", filters.tenantUserId);
    } else {
      url.searchParams.delete("tenantUserId");
    }

    if (filters.active !== "all") {
      url.searchParams.set("active", filters.active);
    } else {
      url.searchParams.delete("active");
    }

    window.history.replaceState(null, "", url.toString());

    window.localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filters));
  }, [filters]);

  const loadContracts = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    setAccessError(null);
    setActionAccessError(null);

    try {
      const response = await apiGet<ListContractsResponse>(
        queryString ? `/api/v1/contracts?${queryString}` : "/api/v1/contracts"
      );
      setItems(Array.isArray(response.items) ? response.items : []);
      setDeletePendingById({});
    } catch (error) {
      const apiError = toApiError(error);

      setItems([]);
      if (apiError.code === "forbidden") {
        setAccessError(apiError.message);
        return;
      }

      setFetchError(apiError.message);
      pushToast({
        variant: "error",
        title: "Nie udało się pobrać umów",
        description: apiError.message,
      });
    } finally {
      setLoading(false);
    }
  }, [pushToast, queryString]);

  useEffect(() => {
    loadContracts().catch(() => {
      /* błąd obsłużony wewnątrz loadContracts */
    });
  }, [loadContracts]);

  const handleFiltersChange = useCallback((field: keyof FiltersState, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const resetForm = useCallback(() => {
    setFormState(buildDefaultFormState());
    setFieldErrors({});
    setFormError(null);
    setEditing(null);
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
    setFormError(null);
  }, []);

  const handleMutationFailure = useCallback(
    async (error: ApiError, context: "save" | "delete") => {
      if (isForbiddenError(error)) {
        setActionAccessError(error.message);
        return;
      }

      const titles: Record<typeof context, string> = {
        save: "Nie udało się zapisać umowy",
        delete: "Nie udało się usunąć umowy",
      };

      pushToast({
        variant: "error",
        title: titles[context],
        description: error.message,
      });

      if (shouldRefetchAfterAction(error)) {
        await loadContracts();
      }
    },
    [loadContracts, pushToast]
  );

  const validateForm = useCallback((state: FormState): Partial<Record<FormField, string>> => {
    const errors: Partial<Record<FormField, string>> = {};

    if (!state.propertyId.trim()) {
      errors.propertyId = "Wprowadź identyfikator nieruchomości.";
    }

    if (!state.tenantUserId.trim()) {
      errors.tenantUserId = "Wprowadź identyfikator najemcy.";
    }

    if (!state.periodFrom) {
      errors.periodFrom = "Podaj datę rozpoczęcia umowy.";
    }

    if (!state.periodTo) {
      errors.periodTo = "Podaj datę zakończenia umowy.";
    }

    if (state.periodFrom && state.periodTo) {
      const from = new Date(state.periodFrom).getTime();
      const to = new Date(state.periodTo).getTime();

      if (!Number.isNaN(from) && !Number.isNaN(to) && from > to) {
        errors.periodTo = "Data zakończenia musi być późniejsza niż rozpoczęcia.";
      }
    }

    return errors;
  }, []);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (formPending || actionsLocked) {
        return;
      }

      const nextFieldErrors = validateForm(formState);
      if (Object.keys(nextFieldErrors).length > 0) {
        setFieldErrors(nextFieldErrors);
        return;
      }

      const payload: CreateContractCmd = {
        propertyId: formState.propertyId.trim(),
        tenantUserId: formState.tenantUserId.trim(),
        period: {
          from: new Date(formState.periodFrom).toISOString(),
          to: new Date(formState.periodTo).toISOString(),
        },
      };

      setFormPending(true);
      setFormError(null);
      setActionAccessError(null);

      const candidatePeriod = payload.period;

      const overlapExists = items.some((contract) => {
        if (editing && contract.id === editing.id) {
          return false;
        }
        if (contract.propertyId !== payload.propertyId || contract.tenantUserId !== payload.tenantUserId) {
          return false;
        }
        if (!contract.period?.from || !contract.period?.to) {
          return false;
        }
        return periodsOverlap(candidatePeriod, {
          from: contract.period.from,
          to: contract.period.to,
        });
      });

      if (overlapExists) {
        setFieldErrors((prev) => ({
          ...prev,
          periodTo: "Okres umowy nakłada się z istniejącą umową.",
        }));
        setFormPending(false);
        return;
      }

      try {
        if (editing) {
          const updatePayload: UpdateContractCmd = {
            propertyId: payload.propertyId,
            tenantUserId: payload.tenantUserId,
            period: payload.period,
          };
          await apiPatch<ContractResponse>(`/api/v1/contracts/${encodeURIComponent(editing.id)}`, updatePayload);
          pushToast({
            variant: "success",
            title: "Zaktualizowano umowę",
            description: "Dane umowy zostały zapisane.",
          });
        } else {
          await apiPost<ContractResponse>("/api/v1/contracts", payload);
          pushToast({
            variant: "success",
            title: "Dodano umowę",
            description: "Nowa umowa została utworzona.",
          });
        }

        await loadContracts();
        resetForm();
      } catch (error) {
        const apiError = toApiError(error);

        if (apiError.code === "contract_overlap") {
          setFieldErrors((prev) => ({
            ...prev,
            periodTo: "Okres umowy nakłada się z inną umową.",
          }));
          return;
        }

        if (apiError.code === "foreign_key_violation" || apiError.status === 400) {
          const message = apiError.message || "Podano nieprawidłowy identyfikator nieruchomości lub najemcy.";
          setFieldErrors((prev) => ({
            ...prev,
            propertyId: prev.propertyId ?? message,
            tenantUserId: prev.tenantUserId ?? message,
          }));
          return;
        }

        if (isForbiddenError(apiError)) {
          setActionAccessError(apiError.message);
          return;
        }

        if (apiError.code === "validation_error") {
          setFormError("Wprowadzone dane są nieprawidłowe.");
          return;
        }

        if (editing && (apiError.code === "not_found" || apiError.status === 404)) {
          pushToast({
            variant: "info",
            title: "Umowa już nie istnieje",
            description: apiError.message,
          });
          await loadContracts();
          resetForm();
          return;
        }

        setFormError(apiError);
        await handleMutationFailure(apiError, "save");
      } finally {
        setFormPending(false);
      }
    },
    [
      actionsLocked,
      editing,
      formPending,
      formState,
      handleMutationFailure,
      items,
      loadContracts,
      pushToast,
      resetForm,
      validateForm,
    ]
  );

  const handleEdit = useCallback((contract: ContractDTO) => {
    setEditing(contract);
    setFormState({
      propertyId: contract.propertyId,
      tenantUserId: contract.tenantUserId,
      periodFrom: contract.period.from ? contract.period.from.slice(0, 10) : "",
      periodTo: contract.period.to ? contract.period.to.slice(0, 10) : "",
    });
    setFieldErrors({});
    setFormError(null);
  }, []);

  const handleDelete = useCallback(
    async (contract: ContractDTO) => {
      if (actionsLocked) {
        return;
      }

      let shouldProceed = true;
      setDeletePendingById((prev) => {
        if (prev[contract.id]) {
          shouldProceed = false;
          return prev;
        }
        return { ...prev, [contract.id]: true };
      });

      if (!shouldProceed) {
        return;
      }

      const confirmed = window.confirm("Czy na pewno chcesz usunąć tę umowę?");
      if (!confirmed) {
        setDeletePendingById((prev) => {
          if (!prev[contract.id]) {
            return prev;
          }
          const next = { ...prev };
          delete next[contract.id];
          return next;
        });
        return;
      }

      setActionAccessError(null);

      try {
        await apiDelete(`/api/v1/contracts/${encodeURIComponent(contract.id)}`);
        pushToast({
          variant: "success",
          title: "Usunięto umowę",
          description: "Umowa została usunięta.",
        });
        await loadContracts();
        if (editing?.id === contract.id) {
          resetForm();
        }
      } catch (error) {
        const apiError = toApiError(error);

        if (apiError.code === "not_found" || apiError.status === 404) {
          pushToast({
            variant: "info",
            title: "Umowa już nie istnieje",
            description: apiError.message,
          });
          await loadContracts();
        } else {
          await handleMutationFailure(apiError, "delete");
        }
      } finally {
        setDeletePendingById((prev) => {
          if (!prev[contract.id]) {
            return prev;
          }
          const next = { ...prev };
          delete next[contract.id];
          return next;
        });
      }
    },
    [actionsLocked, editing?.id, handleMutationFailure, loadContracts, pushToast, resetForm]
  );

  return (
    <section className="space-y-8">
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground">Filtry</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="admin-contracts-property">
              Identyfikator nieruchomości
            </label>
            <input
              id="admin-contracts-property"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
              placeholder="UUID nieruchomości"
              value={filters.propertyId}
              list="admin-contract-property-options"
              onChange={(event: ChangeEvent<HTMLInputElement>) => handleFiltersChange("propertyId", event.target.value)}
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="admin-contracts-tenant">
              Identyfikator najemcy
            </label>
            <input
              id="admin-contracts-tenant"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
              placeholder="UUID użytkownika"
              value={filters.tenantUserId}
              list="admin-contract-tenant-options"
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                handleFiltersChange("tenantUserId", event.target.value)
              }
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="admin-contracts-active">
              Status
            </label>
            <select
              id="admin-contracts-active"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
              value={filters.active}
              onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                handleFiltersChange("active", event.target.value as ActiveFilter)
              }
              disabled={loading}
            >
              <option value="all">Wszystkie</option>
              <option value="active">Aktywne</option>
              <option value="inactive">Nieaktywne</option>
            </select>
          </div>
        </div>
      </div>

      {accessError ? <ErrorAlert error={accessError} /> : null}
      {fetchError ? <ErrorAlert error={fetchError} /> : null}
      {actionAccessError ? <ErrorAlert error={actionAccessError} /> : null}

      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">{editing ? "Edytuj umowę" : "Dodaj umowę"}</h2>
            <p className="text-sm text-muted-foreground">
              {editing
                ? "Aktualizujesz istniejącą umowę. Zapisz zmiany po uzupełnieniu pól."
                : "Uzupełnij dane, aby przypisać najemcę do nieruchomości."}
            </p>
          </div>
          {editing ? (
            <Button type="button" variant="secondary" onClick={resetForm}>
              Anuluj edycję
            </Button>
          ) : null}
        </header>

        <form className="mt-4 space-y-4" noValidate onSubmit={handleSubmit}>
          <ErrorAlert error={formError} />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="admin-contract-property-id">
                Identyfikator nieruchomości
              </label>
              <input
                id="admin-contract-property-id"
                className={buildInputClasses(fieldErrors.propertyId)}
                value={formState.propertyId}
                onChange={(event: ChangeEvent<HTMLInputElement>) => handleFormChange("propertyId", event.target.value)}
                disabled={submitDisabled}
                list="admin-contract-property-options"
                required
              />
              {fieldErrors.propertyId ? <p className="text-sm text-destructive">{fieldErrors.propertyId}</p> : null}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="admin-contract-tenant-id">
                Identyfikator najemcy
              </label>
              <input
                id="admin-contract-tenant-id"
                className={buildInputClasses(fieldErrors.tenantUserId)}
                value={formState.tenantUserId}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  handleFormChange("tenantUserId", event.target.value)
                }
                disabled={submitDisabled}
                list="admin-contract-tenant-options"
                required
              />
              {fieldErrors.tenantUserId ? <p className="text-sm text-destructive">{fieldErrors.tenantUserId}</p> : null}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="admin-contract-period-from">
                Data rozpoczęcia
              </label>
              <input
                id="admin-contract-period-from"
                type="date"
                className={buildInputClasses(fieldErrors.periodFrom)}
                value={formState.periodFrom}
                onChange={(event: ChangeEvent<HTMLInputElement>) => handleFormChange("periodFrom", event.target.value)}
                disabled={submitDisabled}
                required
              />
              {fieldErrors.periodFrom ? <p className="text-sm text-destructive">{fieldErrors.periodFrom}</p> : null}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground" htmlFor="admin-contract-period-to">
                Data zakończenia
              </label>
              <input
                id="admin-contract-period-to"
                type="date"
                className={buildInputClasses(fieldErrors.periodTo)}
                value={formState.periodTo}
                onChange={(event: ChangeEvent<HTMLInputElement>) => handleFormChange("periodTo", event.target.value)}
                disabled={submitDisabled}
                required
              />
              {fieldErrors.periodTo ? <p className="text-sm text-destructive">{fieldErrors.periodTo}</p> : null}
            </div>
          </div>

          <div className="flex justify-end">
            <Button disabled={submitDisabled} type="submit">
              {formPending ? "Zapisywanie…" : editing ? "Zapisz umowę" : "Dodaj umowę"}
            </Button>
          </div>
        </form>
      </div>

      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <header className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Lista umów</h2>
            <p className="text-sm text-muted-foreground">Podgląd aktywnych i archiwalnych umów najemców.</p>
          </div>
          <Button
            type="button"
            variant="secondary"
            disabled={loading}
            onClick={() => {
              loadContracts().catch(() => {
                /* obsłużone w loadContracts */
              });
            }}
          >
            Odśwież
          </Button>
        </header>

        <div className="mt-6 overflow-hidden rounded-md border">
          <table className="w-full border-separate border-spacing-0 text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Umowa</th>
                <th className="px-4 py-2 text-left font-medium">Okres</th>
                <th className="px-4 py-2 text-left font-medium">Status</th>
                <th className="px-4 py-2 text-left font-medium">Utworzono</th>
                <th className="px-4 py-2 text-right font-medium">Akcje</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-4 py-4 text-center text-muted-foreground" colSpan={5}>
                    Ładowanie umów…
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-center text-muted-foreground" colSpan={5}>
                    Nie znaleziono umów dla wybranych filtrów.
                  </td>
                </tr>
              ) : (
                tableItems.map(({ contract, deletePending }) => {
                  const active = isActive(contract.period);
                  return (
                    <tr key={contract.id} className="border-t border-border bg-background/80">
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <span className="font-medium text-foreground">{contract.id}</span>
                          <span className="text-xs text-muted-foreground">Nieruchomość: {contract.propertyId}</span>
                          <span className="text-xs text-muted-foreground">Najemca: {contract.tenantUserId}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col text-sm">
                          <span>Od: {formatDate(contract.period.from)}</span>
                          <span>Do: {formatDate(contract.period.to)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={[
                            "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
                            active
                              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700"
                              : "border-muted bg-muted/30 text-muted-foreground",
                          ].join(" ")}
                        >
                          {active ? "Aktywna" : "Nieaktywna"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{formatDate(contract.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="secondary"
                            disabled={actionsLocked}
                            onClick={() => handleEdit(contract)}
                          >
                            Edytuj
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            disabled={deletePending || actionsLocked}
                            onClick={() => {
                              handleDelete(contract).catch(() => {
                                /* obsłużone w handleDelete */
                              });
                            }}
                          >
                            Usuń
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <datalist id="admin-contract-property-options">
        {propertyOptions.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
      <datalist id="admin-contract-tenant-options">
        {tenantOptions.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
    </section>
  );
}

export function AdminContractsList(): JSX.Element {
  return (
    <ToastProvider>
      <AdminContractsContent />
    </ToastProvider>
  );
}
