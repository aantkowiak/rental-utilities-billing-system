/* eslint-disable no-console */
import type { APIRoute } from "astro";

import { requireAuth } from "@/lib/api/auth";
import { errorResponse } from "@/lib/errors";
import { PropertyService } from "@/lib/services/PropertyService";
import { CreatePropertySchema } from "@/lib/validators";

/**
 * GET /v1/properties
 * List properties with pagination.
 * Admins see all properties, tenants see only their contracted properties.
 * Requires valid JWT in Authorization header.
 */
export const GET: APIRoute = async ({ request, locals }) => {
  try {
    const auth = await requireAuth(request, locals);
    if (!auth.success) {
      return auth.response;
    }

    // List properties via service
    try {
      const result = await PropertyService.list(locals.supabase);

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      // Log unexpected errors
      console.error("[GET /v1/properties] Service error:", error);
      throw error;
    }
  } catch (error) {
    // Handle unexpected errors
    console.error("[GET /v1/properties] Unexpected error:", error);
    return errorResponse(500, "internal_error", "An unexpected error occurred");
  }
};

/**
 * POST /v1/properties
 * Create a new property.
 * Requires admin role and valid JWT in Authorization header.
 */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const auth = await requireAuth(request, locals, { requireAdmin: true });
    if (!auth.success) {
      return auth.response;
    }

    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse(400, "invalid_json", "Malformed JSON in request body");
    }

    // Validate request body
    const validation = CreatePropertySchema.safeParse(body);
    if (!validation.success) {
      return errorResponse(400, "validation_error", "Invalid request data", {
        errors: validation.error.format(),
      });
    }

    const cmd = validation.data;

    // Create property via service
    try {
      const property = await PropertyService.create(locals.supabase, cmd);

      return new Response(JSON.stringify({ property }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      // Handle specific service errors
      if (error instanceof Error && error.message === "DUPLICATE_LABEL") {
        return errorResponse(409, "duplicate_label", "A property with this label already exists");
      }

      // Log unexpected errors
      console.error("[POST /v1/properties] Service error:", error);
      throw error;
    }
  } catch (error) {
    // Handle unexpected errors
    console.error("[POST /v1/properties] Unexpected error:", error);
    return errorResponse(500, "internal_error", "An unexpected error occurred");
  }
};
