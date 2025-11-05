import type { APIRoute } from "astro";

import { requireAuth } from "@/lib/api/auth";
import { mapReadingsServiceError, toMonthStart } from "@/lib/api/readings";
import { errorResponse } from "@/lib/errors";
import { enqueueAnchorRecalculation } from "@/lib/jobs/recalculateAnchors";
import { ReadingsService } from "@/lib/services/ReadingsService";
import { createReplacementReadingSchema } from "@/lib/validation/readings";

export const POST: APIRoute = async ({ request, locals, params }) => {
  const readingId = params.id;
  if (!readingId) {
    return errorResponse(400, "invalid_request", "Reading ID is required");
  }

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

  const validation = createReplacementReadingSchema.safeParse(body);
  if (!validation.success) {
    return errorResponse(400, "validation_error", "Invalid request data", {
      errors: validation.error.format(),
    });
  }

  try {
    const reading = await ReadingsService.createReplacement(locals.supabase, readingId, validation.data);

    const monthBasis = reading.effectiveMonth ?? reading.readingAt;
    const monthStart = monthBasis ? toMonthStart(monthBasis) : null;
    if (monthStart) {
      Promise.resolve(
        enqueueAnchorRecalculation(locals.supabase, {
          propertyId: reading.propertyId,
          fromMonth: monthStart,
          toMonth: monthStart,
        })
      ).catch((jobError) => {
        // eslint-disable-next-line no-console
        console.error("[POST /v1/readings/:id/replacement] Failed to queue anchor recalculation", jobError);
      });
    }

    return new Response(JSON.stringify({ reading }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return mapReadingsServiceError(error);
  }
};
