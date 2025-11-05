export interface ApiError {
  code: string;
  message: string;
}

export async function apiGet<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, method: "GET", headers: { "Content-Type": "application/json", ...(init?.headers || {}) } });
  const json = await res.json();
  if (!res.ok && json?.error) throw json.error as ApiError;
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
  if (!res.ok && json?.error) throw json.error as ApiError;
  return json as T;
}
