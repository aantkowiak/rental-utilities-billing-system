import { useCallback, useState, type ReactElement } from "react";

import { ErrorAlert } from "@/components/common/ErrorAlert";
import { Button } from "@/components/ui/button";
import { apiPatch, type ApiError } from "@/lib/client/http";
import type { ReportDTO } from "@/types";

interface ReportSentToggleProps {
  report: ReportDTO;
  onSuccess?: (updatedReport: ReportDTO) => void;
}

function toApiError(error: unknown): ApiError {
  if (error && typeof error === "object" && "code" in error && "message" in error) {
    return error as ApiError;
  }

  return {
    code: "unexpected_error",
    message: error instanceof Error ? error.message : "Nie udało się zaktualizować statusu wysłania.",
  };
}

/**
 * Toggle for admin to mark report as sent/not sent.
 */
export function ReportSentToggle({ report, onSuccess }: ReportSentToggleProps): ReactElement {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<ApiError | string | null>(null);

  const handleToggle = useCallback(async () => {
    if (pending) {
      return;
    }

    setPending(true);
    setError(null);

    try {
      const response = await apiPatch<{ report: ReportDTO }>(`/api/v1/reports/${report.id}/sent`, {
        sent: !report.sent,
      });

      onSuccess?.(response.report);
    } catch (err) {
      const apiError = toApiError(err);
      setError(apiError);
    } finally {
      setPending(false);
    }
  }, [onSuccess, pending, report.id, report.sent]);

  return (
    <section aria-label="Status wysłania raportu" className="rounded-lg border bg-card p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Status wysłania</h3>
          <p className="text-sm text-muted-foreground">
            {report.sent ? "Raport został wysłany do najemcy." : "Raport nie został jeszcze wysłany."}
          </p>
        </div>

        <Button variant={report.sent ? "outline" : "default"} disabled={pending} onClick={handleToggle}>
          {pending ? "Zapisywanie…" : report.sent ? "Oznacz jako niewysłany" : "Oznacz jako wysłany"}
        </Button>
      </div>

      {error && (
        <div className="mt-4">
          <ErrorAlert error={error} />
        </div>
      )}
    </section>
  );
}

