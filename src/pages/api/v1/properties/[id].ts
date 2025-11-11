import type { APIRoute } from "astro";

import { requireAuth } from "@/lib/api/auth";
import { errorResponse } from "@/lib/errors";
import { PropertyService } from "@/lib/services/PropertyService";
import { UpdatePropertySchema } from "@/lib/validators";

/**
 * GET /v1/properties/:id
 * Get a single property by ID.
 * Admins can access all properties, tenants can only access their contracted properties.
 * Requires valid JWT in Authorization header.
 */
export const GET: APIRoute = async ({ request, locals, params }) => {
  try {
    // Extract property ID from URL params
    const propertyId = params.id;
    if (!propertyId) {
      return errorResponse(400, "invalid_request", "Property ID is required");
    }

    const auth = await requireAuth(request, locals);
    if (!auth.success) {
      return auth.response;
    }

    // Get property via service
    try {
      const property = await PropertyService.getById(locals.supabase, auth.role, propertyId);

      return new Response(JSON.stringify({ property }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      // Handle specific service errors
      if (error instanceof Error && error.message === "PROPERTY_NOT_FOUND") {
        return errorResponse(404, "property_not_found", "Property not found");
      }

      // Log unexpected errors
      console.error("[GET /v1/properties/:id] Service error:", error);
      throw error;
    }
  } catch (error) {
    // Handle unexpected errors
    console.error("[GET /v1/properties/:id] Unexpected error:", error);
    return errorResponse(500, "internal_error", "An unexpected error occurred");
  }
};

/**
 * PATCH /v1/properties/:id
 * Update a property by ID.
 * Requires admin role and valid JWT in Authorization header.
 */
export const PATCH: APIRoute = async ({ request, locals, params }) => {
  try {
    // Extract property ID from URL params
    const propertyId = params.id;
    if (!propertyId) {
      return errorResponse(400, "invalid_request", "Property ID is required");
    }

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
    const validation = UpdatePropertySchema.safeParse(body);
    if (!validation.success) {
      return errorResponse(400, "validation_error", "Invalid request data", {
        errors: validation.error.format(),
      });
    }

    const cmd = validation.data;

    // Update property via service
    try {
      const property = await PropertyService.update(locals.supabase, propertyId, cmd);

      return new Response(JSON.stringify({ property }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      // Handle specific service errors
      if (error instanceof Error && error.message === "PROPERTY_NOT_FOUND") {
        return errorResponse(404, "property_not_found", "Property not found");
      }
      if (error instanceof Error && error.message === "DUPLICATE_LABEL") {
        return errorResponse(409, "duplicate_label", "A property with this label already exists");
      }

      // Log unexpected errors
      console.error("[PATCH /v1/properties/:id] Service error:", error);
      throw error;
    }
  } catch (error) {
    // Handle unexpected errors
    console.error("[PATCH /v1/properties/:id] Unexpected error:", error);
    return errorResponse(500, "internal_error", "An unexpected error occurred");
  }
};

/**
 * DELETE /v1/properties/:id
 * Delete a property by ID.
 * Requires admin role and valid JWT in Authorization header.
 */
export const DELETE: APIRoute = async ({ request, locals, params }) => {
  try {
    // Extract property ID from URL params
    const propertyId = params.id;
    if (!propertyId) {
      return errorResponse(400, "invalid_request", "Property ID is required");
    }

    const auth = await requireAuth(request, locals, { requireAdmin: true });
    if (!auth.success) {
      return auth.response;
    }

    // Delete property via service
    try {
      await PropertyService.delete(locals.supabase, propertyId);

      return new Response(null, {
        status: 204,
      });
    } catch (error) {
      // Handle specific service errors
      if (error instanceof Error && error.message === "PROPERTY_NOT_FOUND") {
        return errorResponse(404, "property_not_found", "Property not found");
      }

      // Log unexpected errors
      console.error("[DELETE /v1/properties/:id] Service error:", error);
      throw error;
    }
  } catch (error) {
    // Handle unexpected errors
    console.error("[DELETE /v1/properties/:id] Unexpected error:", error);
    return errorResponse(500, "internal_error", "An unexpected error occurred");
  }
};
