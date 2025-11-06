import type { FormEvent } from "react";
import { useCallback, useId, useRef, useState } from "react";

import { ErrorAlert } from "@/components/common/ErrorAlert";
import { ToastProvider, useToast } from "@/components/common/ToastProvider";
import { Button } from "@/components/ui/button";
import type { ApiError } from "@/lib/client/http";
import { apiPost } from "@/lib/client/http";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

export function LoginForm(): JSX.Element {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<ApiError | string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const emailFieldId = useId();
  const statusMessageId = useId();
  const emailInputRef = useRef<HTMLInputElement>(null);
  const { pushToast } = useToast();

  const validateEmail = useCallback((value: string): string | null => {
    if (!value) {
      return "Podaj adres e-mail.";
    }

    if (!EMAIL_PATTERN.test(value)) {
      return "Podaj poprawny adres e-mail.";
    }

    return null;
  }, []);

  const focusEmailField = useCallback(() => {
    if (emailInputRef.current) {
      emailInputRef.current.focus();
      emailInputRef.current.select();
    }
  }, []);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (pending) return;

      const trimmedEmail = email.trim();
      const validationError = validateEmail(trimmedEmail);

      setFormError(null);
      setSuccessMessage(null);

      if (validationError) {
        setFieldError(validationError);
        focusEmailField();
        return;
      }

      setFieldError(null);
      setPending(true);

      try {
        await apiPost<{ status: string }>("/api/v1/auth/magic-link", { email: trimmedEmail });
        setSuccessMessage("Jeśli konto istnieje, wysłaliśmy link logowania na wskazany adres.");
        setEmail(trimmedEmail);
      } catch (error) {
        if (isApiError(error)) {
          if (error.status === 400 || error.status === 422) {
            setFieldError(error.message);
            focusEmailField();
            return;
          }

          setFormError(error);
          focusEmailField();
          return;
        }

        pushToast({
          title: "Nie udało się wysłać linku",
          description: "Spróbuj ponownie za chwilę.",
          variant: "error",
        });
      } finally {
        setPending(false);
      }
    },
    [email, focusEmailField, pending, pushToast, validateEmail]
  );

  const describedById = fieldError ? `${emailFieldId}-error` : `${emailFieldId}-hint`;

  return (
    <form aria-labelledby="login-form-title" className="space-y-6" noValidate onSubmit={handleSubmit}>
      <h2 className="sr-only" id="login-form-title">
        Formularz logowania
      </h2>

      <ErrorAlert error={formError} />

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
          disabled={pending}
          id={emailFieldId}
          inputMode="email"
          name="email"
          onChange={(event) => {
            setEmail(event.target.value);
            if (fieldError) {
              setFieldError(null);
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
            Na ten adres wyślemy wiadomość z linkiem logowania.
          </p>
        )}
      </div>

      <div className="space-y-3">
        <Button className="w-full" disabled={pending} type="submit">
          {pending ? "Wysyłanie..." : "Wyślij link logowania"}
        </Button>

        <div
          aria-live="polite"
          className="min-h-[1.5rem] text-sm text-emerald-700"
          id={statusMessageId}
          role="status"
        >
          {successMessage ? (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
              {successMessage}
            </div>
          ) : null}
        </div>
      </div>
    </form>
  );
}

export function LoginView(): JSX.Element {
  return (
    <ToastProvider>
      <LoginForm />
    </ToastProvider>
  );
}

function isApiError(error: unknown): error is ApiError {
  if (!error || typeof error !== "object") {
    return false;
  }

  return "code" in error && "message" in error;
}

function buildInputClasses(hasError: boolean): string {
  return [
    "flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm transition",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
    hasError ? "border-destructive focus-visible:ring-destructive/40" : "border-input",
  ].join(" ");
}

