import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";

import { ErrorAlert } from "@/components/common/ErrorAlert";
import { ToastProvider, useToast } from "@/components/common/ToastProvider";
import { Button } from "@/components/ui/button";
import { apiGet, apiPatch, type ApiError } from "@/lib/client/http";
import type { ProfileWithEmail } from "@/lib/services/ProfileService";
import type { UpdateMeCmd } from "@/types";

interface ProfileResponse {
  profile: ProfileWithEmail;
}

interface PropertiesResponse {
  items: { id: string; label: string }[];
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

function extractFieldError(details: unknown, fieldName: string): string | null {
  if (!details || typeof details !== "object") {
    return null;
  }

  const field = (details as Record<string, unknown>)[fieldName];
  if (typeof field === "string") {
    return field;
  }

  if (Array.isArray(field)) {
    const [first] = field;
    return typeof first === "string" ? first : null;
  }

  return null;
}

function ProfileFormContent(): JSX.Element {
  const { pushToast } = useToast();

  const [email, setEmail] = useState("");
  const [propertyLabel, setPropertyLabel] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<ApiError | string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const loadPromiseRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    if (fieldError) {
      inputRef.current?.focus();
    }
  }, [fieldError]);

  const loadProfile = useCallback(async () => {
    if (loadPromiseRef.current) {
      return loadPromiseRef.current;
    }

    const promise = (async () => {
      try {
        const response = await apiGet<ProfileResponse>("/api/v1/me");
        setEmail(response.profile.email);
        setFormError(null);

        // Load property label if propertyId is present
        if (response.profile.propertyId) {
          try {
            const propertiesResponse = await apiGet<PropertiesResponse>("/api/v1/properties");
            const property = propertiesResponse.items.find((p) => p.id === response.profile.propertyId);
            setPropertyLabel(property?.label ?? null);
          } catch (error) {
            // eslint-disable-next-line no-console
            console.error("Failed to load property info:", error);
            setPropertyLabel(null);
          }
        } else {
          setPropertyLabel(null);
        }
      } catch (error) {
        const apiError = toApiError(error);
        if (apiError.code === "profile_not_found" || apiError.status === 404) {
          setFormError(apiError.message || "Nie znaleziono profilu użytkownika.");
          setEmail("");
          setPropertyLabel(null);
          return;
        }
        pushToast({
          variant: "error",
          title: "Nie udało się pobrać profilu",
          description: apiError.message,
        });
        setFormError(apiError);
      } finally {
        loadPromiseRef.current = null;
      }
    })();

    loadPromiseRef.current = promise;
    return promise;
  }, [pushToast]);

  useEffect(() => {
    loadProfile().catch(() => {
      /* błąd obsłużony w loadProfile */
    });
  }, [loadProfile]);

  const handleEmailChange = useCallback((value: string) => {
    setEmail(value);
    setFieldError(null);
  }, []);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (pending) {
        return;
      }

      const trimmed = email.trim();
      if (trimmed.length === 0) {
        setFieldError("Wprowadź adres email.");
        return;
      }

      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmed)) {
        setFieldError("Wprowadź poprawny adres email.");
        return;
      }

      const payload: UpdateMeCmd = {
        email: trimmed,
      };

      setPending(true);
      setFormError(null);
      setFieldError(null);

      try {
        const response = await apiPatch<ProfileResponse>("/api/v1/me", payload);
        setEmail(response.profile.email);

        pushToast({
          variant: "success",
          title: "Zapisano profil",
          description: "Adres email został zaktualizowany.",
        });
      } catch (error) {
        const apiError = toApiError(error);

        if (apiError.code === "validation_error") {
          const validationMessage =
            extractFieldError(apiError.details, "email") ?? "Wprowadzone dane są nieprawidłowe.";
          setFieldError(validationMessage);
          return;
        }

        if (apiError.code === "profile_not_found" || apiError.status === 404) {
          setFormError(apiError.message || "Nie znaleziono profilu użytkownika.");
          return;
        }

        setFormError(apiError);

        pushToast({
          variant: "error",
          title: "Nie udało się zapisać profilu",
          description: apiError.message,
        });
      } finally {
        setPending(false);
      }
    },
    [email, pending, pushToast]
  );

  return (
    <section className="space-y-6">
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <header className="space-y-1">
          <h2 className="text-xl font-semibold text-foreground">Dane profilu</h2>
          <p className="text-sm text-muted-foreground">
            Zmień adres email na który będą dostarczane raporty rozliczeń.
          </p>
        </header>

        <form className="mt-6 space-y-4" noValidate onSubmit={handleSubmit}>
          <ErrorAlert error={formError} />

          {propertyLabel ? (
            <div className="space-y-2">
              <div className="text-sm font-medium text-foreground">Nieruchomość</div>
              <p className="rounded-md border border-input bg-muted px-3 py-2 text-sm text-foreground">
                {propertyLabel}
              </p>
              <p className="text-xs text-muted-foreground">
                Nieruchomość przypisana do Twojego profilu. W razie pytań skontaktuj się z administratorem.
              </p>
            </div>
          ) : null}

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="profile-email">
              Adres email
            </label>
            <input
              id="profile-email"
              ref={inputRef}
              className={[
                "w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                fieldError ? "border-destructive focus-visible:ring-destructive/40" : "border-input",
              ].join(" ")}
              type="email"
              value={email}
              onChange={(event) => handleEmailChange(event.target.value)}
              disabled={pending}
              required
              aria-invalid={fieldError ? "true" : undefined}
              aria-describedby={
                fieldError ? "profile-email-error profile-email-description" : "profile-email-description"
              }
              autoComplete="email"
            />
            {fieldError ? (
              <p className="text-sm text-destructive" id="profile-email-error">
                {fieldError}
              </p>
            ) : null}
            <p className="text-xs text-muted-foreground" id="profile-email-description">
              Adres email na który będą dostarczane raporty rozliczeń.
            </p>
          </div>

          <div className="flex justify-end">
            <Button disabled={pending} type="submit">
              {pending ? "Zapisywanie…" : "Zapisz"}
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}

export function ProfileForm(): JSX.Element {
  return (
    <ToastProvider>
      <ProfileFormContent />
    </ToastProvider>
  );
}
