import type { FormEvent } from "react";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { ErrorAlert } from "@/components/common/ErrorAlert";
import { ToastProvider, useToast } from "@/components/common/ToastProvider";
import { Button } from "@/components/ui/button";
import type { ApiError } from "@/lib/client/http";
import { apiPost } from "@/lib/client/http";

type FormStatus = "idle" | "pending" | "success" | "error";
type AuthMethod = "magic-link" | "password";

export function LoginForm(): JSX.Element {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMethod, setAuthMethod] = useState<AuthMethod>("magic-link");
  const [status, setStatus] = useState<FormStatus>("idle");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const emailFieldId = useId();
  const passwordFieldId = useId();
  const statusMessageId = useId();
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const { pushToast } = useToast();

  const isDisabled = status === "pending";

  // Load saved auth method from localStorage on mount
  useEffect(() => {
    const savedMethod = localStorage.getItem("auth-method");
    if (savedMethod === "password" || savedMethod === "magic-link") {
      setAuthMethod(savedMethod);
    }
  }, []);

  // Save auth method to localStorage when it changes
  const toggleAuthMethod = useCallback(() => {
    const newMethod = authMethod === "magic-link" ? "password" : "magic-link";
    setAuthMethod(newMethod);
    localStorage.setItem("auth-method", newMethod);
    setFieldError(null);
    setApiError(null);
    setSuccessMessage(null);
  }, [authMethod]);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (status === "pending") {
        return;
      }

      const form = event.currentTarget;
      const emailInput = emailInputRef.current;
      const passwordInput = passwordInputRef.current;
      
      if (!emailInput) {
        return;
      }

      setApiError(null);
      setSuccessMessage(null);
      setFieldError(null);

      const trimmedEmail = emailInput.value.trim();
      emailInput.value = trimmedEmail;
      setEmail(trimmedEmail);

      // Validate email
      emailInput.setCustomValidity("");
      if (!trimmedEmail) {
        emailInput.setCustomValidity("Podaj adres e-mail.");
      }

      // Validate password if using password method
      if (authMethod === "password" && passwordInput) {
        passwordInput.setCustomValidity("");
        if (!passwordInput.value) {
          passwordInput.setCustomValidity("Podaj hasło.");
        }
      }

      if (!form.reportValidity()) {
        const message = emailInput.validationMessage || passwordInput?.validationMessage || "Popraw błędy w formularzu.";
        setFieldError(message);
        setStatus("error");
        
        if (emailInput.validationMessage) {
          emailInput.focus();
          emailInput.select();
        } else if (passwordInput?.validationMessage) {
          passwordInput.focus();
          passwordInput.select();
        }
        return;
      }

      setStatus("pending");

      try {
        if (authMethod === "magic-link") {
          // Magic link flow
          await apiPost<{ status: string }>("/api/v1/auth/magic-link", { email: trimmedEmail });
          setStatus("success");
          setSuccessMessage("Jeśli konto istnieje, wysłaliśmy link logowania na wskazany adres.");
        } else {
          // Password flow
          const response = await apiPost<{ 
            user: { id: string; email: string; displayName: string | null };
            role: string;
            propertyId: string | null;
          }>("/api/v1/auth/sign-in", { 
            email: trimmedEmail,
            password: passwordInput?.value || ""
          });
          
          // Redirect to role-based landing page
          const destination = response.role === "admin" ? "/admin/properties" : "/app/readings/add";
          window.location.href = destination;
        }
      } catch (error) {
        const normalized = toApiError(error);
        
        if (normalized.status === 401) {
          setFieldError("Nieprawidłowy email lub hasło.");
          if (passwordInput) {
            passwordInput.focus();
            passwordInput.select();
          } else {
            emailInput.focus();
            emailInput.select();
          }
          setStatus("error");
          return;
        }
        
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
          title: authMethod === "magic-link" ? "Nie udało się wysłać linku" : "Nie udało się zalogować",
          description: normalized.message,
          variant: "error",
        });
      } finally {
        setStatus((previous) => (previous === "pending" ? "idle" : previous));
      }
    },
    [pushToast, status, authMethod]
  );

  const describedById = fieldError ? `${emailFieldId}-error` : `${emailFieldId}-hint`;

  return (
    <form aria-labelledby="login-form-title" className="space-y-4" noValidate onSubmit={handleSubmit}>
      <h2 className="sr-only" id="login-form-title">
        Formularz logowania
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
            if (successMessage) {
              setSuccessMessage(null);
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
            {authMethod === "magic-link" 
              ? "Na ten adres wyślemy wiadomość z linkiem logowania."
              : "Adres e-mail użyty do rejestracji konta."}
          </p>
        )}
      </div>

      {authMethod === "password" && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground" htmlFor={passwordFieldId}>
            Hasło
          </label>
          <input
            ref={passwordInputRef}
            aria-invalid={fieldError ? true : undefined}
            autoComplete="current-password"
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
            placeholder="Wprowadź hasło"
            required
            type="password"
            value={password}
          />
          <div className="flex items-center justify-end">
            <a 
              className="text-sm text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-ring/60 rounded-sm px-1" 
              href="/auth/forgot-password"
            >
              Zapomniałeś hasła?
            </a>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <Button className="w-full" disabled={isDisabled} type="submit">
          {isDisabled 
            ? (authMethod === "magic-link" ? "Wysyłanie..." : "Logowanie...")
            : (authMethod === "magic-link" ? "Wyślij link logowania" : "Zaloguj się")}
        </Button>

        <div className="text-center">
          <button
            className="text-sm text-muted-foreground hover:text-foreground transition focus:outline-none focus:ring-2 focus:ring-ring/60 rounded-sm px-2 py-1"
            disabled={isDisabled}
            onClick={toggleAuthMethod}
            type="button"
          >
            {authMethod === "magic-link" ? "Zaloguj się hasłem" : "Wyślij link logowania"}
          </button>
        </div>

        <div aria-live="polite" className="min-h-[1.5rem] text-sm text-emerald-700" id={statusMessageId} role="status">
          {successMessage ? (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
              {successMessage}
            </div>
          ) : null}
        </div>

        <div className="pt-2 text-center text-sm text-muted-foreground">
          Nie masz konta?{" "}
          <a className="text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-ring/60 rounded-sm px-1" href="/auth/register">
            Zarejestruj się
          </a>
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
