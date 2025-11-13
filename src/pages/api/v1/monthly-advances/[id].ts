import type { APIRoute } from "astro";

import { requireAuth } from "@/lib/api/auth";
import { mapMonthlyAdvanceServiceError } from "@/lib/api/monthlyAdvances";
import { errorResponse } from "@/lib/errors";
import { MonthlyAdvanceService } from "@/lib/services/MonthlyAdvanceService";
import { ReportService } from "@/lib/services/ReportService";
import { buildMonthlyAdvanceResponse } from "@/types/monthlyAdvances";
import { UpdateMonthlyAdvanceSchema } from "@/lib/validators/monthlyAdvances";

const missingIdResponse = () => errorResponse(400, "validation_error", "Monthly advance id is required");

export const GET: APIRoute = async ({ request, locals, params }) => {
  const auth = await requireAuth(request, locals);
  if (!auth.success) {
    return auth.response;
  }

  const monthlyAdvanceId = params.id;
  if (!monthlyAdvanceId) {
    return missingIdResponse();
  }

  try {
    const monthlyAdvance = await MonthlyAdvanceService.getById(
      locals.supabase,
      { role: auth.role, tenantPropertyId: auth.propertyId },
      monthlyAdvanceId
    );

    return new Response(JSON.stringify(buildMonthlyAdvanceResponse(monthlyAdvance)), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return mapMonthlyAdvanceServiceError(error);
  }
};

export const PATCH: APIRoute = async ({ request, locals, params }) => {
  const auth = await requireAuth(request, locals, { requireAdmin: true });
  if (!auth.success) {
    return auth.response;
  }

  const monthlyAdvanceId = params.id;
  if (!monthlyAdvanceId) {
    return missingIdResponse();
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return errorResponse(400, "invalid_json", "Malformed JSON in request body");
  }

  const validation = UpdateMonthlyAdvanceSchema.safeParse(payload);
  if (!validation.success) {
    return errorResponse(400, "validation_error", "Invalid request data", {
      errors: validation.error.format(),
    });
  }

  try {
    const updated = await MonthlyAdvanceService.update(
      locals.supabase,
      { role: auth.role, tenantPropertyId: auth.propertyId },
      monthlyAdvanceId,
      validation.data
    );

    // Trigger report recomputation in background
    Promise.resolve(ReportService.recomputeAll(locals.supabase)).catch((recomputeError) => {
      // eslint-disable-next-line no-console
      console.error("[PATCH /v1/monthly-advances/:id] Failed to recompute reports", recomputeError);
    });

    return new Response(JSON.stringify(buildMonthlyAdvanceResponse(updated)), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return mapMonthlyAdvanceServiceError(error);
  }
};

export const DELETE: APIRoute = async ({ request, locals, params }) => {
  const auth = await requireAuth(request, locals, { requireAdmin: true });
  if (!auth.success) {
    return auth.response;
  }

  const monthlyAdvanceId = params.id;
  if (!monthlyAdvanceId) {
    return missingIdResponse();
  }

  try {
    await MonthlyAdvanceService.delete(
      locals.supabase,
      { role: auth.role, tenantPropertyId: auth.propertyId },
      monthlyAdvanceId
    );

    // Trigger report recomputation in background
    Promise.resolve(ReportService.recomputeAll(locals.supabase)).catch((recomputeError) => {
      // eslint-disable-next-line no-console
      console.error("[DELETE /v1/monthly-advances/:id] Failed to recompute reports", recomputeError);
    });

    return new Response(null, { status: 204 });
  } catch (error) {
    return mapMonthlyAdvanceServiceError(error);
  }
};
