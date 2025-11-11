import type { APIRoute } from "astro";

import { requireAuth } from "@/lib/api/auth";
import { errorResponse } from "@/lib/errors";
import { ContractService } from "@/lib/services/ContractService";
import { buildContractsListResponse, buildContractResponse } from "@/types/contracts";
import { ContractsListQuerySchema, CreateContractSchema } from "@/lib/validators/contracts";

export const GET: APIRoute = async ({ request, locals, url }) => {
  const auth = await requireAuth(request, locals);
  if (!auth.success) {
    return auth.response;
  }

  const rawQuery = {
    propertyId: url.searchParams.get("propertyId") ?? undefined,
    tenantUserId: url.searchParams.get("tenantUserId") ?? undefined,
    active: url.searchParams.get("active") ?? undefined,
  };

  const validation = ContractsListQuerySchema.safeParse(rawQuery);
  if (!validation.success) {
    return errorResponse(400, "validation_error", "Invalid query parameters", {
      errors: validation.error.format(),
    });
  }

  const { propertyId, tenantUserId, active } = validation.data;

  const filters = {
    propertyId: propertyId ?? undefined,
    tenantUserId: auth.role === "tenant" ? auth.user.id : (tenantUserId ?? undefined),
    active: active ?? undefined,
  };

  try {
    const result = await ContractService.list(locals.supabase, { role: auth.role, userId: auth.user.id }, { filters });

    const body = buildContractsListResponse(result.items);

    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[GET /v1/contracts] Service error:", error);
    return errorResponse(500, "internal_error", "Failed to list contracts");
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
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

  const validation = CreateContractSchema.safeParse(body);
  if (!validation.success) {
    return errorResponse(400, "validation_error", "Invalid request data", {
      errors: validation.error.format(),
    });
  }

  const cmd = validation.data;

  try {
    const contract = await ContractService.create(locals.supabase, { role: auth.role, userId: auth.user.id }, cmd);

    return new Response(JSON.stringify(buildContractResponse(contract)), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "CONTRACT_PERIOD_OVERLAP") {
        return errorResponse(409, "contract_overlap", "Contract period overlaps with existing contract");
      }

      if (error.message === "CONTRACT_FOREIGN_KEY_VIOLATION") {
        return errorResponse(400, "foreign_key_violation", "Property or tenant reference is invalid");
      }

      if (error.message === "CONTRACT_FORBIDDEN") {
        return errorResponse(403, "forbidden", "Insufficient permissions");
      }
    }

    console.error("[POST /v1/contracts] Service error:", error);
    return errorResponse(500, "internal_error", "Failed to create contract");
  }
};
