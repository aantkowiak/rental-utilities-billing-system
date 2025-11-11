import type { APIRoute } from "astro";

import { requireAuth } from "@/lib/api/auth";
import { guardTenantPropertyAccess, mapReadingsServiceError } from "@/lib/api/readings";
import { errorResponse } from "@/lib/errors";
import { ReadingsService } from "@/lib/services/ReadingsService";
import { ReportService } from "@/lib/services/ReportService";
import { createReadingSchema, listReadingsQuerySchema } from "@/lib/validation/readings";

export const GET: APIRoute = async ({ request, locals, url }) => {
  const auth = await requireAuth(request, locals);
  if (!auth.success) {
    return auth.response;
  }

  const validation = listReadingsQuerySchema.safeParse({
    propertyId: url.searchParams.get("propertyId") ?? undefined,
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
  });

  if (!validation.success) {
    return errorResponse(400, "validation_error", "Invalid query parameters", {
      errors: validation.error.format(),
    });
  }

  const guardResponse = guardTenantPropertyAccess({
    role: auth.role,
    tenantPropertyId: auth.propertyId,
    targetPropertyId: validation.data.propertyId,
  });

  if (guardResponse) {
    return guardResponse;
  }

  try {
    const result = await ReadingsService.list(locals.supabase, validation.data);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return mapReadingsServiceError(error);
  }
};

export const POST: APIRoute = async ({ request, locals }) => {
  const auth = await requireAuth(request, locals);
  if (!auth.success) {
    return auth.response;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "invalid_json", "Malformed JSON in request body");
  }

  const validation = createReadingSchema.safeParse(body);
  if (!validation.success) {
    return errorResponse(400, "validation_error", "Invalid request data", {
      errors: validation.error.format(),
    });
  }

  const guardResponse = guardTenantPropertyAccess({
    role: auth.role,
    tenantPropertyId: auth.propertyId,
    targetPropertyId: validation.data.propertyId,
  });

  if (guardResponse) {
    return guardResponse;
  }

  try {
    const reading = await ReadingsService.create(locals.supabase, validation.data, {
      role: auth.role,
    });

    // Trigger report recomputation in background if reading has month assignments
    Promise.resolve(ReportService.recomputeForReading(locals.supabase, reading.id)).catch((recomputeError) => {
      // eslint-disable-next-line no-console
      console.error("[POST /v1/readings] Failed to recompute reports", recomputeError);
    });

    return new Response(JSON.stringify({ reading }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return mapReadingsServiceError(error);
  }
};
