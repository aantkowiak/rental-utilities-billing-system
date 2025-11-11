import type { ApiError } from "@/lib/client/http";

interface ErrorAlertProps {
  error?: ApiError | string | null;
}

export function ErrorAlert({ error }: ErrorAlertProps): JSX.Element | null {
  if (!error) return null;
  const message = typeof error === "string" ? error : error.message;
  const code = typeof error === "string" ? undefined : error.code;
  return (
    <div
      className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
      role="alert"
    >
      <span className="flex items-start gap-2">
        {code ? <span className="font-semibold uppercase tracking-wide">{code}</span> : null}
        <span className="font-medium text-destructive">{message}</span>
      </span>
    </div>
  );
}
