import type { APIRoute } from "astro";

import { requireAuth } from "@/lib/api/auth";
import { mapMonthlyConditionServiceError } from "@/lib/api/monthlyConditions";
import { errorResponse } from "@/lib/errors";
import { MonthlyConditionService } from "@/lib/services/MonthlyConditionService";
import { buildMonthlyConditionResponse } from "@/types/monthlyConditions";
import { UpdateMonthlyConditionSchema } from "@/lib/validators/monthlyConditions";

const missingIdResponse = () => errorResponse(400, "validation_error", "Monthly condition id is required");

export const GET: APIRoute = async ({ request, locals, params }) => {
  const auth = await requireAuth(request, locals);
  if (!auth.success) {
    return auth.response;
  }

  const monthlyConditionId = params.id;
  if (!monthlyConditionId) {
    return missingIdResponse();
  }

  try {
    const monthlyCondition = await MonthlyConditionService.getById(
      locals.supabase,
      { role: auth.role, tenantPropertyId: auth.propertyId },
      monthlyConditionId
    );

    return new Response(JSON.stringify(buildMonthlyConditionResponse(monthlyCondition)), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return mapMonthlyConditionServiceError(error);
  }
};

export const PATCH: APIRoute = async ({ request, locals, params }) => {
  const auth = await requireAuth(request, locals, { requireAdmin: true });
  if (!auth.success) {
    return auth.response;
  }

  const monthlyConditionId = params.id;
  if (!monthlyConditionId) {
    return missingIdResponse();
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return errorResponse(400, "invalid_json", "Malformed JSON in request body");
  }

  const validation = UpdateMonthlyConditionSchema.safeParse(payload);
  if (!validation.success) {
    return errorResponse(400, "validation_error", "Invalid request data", {
      errors: validation.error.format(),
    });
  }

  try {
    const updated = await MonthlyConditionService.update(
      locals.supabase,
      { role: auth.role, tenantPropertyId: auth.propertyId },
      monthlyConditionId,
      validation.data
    );

    return new Response(JSON.stringify(buildMonthlyConditionResponse(updated)), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return mapMonthlyConditionServiceError(error);
  }
};

export const DELETE: APIRoute = async ({ request, locals, params }) => {
  const auth = await requireAuth(request, locals, { requireAdmin: true });
  if (!auth.success) {
    return auth.response;
  }

  const monthlyConditionId = params.id;
  if (!monthlyConditionId) {
    return missingIdResponse();
  }

  try {
    await MonthlyConditionService.delete(
      locals.supabase,
      { role: auth.role, tenantPropertyId: auth.propertyId },
      monthlyConditionId
    );

    return new Response(null, { status: 204 });
  } catch (error) {
    return mapMonthlyConditionServiceError(error);
  }
};
