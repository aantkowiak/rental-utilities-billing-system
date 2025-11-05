import type { APIRoute } from "astro";

import { requireAuth } from "@/lib/api/auth";
import { errorResponse } from "@/lib/errors";

interface TriggerBody {
  taskName?: string;
  payload?: Record<string, unknown>;
}

const SERVICE_ROLE_HEADER = "x-service-role-key";

export const POST: APIRoute = async ({ request, url, locals }) => {
  const auth = await requireAuth(request, locals, { requireAdmin: true });
  if (!auth.success) {
    return auth.response;
  }

  let body: TriggerBody;
  try {
    body = (await request.json()) as TriggerBody;
  } catch {
    return errorResponse(400, "invalid_json", "Malformed JSON in request body");
  }

  const taskName = body.taskName?.trim();
  if (!taskName) {
    return errorResponse(400, "validation_error", "taskName is required");
  }

  const serviceKey = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return errorResponse(500, "config_error", "Service role key is not configured");
  }

  try {
    const target = new URL(`/api/v1/_tasks/run/${encodeURIComponent(taskName)}`, url.origin);

    const res = await fetch(target.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [SERVICE_ROLE_HEADER]: serviceKey,
      },
      body: JSON.stringify(body.payload ?? {}),
    });

    const text = await res.text();
    return new Response(text, {
      status: res.status,
      headers: { "Content-Type": res.headers.get("content-type") ?? "application/json" },
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[POST /v1/tasks/trigger] Unexpected error", error);
    return errorResponse(500, "internal_error", "Failed to forward task trigger");
  }
};


