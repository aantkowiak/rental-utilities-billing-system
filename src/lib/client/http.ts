export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
  status?: number;
}

export async function apiGet<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, method: "GET", headers: { "Content-Type": "application/json", ...(init?.headers || {}) } });
  const json = await res.json();

  if (!res.ok) {
    throw normalizeError(res, json);
  }

  return json as T;
}

export async function apiPost<T>(url: string, body?: unknown, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    method: "POST",
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();

  if (!res.ok) {
    throw normalizeError(res, json);
  }

  return json as T;
}

export async function apiPatch<T>(url: string, body?: unknown, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();

  if (!res.ok) {
    throw normalizeError(res, json);
  }

  return json as T;
}

export async function apiDelete<T = void>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    method: "DELETE",
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });

  // Many DELETE endpoints return 204 No Content
  if (res.status === 204) {
    return undefined as unknown as T;
  }

  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    json = null;
  }

  if (!res.ok) {
    throw normalizeError(res, json);
  }

  return json as T;
}

function normalizeError(response: Response, payload: unknown): ApiError {
  const raw = (payload as { error?: Partial<ApiError> })?.error ?? {};
  const code = typeof raw.code === "string" ? raw.code : "unexpected_error";
  const message =
    typeof raw.message === "string"
      ? raw.message
      : `Request failed with status ${response.status}: ${response.statusText || "unknown error"}`;

  return {
    code,
    message,
    details: raw.details,
    status: response.status,
  };
}
