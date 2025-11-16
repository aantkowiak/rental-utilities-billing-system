import type { FormEvent } from "react";
import { useCallback, useId, useRef, useState } from "react";

import { ErrorAlert } from "@/components/common/ErrorAlert";
import { ToastProvider, useToast } from "@/components/common/ToastProvider";
import { Button } from "@/components/ui/button";
import type { ApiError } from "@/lib/client/http";
import { apiPost } from "@/lib/client/http";

type FormStatus = "idle" | "pending" | "success" | "error";

export function RegistrationForm(): JSX.Element {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<FormStatus>("idle");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const emailFieldId = useId();
  const passwordFieldId = useId();
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const { pushToast } = useToast();

  const isDisabled = status === "pending" || showSuccess;

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (status === "pending" || showSuccess) {
        return;
      }

      const form = event.currentTarget;
      const emailInput = emailInputRef.current;
      const passwordInput = passwordInputRef.current;

      if (!emailInput || !passwordInput) {
        return;
      }

      setApiError(null);
      setFieldError(null);

      const trimmedEmail = emailInput.value.trim();
      emailInput.value = trimmedEmail;
      setEmail(trimmedEmail);

      // Validate email
      emailInput.setCustomValidity("");
      if (!trimmedEmail) {
        emailInput.setCustomValidity("Podaj adres e-mail.");
      }

      // Validate password
      passwordInput.setCustomValidity("");
      if (!passwordInput.value) {
        passwordInput.setCustomValidity("Podaj hasło.");
      } else if (passwordInput.value.length < 8) {
        passwordInput.setCustomValidity("Hasło musi mieć co najmniej 8 znaków.");
      }

      if (!form.reportValidity()) {
        const message = emailInput.validationMessage || passwordInput.validationMessage || "Popraw błędy w formularzu.";
        setFieldError(message);
        setStatus("error");

        if (emailInput.validationMessage) {
          emailInput.focus();
          emailInput.select();
        } else if (passwordInput.validationMessage) {
          passwordInput.focus();
          passwordInput.select();
        }
        return;
      }

      setStatus("pending");

      try {
        const response = await apiPost<{
          success: boolean;
          requiresEmailConfirmation: boolean;
          message: string;
        }>("/api/v1/auth/sign-up", {
          email: trimmedEmail,
          password: passwordInput.value,
        });

        setShowSuccess(true);
        setStatus("success");

        pushToast({
          title: "Rejestracja zakończona",
          description: response.message,
          variant: "success",
        });
      } catch (error) {
        const normalized = toApiError(error);

        if (normalized.status === 409) {
          setFieldError("Użytkownik z tym adresem email już istnieje.");
          emailInput.focus();
          emailInput.select();
          setStatus("error");
          return;
        }

        if (normalized.status === 400 || normalized.status === 422) {
          setFieldError(normalized.message);
          if (normalized.message.includes("Hasło")) {
            passwordInput.focus();
            passwordInput.select();
          } else {
            emailInput.focus();
            emailInput.select();
          }
          setStatus("error");
          return;
        }

        setApiError(normalized.message);
        setStatus("error");
        pushToast({
          title: "Nie udało się zarejestrować",
          description: normalized.message,
          variant: "error",
        });
      } finally {
        setStatus((previous) => (previous === "pending" ? "idle" : previous));
      }
    },
    [pushToast, showSuccess, status]
  );

  if (showSuccess) {
    return (
      <div className="space-y-4">
        <div className="rounded-md border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950 p-4 space-y-3">
          <div className="flex items-start space-x-3">
            <svg
              aria-hidden="true"
              className="size-5 text-green-600 dark:text-green-400 mt-0.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Rejestracja zakończona!</p>
              <p className="text-sm text-muted-foreground mt-1">
                Sprawdź swoją skrzynkę pocztową (<strong>{email}</strong>) i kliknij w link potwierdzający, aby
                aktywować konto.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Po potwierdzeniu adresu email będziesz mógł się zalogować do systemu.
              </p>
            </div>
          </div>
        </div>

        <Button asChild className="w-full">
          <a href="/auth/login">Przejdź do logowania</a>
        </Button>
      </div>
    );
  }

  const describedById = fieldError ? `${emailFieldId}-error` : `${emailFieldId}-hint`;

  return (
    <form aria-labelledby="registration-form-title" className="space-y-4" noValidate onSubmit={handleSubmit}>
      <h2 className="sr-only" id="registration-form-title">
        Formularz rejestracji
      </h2>

      <ErrorAlert error={apiError} />

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
            Wprowadź swój adres e-mail.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground" htmlFor={passwordFieldId}>
          Hasło
        </label>
        <input
          ref={passwordInputRef}
          aria-invalid={fieldError ? true : undefined}
          autoComplete="new-password"
          className={buildInputClasses(Boolean(fieldError))}
          disabled={isDisabled}
          id={passwordFieldId}
          name="password"
          onChange={(event) => {
            setPassword(event.target.value);
            passwordInputRef.current?.setCustomValidity("");
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
          placeholder="Wprowadź hasło (min. 8 znaków)"
          required
          type="password"
          value={password}
        />
        <p className="text-sm text-muted-foreground">Hasło musi mieć co najmniej 8 znaków.</p>
      </div>

      <div className="space-y-3">
        <Button className="w-full" disabled={isDisabled} type="submit">
          {isDisabled ? "Rejestracja..." : "Zarejestruj się"}
        </Button>

        <div className="pt-2 text-center text-sm text-muted-foreground">
          Masz już konto?{" "}
          <a
            className="text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-ring/60 rounded-sm px-1"
            href="/auth/login"
          >
            Zaloguj się
          </a>
        </div>
      </div>
    </form>
  );
}

export function RegistrationView(): JSX.Element {
  return (
    <ToastProvider>
      <RegistrationForm />
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
