import type { FormEvent } from "react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

import { ErrorAlert } from "@/components/common/ErrorAlert";
import { ToastProvider, useToast } from "@/components/common/ToastProvider";
import { Button } from "@/components/ui/button";
import type { ApiError } from "@/lib/client/http";
import { apiPost } from "@/lib/client/http";

type FormStatus = "idle" | "pending" | "success" | "error";
type PasswordStrength = "weak" | "medium" | "strong";

interface PasswordValidation {
  hasMinLength: boolean;
  hasUpperCase: boolean;
  hasLowerCase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
}

function validatePassword(password: string): PasswordValidation {
  return {
    hasMinLength: password.length >= 8,
    hasUpperCase: /[A-Z]/.test(password),
    hasLowerCase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecialChar: /[^A-Za-z0-9]/.test(password),
  };
}

function calculatePasswordStrength(validation: PasswordValidation): PasswordStrength {
  const score = Object.values(validation).filter(Boolean).length;
  
  if (score < 3) return "weak";
  if (score < 5) return "medium";
  return "strong";
}

export function ResetPasswordForm(): JSX.Element {
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [status, setStatus] = useState<FormStatus>("idle");
  const [fieldErrors, setFieldErrors] = useState<{ password?: string; passwordConfirm?: string }>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [redirectCountdown, setRedirectCountdown] = useState<number | null>(null);

  const passwordFieldId = useId();
  const passwordConfirmFieldId = useId();
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const passwordConfirmInputRef = useRef<HTMLInputElement>(null);
  const { pushToast } = useToast();

  const isDisabled = status === "pending" || status === "success";

  const validation = useMemo(() => validatePassword(password), [password]);
  const strength = useMemo(() => calculatePasswordStrength(validation), [validation]);

  // Extract token from URL hash on mount
  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get("access_token");
    const type = hashParams.get("type");
    
    if (accessToken && type === "recovery") {
      setToken(accessToken);
    } else {
      setApiError("Link resetowania hasła jest nieprawidłowy lub wygasł.");
      setStatus("error");
    }
  }, []);

  // Countdown and redirect after successful password reset
  useEffect(() => {
    if (redirectCountdown === null) return;
    
    if (redirectCountdown === 0) {
      window.location.href = "/auth/login";
      return;
    }
    
    const timer = setTimeout(() => {
      setRedirectCountdown(redirectCountdown - 1);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [redirectCountdown]);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (status === "pending" || status === "success" || !token) {
        return;
      }

      const form = event.currentTarget;
      const passwordInput = passwordInputRef.current;
      const passwordConfirmInput = passwordConfirmInputRef.current;
      
      if (!passwordInput || !passwordConfirmInput) {
        return;
      }

      setApiError(null);
      setFieldErrors({});

      // Validate password
      passwordInput.setCustomValidity("");
      passwordConfirmInput.setCustomValidity("");

      const newFieldErrors: { password?: string; passwordConfirm?: string } = {};

      if (!password) {
        newFieldErrors.password = "Podaj hasło.";
        passwordInput.setCustomValidity(newFieldErrors.password);
      } else if (!validation.hasMinLength) {
        newFieldErrors.password = "Hasło musi mieć co najmniej 8 znaków.";
        passwordInput.setCustomValidity(newFieldErrors.password);
      } else if (!validation.hasUpperCase || !validation.hasLowerCase || !validation.hasNumber) {
        newFieldErrors.password = "Hasło musi zawierać dużą literę, małą literę i cyfrę.";
        passwordInput.setCustomValidity(newFieldErrors.password);
      }

      if (!passwordConfirm) {
        newFieldErrors.passwordConfirm = "Potwierdź hasło.";
        passwordConfirmInput.setCustomValidity(newFieldErrors.passwordConfirm);
      } else if (password !== passwordConfirm) {
        newFieldErrors.passwordConfirm = "Hasła muszą być identyczne.";
        passwordConfirmInput.setCustomValidity(newFieldErrors.passwordConfirm);
      }

      if (!form.reportValidity() || Object.keys(newFieldErrors).length > 0) {
        setFieldErrors(newFieldErrors);
        setStatus("error");
        
        if (newFieldErrors.password) {
          passwordInput.focus();
          passwordInput.select();
        } else if (newFieldErrors.passwordConfirm) {
          passwordConfirmInput.focus();
          passwordConfirmInput.select();
        }
        return;
      }

      setStatus("pending");

      try {
        await apiPost<{ status: string }>("/api/v1/auth/reset-password", { 
          token,
          password 
        });
        
        setStatus("success");
        setRedirectCountdown(3);
        
        pushToast({
          title: "Hasło zostało zmienione",
          description: "Możesz się teraz zalogować nowym hasłem.",
          variant: "success",
        });
      } catch (error) {
        const normalized = toApiError(error);
        
        if (normalized.status === 400) {
          setApiError("Link resetowania hasła wygasł lub jest nieprawidłowy. Poproś o nowy link.");
        } else if (normalized.status === 422) {
          setFieldErrors({ password: normalized.message });
          passwordInput.focus();
          passwordInput.select();
        } else {
          setApiError(normalized.message);
        }
        
        setStatus("error");
        pushToast({
          title: "Nie udało się zresetować hasła",
          description: normalized.message,
          variant: "error",
        });
      } finally {
        setStatus((previous) => (previous === "pending" ? "idle" : previous));
      }
    },
    [pushToast, status, token, password, passwordConfirm, validation]
  );

  return (
    <form aria-labelledby="reset-password-form-title" className="space-y-4" noValidate onSubmit={handleSubmit}>
      <h2 className="sr-only" id="reset-password-form-title">
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
              Hasło zostało zmienione pomyślnie!
            </p>
            <p className="mt-2 text-emerald-700">
              Za {redirectCountdown} sekundy zostaniesz przekierowany do strony logowania.
            </p>
          </div>

          <Button asChild className="w-full">
            <a href="/auth/login">Przejdź do logowania</a>
          </Button>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor={passwordFieldId}>
              Nowe hasło
            </label>
            <input
              ref={passwordInputRef}
              aria-describedby={`${passwordFieldId}-hint`}
              aria-invalid={fieldErrors.password ? true : undefined}
              autoComplete="new-password"
              className={buildInputClasses(Boolean(fieldErrors.password))}
              disabled={isDisabled}
              id={passwordFieldId}
              name="password"
              onChange={(event) => {
                setPassword(event.target.value);
                passwordInputRef.current?.setCustomValidity("");
                if (fieldErrors.password) {
                  setFieldErrors((prev) => ({ ...prev, password: undefined }));
                }
                if (apiError) {
                  setApiError(null);
                }
                if (status !== "idle" && status !== "pending") {
                  setStatus("idle");
                }
              }}
              placeholder="Wprowadź nowe hasło"
              required
              type="password"
              value={password}
            />
            {fieldErrors.password ? (
              <p className="text-sm text-destructive" id={`${passwordFieldId}-error`}>
                {fieldErrors.password}
              </p>
            ) : (
              <div className="space-y-2" id={`${passwordFieldId}-hint`}>
                <p className="text-sm text-muted-foreground">
                  Hasło musi spełniać następujące wymagania:
                </p>
                <ul className="space-y-1 text-xs">
                  <li className={validation.hasMinLength ? "text-emerald-600" : "text-muted-foreground"}>
                    {validation.hasMinLength ? "✓" : "○"} Co najmniej 8 znaków
                  </li>
                  <li className={validation.hasUpperCase ? "text-emerald-600" : "text-muted-foreground"}>
                    {validation.hasUpperCase ? "✓" : "○"} Jedna duża litera
                  </li>
                  <li className={validation.hasLowerCase ? "text-emerald-600" : "text-muted-foreground"}>
                    {validation.hasLowerCase ? "✓" : "○"} Jedna mała litera
                  </li>
                  <li className={validation.hasNumber ? "text-emerald-600" : "text-muted-foreground"}>
                    {validation.hasNumber ? "✓" : "○"} Jedna cyfra
                  </li>
                  <li className={validation.hasSpecialChar ? "text-emerald-600" : "text-muted-foreground"}>
                    {validation.hasSpecialChar ? "✓" : "○"} Znak specjalny (zalecane)
                  </li>
                </ul>
              </div>
            )}
            
            {password && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Siła hasła:</span>
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      strength === "weak"
                        ? "w-1/3 bg-destructive"
                        : strength === "medium"
                        ? "w-2/3 bg-amber-500"
                        : "w-full bg-emerald-500"
                    }`}
                  />
                </div>
                <span
                  className={`text-xs font-medium ${
                    strength === "weak"
                      ? "text-destructive"
                      : strength === "medium"
                      ? "text-amber-600"
                      : "text-emerald-600"
                  }`}
                >
                  {strength === "weak" ? "Słabe" : strength === "medium" ? "Średnie" : "Silne"}
                </span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor={passwordConfirmFieldId}>
              Potwierdź hasło
            </label>
            <input
              ref={passwordConfirmInputRef}
              aria-invalid={fieldErrors.passwordConfirm ? true : undefined}
              autoComplete="new-password"
              className={buildInputClasses(Boolean(fieldErrors.passwordConfirm))}
              disabled={isDisabled}
              id={passwordConfirmFieldId}
              name="passwordConfirm"
              onChange={(event) => {
                setPasswordConfirm(event.target.value);
                passwordConfirmInputRef.current?.setCustomValidity("");
                if (fieldErrors.passwordConfirm) {
                  setFieldErrors((prev) => ({ ...prev, passwordConfirm: undefined }));
                }
                if (apiError) {
                  setApiError(null);
                }
                if (status !== "idle" && status !== "pending") {
                  setStatus("idle");
                }
              }}
              placeholder="Wprowadź hasło ponownie"
              required
              type="password"
              value={passwordConfirm}
            />
            {fieldErrors.passwordConfirm && (
              <p className="text-sm text-destructive" id={`${passwordConfirmFieldId}-error`}>
                {fieldErrors.passwordConfirm}
              </p>
            )}
          </div>

          <div className="space-y-3">
            <Button className="w-full" disabled={isDisabled || !token} type="submit">
              {isDisabled ? "Resetowanie..." : "Zresetuj hasło"}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              <a
                className="text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-ring/60 rounded-sm px-1"
                href="/auth/login"
              >
                Wróć do logowania
              </a>
            </div>
          </div>
        </>
      )}
    </form>
  );
}

export function ResetPasswordView(): JSX.Element {
  return (
    <ToastProvider>
      <ResetPasswordForm />
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

