import type { FormEvent } from "react";
import { useCallback, useId, useRef, useState } from "react";

import { ErrorAlert } from "@/components/common/ErrorAlert";
import { ToastProvider, useToast } from "@/components/common/ToastProvider";
import { Button } from "@/components/ui/button";
import type { ApiError } from "@/lib/client/http";
import { apiPost } from "@/lib/client/http";

type FormStatus = "idle" | "pending" | "success" | "error";

export function ForgotPasswordForm(): JSX.Element {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<FormStatus>("idle");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const emailFieldId = useId();
  const statusMessageId = useId();
  const emailInputRef = useRef<HTMLInputElement>(null);
  const { pushToast } = useToast();

  const isDisabled = status === "pending" || status === "success";

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (status === "pending" || status === "success") {
        return;
      }

      const form = event.currentTarget;
      const emailInput = emailInputRef.current;
      if (!emailInput) {
        return;
      }

      setApiError(null);
      setFieldError(null);

      const trimmed = emailInput.value.trim();
      emailInput.value = trimmed;
      setEmail(trimmed);

      emailInput.setCustomValidity("");
      if (!trimmed) {
        emailInput.setCustomValidity("Podaj adres e-mail.");
      }

      if (!form.reportValidity()) {
        const message = emailInput.validationMessage || "Podaj poprawny adres e-mail.";
        setFieldError(message);
        setStatus("error");
        emailInput.focus();
        emailInput.select();
        return;
      }

      setStatus("pending");

      try {
        await apiPost<{ status: string }>("/api/v1/auth/recover-password", { email: trimmed });
        setStatus("success");
      } catch (error) {
        const normalized = toApiError(error);
        
        if (normalized.status === 400 || normalized.status === 422) {
          setFieldError(normalized.message);
          emailInput.focus();
          emailInput.select();
          setStatus("error");
          return;
        }

        setApiError(normalized.message);
        setStatus("error");
        pushToast({
          title: "Nie udało się wysłać linku",
          description: normalized.message,
          variant: "error",
        });
      } finally {
        setStatus((previous) => (previous === "pending" ? "success" : previous));
      }
    },
    [pushToast, status]
  );

  const describedById = fieldError ? `${emailFieldId}-error` : `${emailFieldId}-hint`;

  return (
    <form aria-labelledby="forgot-password-form-title" className="space-y-4" noValidate onSubmit={handleSubmit}>
      <h2 className="sr-only" id="forgot-password-form-title">
        Formularz resetowania hasła
      </h2>

      <ErrorAlert error={apiError} />

      {status === "success" ? (
        <div className="space-y-4">
          <div
            aria-live="polite"
            className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm"
            role="status"
          >
            <p className="font-medium text-emerald-800">
              Jeśli konto istnieje, wysłaliśmy instrukcje resetowania hasła.
            </p>
            <p className="mt-2 text-emerald-700">
              Sprawdź swoją skrzynkę e-mail i kliknij w link, aby zresetować hasło.
            </p>
          </div>

          <Button asChild className="w-full" variant="outline">
            <a href="/auth/login">Wróć do logowania</a>
          </Button>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor={emailFieldId}>
              Adres e-mail
            </label>
            <input
              ref={emailInputRef}
              aria-describedby={describedById}
              aria-invalid={fieldError ? true : undefined}
              autoComplete="email"
              className={buildInputClasses(Boolean(fieldError))}
              disabled={isDisabled}
              id={emailFieldId}
              inputMode="email"
              name="email"
              onChange={(event) => {
                setEmail(event.target.value);
                emailInputRef.current?.setCustomValidity("");
                if (fieldError) {
                  setFieldError(null);
                }
                if (apiError) {
                  setApiError(null);
                }
                if (status !== "idle" && status !== "pending") {
                  setStatus("idle");
                }
              }}
              placeholder="nazwa@przyklad.pl"
              required
              type="email"
              value={email}
            />
            {fieldError ? (
              <p className="text-sm text-destructive" id={`${emailFieldId}-error`}>
                {fieldError}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground" id={`${emailFieldId}-hint`}>
                Wyślemy link do resetowania hasła na ten adres.
              </p>
            )}
          </div>

          <div className="space-y-3">
            <Button className="w-full" disabled={isDisabled} type="submit">
              {isDisabled ? "Wysyłanie..." : "Wyślij link resetowania hasła"}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              Pamiętasz hasło?{" "}
              <a
                className="text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-ring/60 rounded-sm px-1"
                href="/auth/login"
              >
                Zaloguj się
              </a>
            </div>
          </div>
        </>
      )}
    </form>
  );
}

export function ForgotPasswordView(): JSX.Element {
  return (
    <ToastProvider>
      <ForgotPasswordForm />
    </ToastProvider>
  );
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

function buildInputClasses(hasError: boolean): string {
  return [
    "flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm transition",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
    hasError ? "border-destructive focus-visible:ring-destructive/40" : "border-input",
  ].join(" ");
}

