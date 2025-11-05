import type { APIRoute } from "astro";

import { requireAuth } from "@/lib/api/auth";
import { guardTenantPropertyAccess, mapReadingsServiceError, toMonthStart } from "@/lib/api/readings";
import { errorResponse } from "@/lib/errors";
import { enqueueAnchorRecalculation } from "@/lib/jobs/recalculateAnchors";
import { ReadingsService } from "@/lib/services/ReadingsService";
import { updateReadingSchema } from "@/lib/validation/readings";

export const GET: APIRoute = async ({ request, locals, params }) => {
  const readingId = params.id;
  if (!readingId) {
    return errorResponse(400, "invalid_request", "Reading ID is required");
  }

  const auth = await requireAuth(request, locals);
  if (!auth.success) {
    return auth.response;
  }

  try {
    const reading = await ReadingsService.getById(locals.supabase, readingId);

    const guardResponse = guardTenantPropertyAccess({
      role: auth.role,
      tenantPropertyId: auth.propertyId,
      targetPropertyId: reading.propertyId,
    });

    if (guardResponse) {
      return guardResponse;
    }

    return new Response(JSON.stringify({ reading }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return mapReadingsServiceError(error);
  }
};

export const PATCH: APIRoute = async ({ request, locals, params }) => {
  const readingId = params.id;
  if (!readingId) {
    return errorResponse(400, "invalid_request", "Reading ID is required");
  }

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

  const validation = updateReadingSchema.safeParse(body);
  if (!validation.success) {
    return errorResponse(400, "validation_error", "Invalid request data", {
      errors: validation.error.format(),
    });
  }

  try {
    const existing = await ReadingsService.getById(locals.supabase, readingId);

    const guardResponse = guardTenantPropertyAccess({
      role: auth.role,
      tenantPropertyId: auth.propertyId,
      targetPropertyId: existing.propertyId,
    });

    if (guardResponse) {
      return guardResponse;
    }

    const reading = await ReadingsService.update(locals.supabase, readingId, validation.data, {
      role: auth.role,
    });

    const monthStart = toMonthStart(reading.readingAt);
    if (monthStart) {
      Promise.resolve(
        enqueueAnchorRecalculation(locals.supabase, {
          propertyId: reading.propertyId,
          fromMonth: monthStart,
          toMonth: monthStart,
        })
      ).catch((jobError) => {
        // eslint-disable-next-line no-console
        console.error("[PATCH /v1/readings/:id] Failed to queue anchor recalculation", jobError);
      });
    }

    return new Response(JSON.stringify({ reading }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return mapReadingsServiceError(error);
  }
};

export const DELETE: APIRoute = async ({ request, locals, params }) => {
  const readingId = params.id;
  if (!readingId) {
    return errorResponse(400, "invalid_request", "Reading ID is required");
  }

  const auth = await requireAuth(request, locals);
  if (!auth.success) {
    return auth.response;
  }

  try {
    const existing = await ReadingsService.getById(locals.supabase, readingId);

    const guardResponse = guardTenantPropertyAccess({
      role: auth.role,
      tenantPropertyId: auth.propertyId,
      targetPropertyId: existing.propertyId,
    });

    if (guardResponse) {
      return guardResponse;
    }

    await ReadingsService.softDelete(locals.supabase, readingId);

    const monthStart = toMonthStart(existing.readingAt);
    if (monthStart) {
      Promise.resolve(
        enqueueAnchorRecalculation(locals.supabase, {
          propertyId: existing.propertyId,
          fromMonth: monthStart,
          toMonth: monthStart,
        })
      ).catch((jobError) => {
        // eslint-disable-next-line no-console
        console.error("[DELETE /v1/readings/:id] Failed to queue anchor recalculation", jobError);
      });
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    return mapReadingsServiceError(error);
  }
};
