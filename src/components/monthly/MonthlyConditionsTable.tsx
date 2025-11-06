import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";

import { ErrorAlert } from "@/components/common/ErrorAlert";
import { ToastProvider, useToast } from "@/components/common/ToastProvider";
import { Button } from "@/components/ui/button";
import { apiGet, apiPatch, apiPost, type ApiError } from "@/lib/client/http";
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

function resolveInitialMonth(value?: string): string {
  if (value && /^\d{4}-\d{2}$/.test(value)) {
    return value;
  }
  const now = new Date();
  return `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, "0")}`;
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

function toApiError(error: unknown): ApiError {
  if (error && typeof error === "object" && "code" in error && "message" in error) {
    return error as ApiError;
  }
  return {
    code: "unexpected_error",
    message: error instanceof Error ? error.message : "Wystąpił nieoczekiwany błąd.",
  };
}

function formatCurrency(value: number | string): string {
  const numeric = typeof value === "string" ? Number.parseFloat(value) : value;
  if (!Number.isFinite(numeric)) {
    return "—";
  }
  return new Intl.NumberFormat("pl-PL", {
    style: "currency",
    currency: "PLN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numeric);
}

function formatNumber(value: number | string): string {
  const numeric = typeof value === "string" ? Number.parseFloat(value) : value;
  if (!Number.isFinite(numeric)) {
    return "—";
  }
  return new Intl.NumberFormat("pl-PL", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(numeric);
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

function buildInputClasses(error?: string): string {
  return [
    "w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
    error ? "border-destructive focus-visible:ring-destructive/40" : "border-input",
  ].join(" ");
}

interface MonthlyConditionsContentProps {
  useOwnProvider?: boolean;
}

function MonthlyConditionsContent(): JSX.Element {
  const { pushToast } = useToast();

  const [filters, setFilters] = useState<FiltersState>(() => resolveInitialFilters());
  const [items, setItems] = useState<MonthlyConditionDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [lockMessage, setLockMessage] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [formState, setFormState] = useState<FormState>(() => buildEmptyFormState(resolveInitialMonth()));
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FormField, string>>>({});

  const editing = useMemo(() => (formState.id ? items.find((item) => item.id === formState.id) ?? null : null), [
    formState.id,
    items,
  ]);

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
  }, [filters]);

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
      setFetchError(null);
      setAccessError(null);
      return;
    }

    setLoading(true);
    setFetchError(null);
    setAccessError(null);
    setLockMessage(null);

    try {
      const params = new URLSearchParams();
      params.set("propertyId", filters.propertyId);
      if (filters.month) {
        params.set("month", filters.month);
      }

      const response = await apiGet<MonthlyConditionListResponse>(`/api/v1/monthly-conditions?${params.toString()}`);
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
        title: "Nie udało się pobrać warunków miesięcznych",
        description: apiError.message,
      });
    } finally {
      setLoading(false);
    }
  }, [filters.month, filters.propertyId, pushToast]);

  useEffect(() => {
    loadConditions().catch(() => {
      // handled in loadConditions
    });
  }, [loadConditions]);

  const handleFiltersPropertyChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setFilters((prev) => ({
      ...prev,
      propertyId: event.target.value.trim(),
    }));
  }, []);

  const handleFiltersMonthChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const nextMonth = resolveInitialMonth(event.target.value);
    setFilters((prev) => ({
      ...prev,
      month: nextMonth,
    }));
    if (!formState.id) {
      setFormState((prev) => ({
        ...prev,
        month: nextMonth,
      }));
    }
  }, [formState.id]);

  const beginCreate = useCallback(() => {
    setFormState(buildEmptyFormState(filters.month));
    setFieldErrors({});
    setLockMessage(null);
  }, [filters.month]);

  const beginEdit = useCallback((item: MonthlyConditionDTO) => {
    setFormState(buildFormState(item));
    setFieldErrors({});
    setLockMessage(null);
  }, []);

  const cancelEdit = useCallback(() => {
    setFormState(buildEmptyFormState(filters.month));
    setFieldErrors({});
    setLockMessage(null);
  }, [filters.month]);

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

  const validateForm = useCallback((): Partial<Record<FormField, string>> => {
    const nextErrors: Partial<Record<FormField, string>> = {};

    if (!filters.propertyId) {
      nextErrors.month = "Wybierz nieruchomość przed zapisem.";
    }

    if (!formState.month || !/^\d{4}-\d{2}$/.test(formState.month)) {
      nextErrors.month = "Podaj miesiąc w formacie RRRR-MM.";
    }

    const numericFields: Array<{ field: FormField; label: string }> = [
      { field: "managerFee", label: "Opłata administracyjna" },
      { field: "priceCold", label: "Cena zimnej wody" },
      { field: "priceHotHeating", label: "Cena ciepłej wody" },
      { field: "priceHeating", label: "Cena ogrzewania" },
      { field: "forecastCold", label: "Prognoza zimnej wody" },
      { field: "forecastHot", label: "Prognoza ciepłej wody" },
      { field: "forecastHeating", label: "Prognoza ogrzewania" },
      { field: "advancePayment", label: "Zaliczka" },
    ];

    for (const { field, label } of numericFields) {
      const value = formState[field];
      const parsed = Number.parseFloat(value);
      if (!value && value !== "0") {
        nextErrors[field] = `${label} jest wymagana.`;
      } else if (!Number.isFinite(parsed)) {
        nextErrors[field] = `${label} musi być liczbą.`;
      }
    }

    return nextErrors;
  }, [filters.propertyId, formState]);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (pending) {
        return;
      }

      const validationErrors = validateForm();
      if (Object.keys(validationErrors).length > 0) {
        setFieldErrors(validationErrors);
        return;
      }

      if (!filters.propertyId) {
        setFieldErrors((prev) => ({
          ...prev,
          month: "Wybierz nieruchomość przed zapisem.",
        }));
        return;
      }

      const payload = {
        propertyId: filters.propertyId,
        month: formState.month,
        managerFee: Number.parseFloat(formState.managerFee),
        priceCold: Number.parseFloat(formState.priceCold),
        priceHotHeating: Number.parseFloat(formState.priceHotHeating),
        priceHeating: Number.parseFloat(formState.priceHeating),
        forecastCold: Number.parseFloat(formState.forecastCold),
        forecastHot: Number.parseFloat(formState.forecastHot),
        forecastHeating: Number.parseFloat(formState.forecastHeating),
        advancePayment: Number.parseFloat(formState.advancePayment),
      };

      setPending(true);
      setFieldErrors({});
      setLockMessage(null);

      try {
        if (formState.id) {
          await apiPatch<MonthlyConditionResponse>(
            `/api/v1/monthly-conditions/${encodeURIComponent(formState.id)}`,
            payload
          );
          pushToast({
            variant: "success",
            title: "Zaktualizowano warunki",
            description: `Zapisano wartości dla miesiąca ${formState.month}.`,
          });
        } else {
          await apiPost<MonthlyConditionResponse>("/api/v1/monthly-conditions", payload);
          pushToast({
            variant: "success",
            title: "Dodano warunki",
            description: `Utworzono warunki dla miesiąca ${formState.month}.`,
          });
        }

        await loadConditions();
        cancelEdit();
      } catch (error) {
        const apiError = toApiError(error);

        if (apiError.code === "monthly_condition_locked") {
          setLockMessage(apiError.message || "Warunki są zablokowane przez zrealizowany raport.");
          return;
        }

        if (apiError.code === "validation_error" && typeof apiError.details === "object" && apiError.details) {
          const nextErrors: Partial<Record<FormField, string>> = {};
          for (const [key, value] of Object.entries(apiError.details as Record<string, string>)) {
            if (key in formState && typeof value === "string") {
              nextErrors[key as FormField] = value;
            }
          }
          if (Object.keys(nextErrors).length > 0) {
            setFieldErrors(nextErrors);
            return;
          }
        }

        setFetchError(apiError.message);
      } finally {
        setPending(false);
      }
    },
    [cancelEdit, filters.propertyId, formState, loadConditions, pending, pushToast, validateForm]
  );

  const formTitle = formState.id ? "Edytuj warunki" : "Dodaj warunki";

  return (
    <section className="space-y-8">
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground">Filtry</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="monthly-property">
              Identyfikator nieruchomości
            </label>
            <input
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
              id="monthly-property"
              placeholder="UUID nieruchomości"
              value={filters.propertyId}
              onChange={handleFiltersPropertyChange}
            />
            <p className="text-xs text-muted-foreground">Wymagany do ładowania i zapisu warunków.</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="monthly-month">
              Miesiąc rozliczeniowy
            </label>
            <input
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
              id="monthly-month"
              type="month"
              value={filters.month}
              onChange={handleFiltersMonthChange}
            />
            <p className="text-xs text-muted-foreground">Zapisywane w URL oraz w pamięci przeglądarki.</p>
          </div>
        </div>
      </div>

      {accessError ? <ErrorAlert error={accessError} /> : null}
      {fetchError ? <ErrorAlert error={fetchError} /> : null}
      {lockMessage ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900" role="alert">
          {lockMessage}
        </div>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[2fr_3fr]">
        <section className="space-y-4 rounded-lg border bg-card p-6 shadow-sm">
          <header className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">{formTitle}</h2>
              <p className="text-sm text-muted-foreground">
                Ustal wartości stawek i prognoz dla danego miesiąca. Wprowadzane kwoty powinny być podawane w złotówkach.
              </p>
            </div>
            {formState.id ? (
              <Button variant="secondary" type="button" onClick={beginCreate}>
                Dodaj nowe
              </Button>
            ) : null}
          </header>

          <form className="space-y-4" noValidate onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="monthly-form-month">
                  Miesiąc
                </label>
                <input
                  className={buildInputClasses(fieldErrors.month)}
                  id="monthly-form-month"
                  type="month"
                  value={formState.month}
                  onChange={(event) => handleFormChange("month", event.target.value)}
                  disabled={pending}
                  required
                />
                {fieldErrors.month ? <p className="text-sm text-destructive">{fieldErrors.month}</p> : null}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="monthly-form-managerFee">
                  Opłata administracyjna (PLN)
                </label>
                <input
                  className={buildInputClasses(fieldErrors.managerFee)}
                  id="monthly-form-managerFee"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={formState.managerFee}
                  onChange={(event) => handleFormChange("managerFee", event.target.value)}
                  disabled={pending}
                  required
                />
                {fieldErrors.managerFee ? <p className="text-sm text-destructive">{fieldErrors.managerFee}</p> : null}
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-sm font-medium text-foreground">Ceny jednostkowe (PLN)</span>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <input
                    className={buildInputClasses(fieldErrors.priceCold)}
                    inputMode="decimal"
                    placeholder="Zimna woda"
                    value={formState.priceCold}
                    onChange={(event) => handleFormChange("priceCold", event.target.value)}
                    disabled={pending}
                    required
                  />
                  {fieldErrors.priceCold ? <p className="mt-1 text-sm text-destructive">{fieldErrors.priceCold}</p> : null}
                </div>
                <div>
                  <input
                    className={buildInputClasses(fieldErrors.priceHotHeating)}
                    inputMode="decimal"
                    placeholder="Ciepła woda"
                    value={formState.priceHotHeating}
                    onChange={(event) => handleFormChange("priceHotHeating", event.target.value)}
                    disabled={pending}
                    required
                  />
                  {fieldErrors.priceHotHeating ? (
                    <p className="mt-1 text-sm text-destructive">{fieldErrors.priceHotHeating}</p>
                  ) : null}
                </div>
                <div>
                  <input
                    className={buildInputClasses(fieldErrors.priceHeating)}
                    inputMode="decimal"
                    placeholder="Ogrzewanie"
                    value={formState.priceHeating}
                    onChange={(event) => handleFormChange("priceHeating", event.target.value)}
                    disabled={pending}
                    required
                  />
                  {fieldErrors.priceHeating ? (
                    <p className="mt-1 text-sm text-destructive">{fieldErrors.priceHeating}</p>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-sm font-medium text-foreground">Prognozy (m³ / GJ)</span>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <input
                    className={buildInputClasses(fieldErrors.forecastCold)}
                    inputMode="decimal"
                    placeholder="Zimna woda"
                    value={formState.forecastCold}
                    onChange={(event) => handleFormChange("forecastCold", event.target.value)}
                    disabled={pending}
                    required
                  />
                  {fieldErrors.forecastCold ? (
                    <p className="mt-1 text-sm text-destructive">{fieldErrors.forecastCold}</p>
                  ) : null}
                </div>
                <div>
                  <input
                    className={buildInputClasses(fieldErrors.forecastHot)}
                    inputMode="decimal"
                    placeholder="Ciepła woda"
                    value={formState.forecastHot}
                    onChange={(event) => handleFormChange("forecastHot", event.target.value)}
                    disabled={pending}
                    required
                  />
                  {fieldErrors.forecastHot ? <p className="mt-1 text-sm text-destructive">{fieldErrors.forecastHot}</p> : null}
                </div>
                <div>
                  <input
                    className={buildInputClasses(fieldErrors.forecastHeating)}
                    inputMode="decimal"
                    placeholder="Ogrzewanie"
                    value={formState.forecastHeating}
                    onChange={(event) => handleFormChange("forecastHeating", event.target.value)}
                    disabled={pending}
                    required
                  />
                  {fieldErrors.forecastHeating ? (
                    <p className="mt-1 text-sm text-destructive">{fieldErrors.forecastHeating}</p>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground" htmlFor="monthly-advance">
                  Zaliczka (PLN)
                </label>
                <input
                  className={buildInputClasses(fieldErrors.advancePayment)}
                  id="monthly-advance"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={formState.advancePayment}
                  onChange={(event) => handleFormChange("advancePayment", event.target.value)}
                  disabled={pending}
                  required
                />
                {fieldErrors.advancePayment ? (
                  <p className="text-sm text-destructive">{fieldErrors.advancePayment}</p>
                ) : null}
              </div>
            </div>

            <div className="flex justify-end gap-3">
              {formState.id ? (
                <Button type="button" variant="ghost" onClick={cancelEdit} disabled={pending}>
                  Anuluj
                </Button>
              ) : null}
              <Button type="submit" disabled={pending || !filters.propertyId}>
                {pending ? "Zapisywanie…" : "Zapisz warunki"}
              </Button>
            </div>
          </form>
        </section>

        <section className="space-y-4 rounded-lg border bg-card p-6 shadow-sm">
          <header className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Aktualne warunki</h2>
              <p className="text-sm text-muted-foreground">
                {filters.propertyId
                  ? `Wartości dla nieruchomości ${filters.propertyId}.`
                  : "Wybierz nieruchomość, aby wczytać warunki."}
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={() => loadConditions().catch(() => {})}
              disabled={loading || !filters.propertyId}
            >
              Odśwież
            </Button>
          </header>

          <div className="overflow-hidden rounded-md border">
            <table className="w-full border-separate border-spacing-y-1 text-sm">
              <thead className="text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Miesiąc</th>
                  <th className="px-4 py-2 text-left font-medium">Opłaty</th>
                  <th className="px-4 py-2 text-left font-medium">Prognozy</th>
                  <th className="px-4 py-2 text-right font-medium">Akcje</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td className="px-4 py-4 text-center text-muted-foreground" colSpan={4}>
                      Ładowanie warunków…
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td className="px-4 py-4 text-center text-muted-foreground" colSpan={4}>
                      Brak warunków dla wybranego zestawu filtrów.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id} className="rounded-lg border border-border bg-background/80 align-top shadow-sm">
                      <td className="px-4 py-3 font-medium text-foreground">
                        {item.month}
                        <div className="text-xs text-muted-foreground">Zaliczka: {formatCurrency(item.advancePayment)}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <span className="text-sm text-foreground">
                            Opłata administracyjna: {formatCurrency(item.managerFee)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            Ceny: {formatCurrency(item.priceCold)} / {formatCurrency(item.priceHotHeating)} /{" "}
                            {formatCurrency(item.priceHeating)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1 text-xs text-muted-foreground">
                          <span>Zimna woda: {formatNumber(item.forecastCold)} m³</span>
                          <span>Ciepła woda: {formatNumber(item.forecastHot)} m³</span>
                          <span>Ogrzewanie: {formatNumber(item.forecastHeating)} GJ</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end">
                          <Button type="button" variant="ghost" onClick={() => beginEdit(item)} disabled={pending}>
                            Edytuj
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
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
