import type { APIRoute } from "astro";

import { requireAuth } from "@/lib/api/auth";
import { errorResponse } from "@/lib/errors";
import { ProfileService } from "@/lib/services/ProfileService";
import { UpdateMeSchema } from "@/lib/validators";

/**
 * GET /v1/me
 * Get authenticated user's profile with email.
 * Requires valid JWT in Authorization header.
 */
export const GET: APIRoute = async ({ request, locals }) => {
  try {
    const auth = await requireAuth(request, locals);
    if (!auth.success) {
      return auth.response;
    }

    // Fetch profile with email via service
    try {
      const profile = await ProfileService.getWithEmail(locals.supabase, auth.user.id);

      return new Response(JSON.stringify({ profile }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      // Handle specific service errors
      if (error instanceof Error && error.message === "PROFILE_NOT_FOUND") {
        return errorResponse(404, "profile_not_found", "Profile not found");
      }

      if (error instanceof Error && error.message === "UNAUTHORIZED") {
        return errorResponse(401, "unauthorized", "Not authenticated");
      }

      // Log unexpected errors
      console.error("[GET /v1/me] Service error:", error);
      throw error;
    }
  } catch (error) {
    // Handle unexpected errors
    console.error("[GET /v1/me] Unexpected error:", error);
    return errorResponse(500, "internal_error", "An unexpected error occurred");
  }
};

/**
 * PATCH /v1/me
 * Update authenticated user's email.
 * Requires valid JWT in Authorization header.
 */
export const PATCH: APIRoute = async ({ request, locals }) => {
  try {
    const auth = await requireAuth(request, locals);
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
    const validation = UpdateMeSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse(400, "validation_error", "Invalid request data", {
        errors: validation.error.format(),
      });
    }

    const { email } = validation.data;

    // Require email to be provided
    if (!email) {
      return errorResponse(400, "validation_error", "Email is required");
    }

    // Update email via service
    try {
      const profile = await ProfileService.updateEmail(locals.supabase, auth.user.id, email);

      return new Response(JSON.stringify({ profile }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      // Handle specific service errors
      if (error instanceof Error && error.message === "PROFILE_NOT_FOUND") {
        return errorResponse(404, "profile_not_found", "Profile not found");
      }

      if (error instanceof Error && error.message === "UNAUTHORIZED") {
        return errorResponse(401, "unauthorized", "Not authenticated");
      }

      if (error instanceof Error && error.message.startsWith("Auth error:")) {
        return errorResponse(400, "auth_error", error.message.replace("Auth error: ", ""));
      }

      // Log unexpected errors
      console.error("[PATCH /v1/me] Service error:", error);
      throw error;
    }
  } catch (error) {
    // Handle unexpected errors
    console.error("[PATCH /v1/me] Unexpected error:", error);
    return errorResponse(500, "internal_error", "An unexpected error occurred");
  }
};
