import type { APIRoute } from "astro";

import { requireAuth } from "@/lib/api/auth";
import { errorResponse } from "@/lib/errors";
import { ReportService, ReportServiceError } from "@/lib/services/ReportService";

/**
 * GET /api/v1/reports/:id/items
 * Get report items for a report.
 */
export const GET: APIRoute = async ({ request, locals, params }) => {
  const reportId = params.id;
  if (!reportId) {
    return errorResponse(400, "invalid_request", "Report ID is required");
  }

  const auth = await requireAuth(request, locals);
  if (!auth.success) {
    return auth.response;
  }

  try {
    // First verify access to the report
    await ReportService.getById(locals.supabase, { role: auth.role, userId: auth.userId }, reportId);

    // Then get items
    const items = await ReportService.getItems(locals.supabase, reportId);

    return new Response(JSON.stringify({ items }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    if (error instanceof ReportServiceError) {
      const statusMap: Record<string, number> = {
        REPORT_NOT_FOUND: 404,
        REPORT_FORBIDDEN: 403,
        DATABASE_ERROR: 500,
      };

      return errorResponse(statusMap[error.code] ?? 500, error.code, error.message, error.details);
    }

    return errorResponse(500, "internal_error", "Unexpected error occurred");
  }
};

