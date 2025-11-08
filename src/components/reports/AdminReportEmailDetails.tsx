import type { JSX } from "react";

import type { ReportEmailAttemptDTO } from "@/types";

interface AdminReportEmailDetailsProps {
  attempt: ReportEmailAttemptDTO | null | undefined;
  reportId: string;
}

const attemptDateFormatter = new Intl.DateTimeFormat("pl-PL", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function AdminReportEmailDetails({ attempt, reportId }: AdminReportEmailDetailsProps): JSX.Element {
  if (!attempt) {
    return (
      <div className="rounded-md border border-dashed border-input bg-background/60 px-3 py-2 text-xs text-muted-foreground">
        Brak zapisanych prób wysyłki dla raportu <span className="font-medium text-foreground">{reportId}</span>.
      </div>
    );
  }

  return (
    <div className="space-y-1 rounded-md border border-input bg-background px-3 py-2 text-xs text-muted-foreground">
      <p>
        <span className="font-medium text-foreground">Raport:</span> {reportId}
      </p>
      <p>
        <span className="font-medium text-foreground">Data próby:</span> {attemptDateFormatter.format(new Date(attempt.attemptedAt))}
      </p>
      <p>
        <span className="font-medium text-foreground">Status:</span> {formatAttemptStatus(attempt.status)}
      </p>
      {attempt.errorMessage ? (
        <p>
          <span className="font-medium text-destructive">Błąd:</span> {attempt.errorMessage}
        </p>
      ) : null}
    </div>
  );
}

function formatAttemptStatus(status: ReportEmailAttemptDTO["status"] | null | undefined): string {
  switch (status) {
    case "success":
      return "Sukces";
    case "retry":
      return "Ponów próbę";
    case "failed":
      return "Błąd";
    default:
      return "Nieznany status";
  }
}

