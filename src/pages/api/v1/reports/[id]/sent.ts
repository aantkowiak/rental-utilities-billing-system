import type { APIRoute } from "astro";
import { z } from "zod";

import { requireAuth } from "@/lib/api/auth";
import { errorResponse } from "@/lib/errors";
import { ReportService, ReportServiceError } from "@/lib/services/ReportService";

const updateSentSchema = z.object({
  sent: z.boolean(),
});

/**
 * PATCH /api/v1/reports/:id/sent
 * Update sent status for a report.
 * Admin only.
 */
export const PATCH: APIRoute = async ({ request, locals, params }) => {
  const reportId = params.id;
  if (!reportId) {
    return errorResponse(400, "invalid_request", "Report ID is required");
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

  const validation = updateSentSchema.safeParse(body);
  if (!validation.success) {
    return errorResponse(400, "validation_error", "Invalid request data", {
      errors: validation.error.format(),
    });
  }

  try {
    const report = await ReportService.updateSent(locals.supabase, reportId, validation.data.sent);

    return new Response(JSON.stringify({ report }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    if (error instanceof ReportServiceError) {
      const statusMap: Record<string, number> = {
        REPORT_NOT_FOUND: 404,
        DATABASE_ERROR: 500,
      };

      return errorResponse(statusMap[error.code] ?? 500, error.code, error.message, error.details);
    }

    return errorResponse(500, "internal_error", "Unexpected error occurred");
  }
};

