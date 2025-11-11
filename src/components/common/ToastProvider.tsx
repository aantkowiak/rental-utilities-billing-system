import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type ToastVariant = "info" | "success" | "error";

interface ToastOptions {
  id?: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastRecord extends Required<Omit<ToastOptions, "id" | "variant">> {
  id: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  pushToast: (options: ToastOptions) => string;
  dismissToast: (id: string) => void;
}

const DEFAULT_DURATION = 5000;

const ToastContext = createContext<ToastContextValue | null>(null);
const noopToastContext: ToastContextValue = {
  pushToast: () => "noop-toast",
  dismissToast: () => {
    // no-op fallback when provider is not mounted
  },
};

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps): JSX.Element {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const timersRef = useRef<Map<string, number>>(new Map());

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const pushToast = useCallback(
    ({ id, title, description = "", variant = "info", duration = DEFAULT_DURATION }: ToastOptions): string => {
      const resolvedId = id ?? generateToastId();

      setToasts((current) => {
        const next = current.filter((toast) => toast.id !== resolvedId);
        next.push({
          id: resolvedId,
          title,
          description,
          variant,
        });
        return next;
      });

      if (typeof window !== "undefined") {
        const timeout = window.setTimeout(() => {
          dismissToast(resolvedId);
        }, duration);

        timersRef.current.set(resolvedId, timeout);
      }

      return resolvedId;
    },
    [dismissToast]
  );

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => window.clearTimeout(timer));
      timersRef.current.clear();
    };
  }, []);

  const value = useMemo<ToastContextValue>(() => ({ pushToast, dismissToast }), [pushToast, dismissToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-6 right-6 z-50 flex w-full max-w-sm flex-col gap-3"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              "pointer-events-auto rounded-lg border p-4 shadow-lg",
              toast.variant === "success" && "border-emerald-200 bg-emerald-50 text-emerald-900",
              toast.variant === "error" && "border-red-200 bg-red-50 text-red-900",
              toast.variant === "info" &&
                "border-slate-200 bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100"
            )}
            role="status"
          >
            <div className="flex items-start gap-3">
              <div className="flex-1 space-y-1">
                <p className="font-medium leading-5">{toast.title}</p>
                {toast.description ? (
                  <p className="text-sm leading-5 text-muted-foreground">{toast.description}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                className="inline-flex size-6 items-center justify-center rounded-md border border-transparent text-sm font-medium text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
                aria-label="Zamknij powiadomienie"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = (): ToastContextValue => {
  const context = useContext(ToastContext);
  return context ?? noopToastContext;
};

const generateToastId = (): string => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `toast-${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
};
