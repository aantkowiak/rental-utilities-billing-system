import type { APIRoute } from "astro";

import { requireAuth } from "@/lib/api/auth";
import { mapMonthlyAdvanceServiceError } from "@/lib/api/monthlyConditions";
import { errorResponse } from "@/lib/errors";
import { MonthlyAdvanceService } from "@/lib/services/MonthlyConditionService";
import { buildMonthlyAdvanceResponse, buildMonthlyAdvancesListResponse } from "@/types/monthlyConditions";
import { CreateMonthlyAdvanceSchema, MonthlyAdvancesListQuerySchema } from "@/lib/validators/monthlyConditions";

export const GET: APIRoute = async ({ request, locals, url }) => {
  const auth = await requireAuth(request, locals);
  if (!auth.success) {
    return auth.response;
  }

  const validation = MonthlyAdvancesListQuerySchema.safeParse({
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
    const result = await MonthlyAdvanceService.list(
      locals.supabase,
      { role: auth.role, tenantPropertyId: auth.propertyId },
      filters
    );

    const body = buildMonthlyAdvancesListResponse(result.items);

    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return mapMonthlyAdvanceServiceError(error);
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

  const validation = CreateMonthlyAdvanceSchema.safeParse(payload);
  if (!validation.success) {
    return errorResponse(400, "validation_error", "Invalid request data", {
      errors: validation.error.format(),
    });
  }

  try {
    const created = await MonthlyAdvanceService.create(
      locals.supabase,
      { role: auth.role, tenantPropertyId: auth.propertyId },
      validation.data
    );

    return new Response(JSON.stringify(buildMonthlyAdvanceResponse(created)), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return mapMonthlyAdvanceServiceError(error);
  }
};
