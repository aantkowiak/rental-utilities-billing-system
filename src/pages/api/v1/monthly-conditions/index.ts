import type { APIRoute } from "astro";

import { requireAuth } from "@/lib/api/auth";
import { mapMonthlyConditionServiceError } from "@/lib/api/monthlyConditions";
import { errorResponse } from "@/lib/errors";
import { MonthlyConditionService } from "@/lib/services/MonthlyConditionService";
import { buildMonthlyConditionResponse, buildMonthlyConditionsListResponse } from "@/types/monthlyConditions";
import { CreateMonthlyConditionSchema, MonthlyConditionsListQuerySchema } from "@/lib/validators/monthlyConditions";

export const GET: APIRoute = async ({ request, locals, url }) => {
  const auth = await requireAuth(request, locals);
  if (!auth.success) {
    return auth.response;
  }

  const validation = MonthlyConditionsListQuerySchema.safeParse({
    propertyId: url.searchParams.get("propertyId") ?? undefined,
    month: url.searchParams.get("month") ?? undefined,
  });

  if (!validation.success) {
    return errorResponse(400, "validation_error", "Invalid query parameters", {
      errors: validation.error.format(),
    });
  }

  const { propertyId, month } = validation.data;

  const filters = {
    propertyId: auth.role === "tenant" ? (auth.propertyId ?? undefined) : (propertyId ?? undefined),
    month: month ?? undefined,
  };

  try {
    const result = await MonthlyConditionService.list(
      locals.supabase,
      { role: auth.role, tenantPropertyId: auth.propertyId },
      filters
    );

    const body = buildMonthlyConditionsListResponse(result.items);

    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return mapMonthlyConditionServiceError(error);
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  const auth = await requireAuth(request, locals, { requireAdmin: true });
  if (!auth.success) {
    return auth.response;
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return errorResponse(400, "invalid_json", "Malformed JSON in request body");
  }

  const validation = CreateMonthlyConditionSchema.safeParse(payload);
  if (!validation.success) {
    return errorResponse(400, "validation_error", "Invalid request data", {
      errors: validation.error.format(),
    });
  }

  try {
    const created = await MonthlyConditionService.create(
      locals.supabase,
      { role: auth.role, tenantPropertyId: auth.propertyId },
      validation.data
    );

    return new Response(JSON.stringify(buildMonthlyConditionResponse(created)), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return mapMonthlyConditionServiceError(error);
  }
};
