import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactElement } from "react";

import { ErrorAlert } from "@/components/common/ErrorAlert";
import { ToastProvider, useToast } from "@/components/common/ToastProvider";
import { Button } from "@/components/ui/button";
import { apiPost, type ApiError } from "@/lib/client/http";

interface AnchorRecalcPanelProps {
  propertyId?: string | null;
  propertyLabel?: string | null;
  defaultMonth?: string | null;
  disabled?: boolean;
  onSuccess?: () => void;
  onPendingChange?: (pending: boolean) => void;
}

interface InternalPanelProps extends AnchorRecalcPanelProps {
  useOwnProvider?: boolean;
}

function toApiError(error: unknown): ApiError {
  if (error && typeof error === "object" && "code" in error && "message" in error) {
    return error as ApiError;
  }

  return {
    code: "unexpected_error",
    message: error instanceof Error ? error.message : "Nie udało się zainicjować przeliczenia kotwic.",
  };
}

function resolveInitialMonth(month?: string | null): string {
  if (month && /^\d{4}-\d{2}$/.test(month)) {
    return month;
  }
  const now = new Date();
  return `${now.getFullYear()}-${`${now.getMonth() + 1}`.padStart(2, "0")}`;
}

function AnchorRecalcPanelInner({
  propertyId,
  propertyLabel,
  defaultMonth,
  disabled,
  onSuccess,
  onPendingChange,
}: AnchorRecalcPanelProps): ReactElement {
  const { pushToast } = useToast();
  const [fromMonth, setFromMonth] = useState<string>(() => resolveInitialMonth(defaultMonth));
  const [toMonth, setToMonth] = useState<string>(() => resolveInitialMonth(defaultMonth));
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<ApiError | string | null>(null);

  useEffect(() => {
    if (defaultMonth && /^\d{4}-\d{2}$/.test(defaultMonth)) {
      setFromMonth(defaultMonth);
      setToMonth(defaultMonth);
    }
  }, [defaultMonth]);

  const isSubmitDisabled = useMemo(() => {
    return pending || disabled || !propertyId;
  }, [disabled, pending, propertyId]);

  useEffect(() => {
    onPendingChange?.(pending);
  }, [onPendingChange, pending]);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (isSubmitDisabled) {
        return;
      }

      if (!propertyId) {
        setFormError("Wybierz nieruchomość, aby przeliczyć kotwice.");
        return;
      }

      if (!fromMonth || !/^\d{4}-\d{2}$/.test(fromMonth)) {
        setFormError("Podaj prawidłowy miesiąc początkowy (RRRR-MM).");
        return;
      }

      if (!toMonth || !/^\d{4}-\d{2}$/.test(toMonth)) {
        setFormError("Podaj prawidłowy miesiąc końcowy (RRRR-MM).");
        return;
      }

      setPending(true);
      setFormError(null);

      try {
        await apiPost("/api/v1/readings/recalculate-anchors", {
          propertyId,
          fromMonth,
          toMonth,
        });

        pushToast({
          variant: "success",
          title: "Rekalkulacja zaplanowana",
          description: `Kotwice zostaną ponownie przeliczone w zakresie ${fromMonth}–${toMonth}.`,
        });
        onSuccess?.();
      } catch (error) {
        const apiError = toApiError(error);
        setFormError(apiError);
      } finally {
        setPending(false);
      }
    },
    [fromMonth, isSubmitDisabled, onSuccess, propertyId, pushToast, toMonth]
  );

  return (
    <section aria-label="Przeliczanie kotwic" className="rounded-lg border bg-card p-6 shadow-sm">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Ponowne przeliczenie kotwic</h2>
          <p className="text-sm text-muted-foreground">
            Zaplanuj zadanie przeliczenia kotwic w zadanym zakresie miesięcy. Operacja jest asynchroniczna.
          </p>
        </div>
      </div>

      <form className="mt-4 space-y-4" noValidate onSubmit={handleSubmit}>
        <ErrorAlert error={formError} />

        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="anchor-recalc-property">
              Nieruchomość
            </label>
            <input
              className="w-full cursor-not-allowed rounded-md border border-input bg-muted px-3 py-2 text-sm shadow-sm"
              id="anchor-recalc-property"
              value={propertyLabel ?? ""}
              readOnly
              placeholder="Wybierz nieruchomość w filtrach"
            />
            <p className="text-xs text-muted-foreground">Nieruchomość pobierana jest z bieżących filtrów.</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="anchor-recalc-from">
              Od miesiąca
            </label>
            <input
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
              id="anchor-recalc-from"
              type="month"
              value={fromMonth}
              disabled={isSubmitDisabled}
              onChange={(event) => setFromMonth(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="anchor-recalc-to">
              Do miesiąca
            </label>
            <input
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
              id="anchor-recalc-to"
              type="month"
              value={toMonth}
              disabled={isSubmitDisabled}
              onChange={(event) => setToMonth(event.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button disabled={isSubmitDisabled} type="submit">
            {pending ? "Planowanie…" : "Zaplanuj przeliczenie"}
          </Button>
        </div>
      </form>
    </section>
  );
}

export function AnchorRecalcPanel(props: InternalPanelProps): ReactElement {
  if (props.useOwnProvider) {
    return (
      <ToastProvider>
        <AnchorRecalcPanelInner {...props} />
      </ToastProvider>
    );
  }

  return <AnchorRecalcPanelInner {...props} />;
}
