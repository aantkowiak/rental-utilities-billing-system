import type { APIRoute } from "astro";

import { requireAuth } from "@/lib/api/auth";
import { errorResponse } from "@/lib/errors";
import { ReportService, ReportServiceError } from "@/lib/services/ReportService";

/**
 * GET /api/v1/reports/:id/items
 * Get report items for a report, including monthly advance information.
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
    const report = await ReportService.getById(locals.supabase, { role: auth.role, userId: auth.user.id }, reportId);

    // Then get items
    const items = await ReportService.getItems(locals.supabase, reportId);

    // Get monthly advances for this report's month and property
    const { data: monthlyAdvance, error: advanceError } = await locals.supabase
      .from("monthly_advances")
      .select("*")
      .eq("property_id", report.propertyId)
      .eq("month", report.month.length === 7 ? `${report.month}-01` : report.month)
      .maybeSingle();

    if (advanceError) {
      console.error("[GET /v1/reports/:id/items] Error fetching monthly advance:", advanceError);
    }

    // Calculate advance allocations if monthly advance exists
    let monthlyAdvanceInfo = null;
    if (monthlyAdvance) {
      const priceCold = Number(monthlyAdvance.price_cold);
      const priceHotHeating = Number(monthlyAdvance.price_hot_heating);
      const priceHeating = Number(monthlyAdvance.price_heating);
      const forecastCold = Number(monthlyAdvance.forecast_cold);
      const forecastHot = Number(monthlyAdvance.forecast_hot);
      const forecastHeating = Number(monthlyAdvance.forecast_heating);

      // Calculate advance allocations per utility
      const advanceColdRaw = forecastCold * priceCold;
      const advanceHotRaw = forecastHot * (priceCold + priceHotHeating);
      const advanceHeatingRaw = forecastHeating * priceHeating;

      monthlyAdvanceInfo = {
        managerFeeRaw: Number(monthlyAdvance.manager_fee),
        // Prices (unit costs)
        priceColdRaw: priceCold,
        priceHotHeatingRaw: priceHotHeating,
        priceHeatingRaw: priceHeating,
        // Forecasts (expected usage)
        forecastColdM3: forecastCold,
        forecastHotM3: forecastHot,
        forecastHeatingGj: forecastHeating,
        // Advance allocations
        advanceColdRaw,
        advanceHotRaw,
        advanceHeatingRaw,
        advancePaymentRaw: Number(monthlyAdvance.advance_payment),
      };
    }

    return new Response(JSON.stringify({ items, monthlyAdvance: monthlyAdvanceInfo }), {
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
