import type { APIRoute } from "astro";

import { requireAuth } from "@/lib/api/auth";
import { errorResponse } from "@/lib/errors";
import { ReportService, ReportServiceError } from "@/lib/services/ReportService";

/**
 * POST /api/v1/reports/:id/regenerate
 * Regenerate (rebuild) an existing report.
 * Admin only.
 */
export const POST: APIRoute = async ({ request, locals, params }) => {
  const reportId = params.id;
  if (!reportId) {
    return errorResponse(400, "invalid_request", "Report ID is required");
  }

  const auth = await requireAuth(request, locals, { requireAdmin: true });
  if (!auth.success) {
    return auth.response;
  }

  try {
    const report = await ReportService.regenerate(locals.supabase, { role: auth.role, userId: auth.userId }, reportId);

    return new Response(JSON.stringify({ report }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    if (error instanceof ReportServiceError) {
      const statusMap: Record<string, number> = {
        REPORT_NOT_FOUND: 404,
        REPORT_FORBIDDEN: 403,
        CONTRACT_NOT_FOUND: 404,
        MISSING_READING_PAIR: 400,
        MISSING_MONTHLY_CONDITIONS: 400,
        DATABASE_ERROR: 500,
      };

      return errorResponse(statusMap[error.code] ?? 500, error.code, error.message, error.details);
    }

    return errorResponse(500, "internal_error", "Unexpected error occurred");
  }
};
