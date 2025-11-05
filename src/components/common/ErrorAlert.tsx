import type { ApiError } from "@/lib/client/http";

interface ErrorAlertProps {
  error?: ApiError | string | null;
}

export function ErrorAlert({ error }: ErrorAlertProps): JSX.Element | null {
  if (!error) return null;
  const message = typeof error === "string" ? error : error.message;
  const code = typeof error === "string" ? undefined : error.code;
  return (
    <div role="alert" style={{ background: "#fdecea", color: "#b71c1c", padding: "0.5rem", borderRadius: 4 }}>
      {code ? `[${code}] ` : null}
      {message}
    </div>
  );
}


