import type { APIRoute } from "astro";
import { z } from "zod";

import { requireAuth } from "@/lib/api/auth";
import { mapReadingsServiceError } from "@/lib/api/readings";
import { errorResponse } from "@/lib/errors";
import { ReadingsService } from "@/lib/services/ReadingsService";
import { ReportService } from "@/lib/services/ReportService";

const updateMonthsSchema = z.object({
  baseForMonth: z.string().regex(/^\d{4}-\d{2}$/).nullable().optional(),
  finalForMonth: z.string().regex(/^\d{4}-\d{2}$/).nullable().optional(),
});

/**
 * PATCH /api/v1/readings/:id/months
 * Update month assignments (baseForMonth, finalForMonth) for a reading.
 * Admin only.
 */
export const PATCH: APIRoute = async ({ request, locals, params }) => {
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

  const validation = updateMonthsSchema.safeParse(body);
  if (!validation.success) {
    return errorResponse(400, "validation_error", "Invalid request data", {
      errors: validation.error.format(),
    });
  }

  try {
    // Get old reading to know which months were affected before
    const oldReading = await ReadingsService.getById(locals.supabase, readingId);
    const oldMonths = [oldReading.baseForMonth, oldReading.finalForMonth].filter(
      (m): m is string => m !== null && m !== undefined
    );

    // Update months
    const reading = await ReadingsService.updateMonths(locals.supabase, readingId, validation.data);

    // Get new months
    const newMonths = [reading.baseForMonth, reading.finalForMonth].filter(
      (m): m is string => m !== null && m !== undefined
    );

    // Trigger report recomputation for all affected months (old + new)
    const allAffectedMonths = [...new Set([...oldMonths, ...newMonths])];
    if (allAffectedMonths.length > 0) {
      Promise.resolve(ReportService.recomputeForReading(locals.supabase, readingId)).catch((recomputeError) => {
        // eslint-disable-next-line no-console
        console.error("[PATCH /v1/readings/:id/months] Failed to recompute reports", recomputeError);
      });
    }

    return new Response(JSON.stringify({ reading }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return mapReadingsServiceError(error);
  }
};

