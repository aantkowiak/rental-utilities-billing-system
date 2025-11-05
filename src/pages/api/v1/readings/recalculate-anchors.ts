import type { APIRoute } from "astro";

import { requireAuth } from "@/lib/api/auth";
import { errorResponse } from "@/lib/errors";
import { enqueueAnchorRecalculation } from "@/lib/jobs/recalculateAnchors";
import { recalculateAnchorsSchema } from "@/lib/validation/readings";

export const POST: APIRoute = async ({ request, locals }) => {
  const auth = await requireAuth(request, locals, { requireAdmin: true });
  if (!auth.success) {
    return auth.response;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "invalid_json", "Malformed JSON in request body");
  }

  const validation = recalculateAnchorsSchema.safeParse(body);
  if (!validation.success) {
    return errorResponse(400, "validation_error", "Invalid request data", {
      errors: validation.error.format(),
    });
  }

  try {
    await enqueueAnchorRecalculation(locals.supabase, validation.data);

    return new Response(JSON.stringify({ status: "queued" }), {
      status: 202,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[POST /v1/readings/recalculate-anchors] Unexpected error:", error);
    return errorResponse(500, "internal_error", "Failed to enqueue anchor recalculation");
  }
};
