/* eslint-disable no-console */
import type { APIRoute } from "astro";

import { z } from "zod";

import { requireAuth } from "@/lib/api/auth";
import { errorResponse } from "@/lib/errors";
import { ContractService } from "@/lib/services/ContractService";
import { buildContractResponse } from "@/types/contracts";
import { UpdateContractSchema } from "@/lib/validators/contracts";

const ContractIdSchema = z.object({
  contractId: z.string().uuid(),
});

export const GET: APIRoute = async ({ request, locals, params }) => {
  const auth = await requireAuth(request, locals);
  if (!auth.success) {
    return auth.response;
  }

  const contractId = validateContractId(params);
  if (!contractId) {
    return errorResponse(400, "validation_error", "Invalid contract identifier");
  }

  try {
    const contract = await ContractService.getById(
      locals.supabase,
      { role: auth.role, userId: auth.user.id },
      contractId
    );

    return new Response(JSON.stringify(buildContractResponse(contract)), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "CONTRACT_NOT_FOUND") {
      return errorResponse(404, "not_found", "Contract not found");
    }

    console.error(`GET /v1/contracts/${contractId} error:`, error);
    return errorResponse(500, "internal_error", "Failed to fetch contract");
  }
};

export const PATCH: APIRoute = async ({ request, locals, params }) => {
  const auth = await requireAuth(request, locals, { requireAdmin: true });
  if (!auth.success) {
    return auth.response;
  }

  const contractId = validateContractId(params);
  if (!contractId) {
    return errorResponse(400, "validation_error", "Invalid contract identifier");
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "invalid_json", "Malformed JSON in request body");
  }

  const validation = UpdateContractSchema.safeParse(body);
  if (!validation.success) {
    return errorResponse(400, "validation_error", "Invalid request data", {
      errors: validation.error.format(),
    });
  }

  const cmd = validation.data;

  try {
    const contract = await ContractService.update(
      locals.supabase,
      { role: auth.role, userId: auth.user.id },
      contractId,
      cmd
    );

    return new Response(JSON.stringify(buildContractResponse(contract)), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "CONTRACT_NOT_FOUND") {
        return errorResponse(404, "not_found", "Contract not found");
      }

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

    console.error(`PATCH /v1/contracts/${contractId} error:`, error);
    return errorResponse(500, "internal_error", "Failed to update contract");
  }
};

export const DELETE: APIRoute = async ({ request, locals, params }) => {
  const auth = await requireAuth(request, locals, { requireAdmin: true });
  if (!auth.success) {
    return auth.response;
  }

  const contractId = validateContractId(params);
  if (!contractId) {
    return errorResponse(400, "validation_error", "Invalid contract identifier");
  }

  try {
    await ContractService.delete(locals.supabase, { role: auth.role, userId: auth.user.id }, contractId);
    return new Response(null, { status: 204 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "CONTRACT_NOT_FOUND") {
        return errorResponse(404, "not_found", "Contract not found");
      }

      if (error.message === "CONTRACT_FORBIDDEN") {
        return errorResponse(403, "forbidden", "Insufficient permissions");
      }
    }

    console.error(`DELETE /v1/contracts/${contractId} error:`, error);
    return errorResponse(500, "internal_error", "Failed to delete contract");
  }
};

function validateContractId(params: Record<string, string | undefined>): string | null {
  const validation = ContractIdSchema.safeParse(params);
  return validation.success ? validation.data.contractId : null;
}
