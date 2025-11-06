import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";

import { ErrorAlert } from "@/components/common/ErrorAlert";
import { ToastProvider, useToast } from "@/components/common/ToastProvider";
import { Button } from "@/components/ui/button";
import { apiDelete, apiGet, apiPatch, apiPost, type ApiError } from "@/lib/client/http";
import type { CreatePropertyCmd, PropertyDTO, UpdatePropertyCmd } from "@/types";

interface PropertyListResponse {
  items: PropertyDTO[];
}

type FormField = "label" | "startMonth";

interface FormState {
  label: string;
  startMonth: string;
}

const monthFormatter = new Intl.DateTimeFormat("pl-PL", {
  month: "long",
  year: "numeric",
});

function buildInputClasses(error?: string): string {
  return [
    "w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
    error ? "border-destructive focus-visible:ring-destructive/40" : "border-input",
  ].join(" ");
}

function formatStartMonth(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }

  const normalized = value.length === 7 ? `${value}-01` : value;
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return monthFormatter.format(parsed);
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

function buildDefaultFormState(): FormState {
  return {
    label: "",
    startMonth: "",
  };
}

function AdminPropertiesContent(): JSX.Element {
  const { pushToast } = useToast();

  const [items, setItems] = useState<PropertyDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [formError, setFormError] = useState<ApiError | string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FormField, string>>>({});
  const [formState, setFormState] = useState<FormState>(() => buildDefaultFormState());
  const [editing, setEditing] = useState<PropertyDTO | null>(null);

  const sortedItems = useMemo(
    () =>
      [...items].sort((a, b) => {
        const dateA = a.createdAt ?? "";
        const dateB = b.createdAt ?? "";
        return dateA < dateB ? 1 : dateA > dateB ? -1 : 0;
      }),
    [items]
  );

  const loadProperties = useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    setAccessError(null);

    try {
      const response = await apiGet<PropertyListResponse>("/api/v1/properties");
      setItems(Array.isArray(response.items) ? response.items : []);
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
        title: "Nie udało się pobrać nieruchomości",
        description: apiError.message,
      });
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    loadProperties().catch(() => {
      /* obsłużone wewnątrz loadProperties */
    });
  }, [loadProperties]);

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

  const validateForm = useCallback(
    (state: FormState): Partial<Record<FormField, string>> => {
      const errors: Partial<Record<FormField, string>> = {};

      if (!state.label.trim()) {
        errors.label = "Nazwa nieruchomości jest wymagana.";
      } else if (state.label.trim().length < 3) {
        errors.label = "Nazwa powinna mieć co najmniej 3 znaki.";
      }

      if (!state.startMonth) {
        errors.startMonth = "Wybierz miesiąc początkowy.";
      }

      return errors;
    },
    []
  );

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (pendingAction) {
        return;
      }

      const nextFieldErrors = validateForm(formState);
      if (Object.keys(nextFieldErrors).length > 0) {
        setFieldErrors(nextFieldErrors);
        return;
      }

      const payload: CreatePropertyCmd = {
        label: formState.label.trim(),
        startMonth: formState.startMonth,
      };

      setPendingAction(true);
      setFormError(null);

      try {
        if (editing) {
          const updatePayload: UpdatePropertyCmd = {
            label: payload.label,
            startMonth: payload.startMonth,
          };
          await apiPatch<{ property: PropertyDTO }>(
            `/api/v1/properties/${encodeURIComponent(editing.id)}`,
            updatePayload
          );

          pushToast({
            variant: "success",
            title: "Zaktualizowano nieruchomość",
            description: "Zmiany zostały zapisane.",
          });
        } else {
          await apiPost<{ property: PropertyDTO }>("/api/v1/properties", payload);
          pushToast({
            variant: "success",
            title: "Dodano nieruchomość",
            description: "Nowa nieruchomość została zapisana.",
          });
        }

        await loadProperties();
        resetForm();
      } catch (error) {
        const apiError = toApiError(error);

        if (apiError.code === "duplicate_label") {
          setFieldErrors((prev) => ({
            ...prev,
            label: "Nieruchomość o takiej nazwie już istnieje.",
          }));
          return;
        }

        if (apiError.code === "validation_error" && typeof apiError.details === "object") {
          setFormError("Podane dane są nieprawidłowe.");
          return;
        }

        if (apiError.code === "forbidden") {
          setAccessError(apiError.message);
          return;
        }

        setFormError(apiError);
        pushToast({
          variant: "error",
          title: "Nie udało się zapisać nieruchomości",
          description: apiError.message,
        });
      } finally {
        setPendingAction(false);
      }
    },
    [editing, formState, loadProperties, pendingAction, pushToast, resetForm, validateForm]
  );

  const handleEdit = useCallback((property: PropertyDTO) => {
    setEditing(property);
    setFormState({
      label: property.label ?? "",
      startMonth: property.startMonth ?? "",
    });
    setFieldErrors({});
    setFormError(null);
  }, []);

  const handleDelete = useCallback(
    async (property: PropertyDTO) => {
      if (pendingAction) {
        return;
      }

      const confirmed = window.confirm(`Czy na pewno chcesz usunąć nieruchomość "${property.label}"?`);
      if (!confirmed) {
        return;
      }

      setPendingAction(true);

      try {
        await apiDelete(`/api/v1/properties/${encodeURIComponent(property.id)}`);
        pushToast({
          variant: "success",
          title: "Usunięto nieruchomość",
          description: "Rekord został usunięty.",
        });
        await loadProperties();
        if (editing?.id === property.id) {
          resetForm();
        }
      } catch (error) {
        const apiError = toApiError(error);

        if (apiError.code === "forbidden") {
          setAccessError(apiError.message);
        } else {
          pushToast({
            variant: "error",
            title: "Nie udało się usunąć nieruchomości",
            description: apiError.message,
          });
        }
      } finally {
        setPendingAction(false);
      }
    },
    [editing?.id, loadProperties, pendingAction, pushToast, resetForm]
  );

  return (
    <section className="space-y-8">
      {accessError ? <ErrorAlert error={accessError} /> : null}
      {fetchError ? <ErrorAlert error={fetchError} /> : null}

      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {editing ? "Edytuj nieruchomość" : "Dodaj nieruchomość"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {editing
                ? "Aktualizujesz istniejącą nieruchomość. Zapisz zmiany po uzupełnieniu pól."
                : "Uzupełnij nazwę i miesiąc początkowy, aby dodać nową nieruchomość."}
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

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="admin-property-label">
              Nazwa nieruchomości
            </label>
            <input
              id="admin-property-label"
              className={buildInputClasses(fieldErrors.label)}
              type="text"
              placeholder="np. Mieszkanie Kowalskich"
              value={formState.label}
              disabled={pendingAction}
              onChange={(event: ChangeEvent<HTMLInputElement>) => handleFormChange("label", event.target.value)}
              required
              minLength={3}
            />
            {fieldErrors.label ? <p className="text-sm text-destructive">{fieldErrors.label}</p> : null}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="admin-property-start-month">
              Miesiąc początkowy rozliczeń
            </label>
            <input
              id="admin-property-start-month"
              className={buildInputClasses(fieldErrors.startMonth)}
              type="month"
              value={formState.startMonth}
              disabled={pendingAction}
              onChange={(event: ChangeEvent<HTMLInputElement>) => handleFormChange("startMonth", event.target.value)}
              required
            />
            {fieldErrors.startMonth ? <p className="text-sm text-destructive">{fieldErrors.startMonth}</p> : null}
          </div>

          <div className="flex justify-end">
            <Button disabled={pendingAction} type="submit">
              {pendingAction ? "Zapisywanie…" : editing ? "Zapisz zmiany" : "Dodaj nieruchomość"}
            </Button>
          </div>
        </form>
      </div>

      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <header className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Lista nieruchomości</h2>
            <p className="text-sm text-muted-foreground">
              Zarządzaj nieruchomościami przypisanymi do umów i odczytów.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            disabled={loading}
            onClick={() => {
              loadProperties().catch(() => {
                /* obsłużone w loadProperties */
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
                <th className="px-4 py-2 text-left font-medium">Nazwa</th>
                <th className="px-4 py-2 text-left font-medium">Miesiąc początkowy</th>
                <th className="px-4 py-2 text-left font-medium">Utworzono</th>
                <th className="px-4 py-2 text-left font-medium">Ostatnia aktualizacja</th>
                <th className="px-4 py-2 text-right font-medium">Akcje</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-4 py-4 text-center text-muted-foreground" colSpan={5}>
                    Ładowanie nieruchomości…
                  </td>
                </tr>
              ) : sortedItems.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-center text-muted-foreground" colSpan={5}>
                    Nie dodano jeszcze żadnych nieruchomości.
                  </td>
                </tr>
              ) : (
                sortedItems.map((property) => (
                  <tr key={property.id} className="border-t border-border bg-background/80">
                    <td className="px-4 py-3">
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">{property.label}</span>
                        <span className="text-xs text-muted-foreground">{property.id}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">{formatStartMonth(property.startMonth)}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {formatStartMonth(property.createdAt?.slice(0, 7) ?? "")}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {formatStartMonth(property.updatedAt?.slice(0, 7) ?? "")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={pendingAction}
                          onClick={() => handleEdit(property)}
                        >
                          Edytuj
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          disabled={pendingAction}
                          onClick={() => {
                            handleDelete(property).catch(() => {
                              /* obsłużone w handleDelete */
                            });
                          }}
                        >
                          Usuń
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export function AdminPropertiesList(): JSX.Element {
  return (
    <ToastProvider>
      <AdminPropertiesContent />
    </ToastProvider>
  );
}


