import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";

import { ErrorAlert } from "@/components/common/ErrorAlert";
import { ToastProvider, useToast } from "@/components/common/ToastProvider";
import { Button } from "@/components/ui/button";
import { apiPatch, type ApiError } from "@/lib/client/http";
import type { ProfileDTO, UpdateMeCmd } from "@/types";

interface ProfileResponse {
  profile: ProfileDTO;
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

function extractDisplayNameError(details: unknown): string | null {
  if (!details || typeof details !== "object") {
    return null;
  }

  const displayName = (details as Record<string, unknown>).displayName;
  if (typeof displayName === "string") {
    return displayName;
  }

  if (Array.isArray(displayName)) {
    const [first] = displayName;
    return typeof first === "string" ? first : null;
  }

  return null;
}

function ProfileFormContent(): JSX.Element {
  const { pushToast } = useToast();

  const [displayName, setDisplayName] = useState("");
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<ApiError | string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (fieldError) {
      inputRef.current?.focus();
    }
  }, [fieldError]);

  const handleDisplayNameChange = useCallback((value: string) => {
    setDisplayName(value);
    setFieldError(null);
  }, []);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (pending) {
        return;
      }

      const trimmed = displayName.trim();
      if (trimmed.length === 0) {
        setFieldError("Wprowadź nazwę wyświetlaną.");
        return;
      }

      if (trimmed.length < 3) {
        setFieldError("Nazwa powinna mieć co najmniej 3 znaki.");
        return;
      }

      const payload: UpdateMeCmd = {
        displayName: trimmed,
      };

      setPending(true);
      setFormError(null);
      setFieldError(null);

      try {
        const response = await apiPatch<ProfileResponse>("/api/v1/me", payload);
        setDisplayName(response.profile.displayName ?? trimmed);

        pushToast({
          variant: "success",
          title: "Zapisano profil",
          description: "Nazwa wyświetlana została zaktualizowana.",
        });
      } catch (error) {
        const apiError = toApiError(error);

        if (apiError.code === "validation_error") {
          const validationMessage = extractDisplayNameError(apiError.details) ?? "Wprowadzone dane są nieprawidłowe.";
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
    [displayName, pending, pushToast]
  );

  return (
    <section className="space-y-6">
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <header className="space-y-1">
          <h2 className="text-xl font-semibold text-foreground">Dane profilu</h2>
          <p className="text-sm text-muted-foreground">
            Zmień nazwę wyświetlaną, która pojawia się w wysyłanych raportach i panelu administratora.
          </p>
        </header>

        <form className="mt-6 space-y-4" noValidate onSubmit={handleSubmit}>
          <ErrorAlert error={formError} />

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="admin-profile-display-name">
              Nazwa wyświetlana
            </label>
            <input
              id="admin-profile-display-name"
              ref={inputRef}
              className={[
                "w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                fieldError ? "border-destructive focus-visible:ring-destructive/40" : "border-input",
              ].join(" ")}
              type="text"
              value={displayName}
              onChange={(event) => handleDisplayNameChange(event.target.value)}
              disabled={pending}
              minLength={3}
              required
              aria-invalid={fieldError ? "true" : undefined}
              aria-describedby={fieldError ? "admin-profile-display-name-error" : undefined}
              autoComplete="name"
            />
            {fieldError ? (
              <p className="text-sm text-destructive" id="admin-profile-display-name-error">
                {fieldError}
              </p>
            ) : null}
            <p className="text-xs text-muted-foreground">
              Nazwa będzie widoczna w e-mailach i raportach wysyłanych do najemców.
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
