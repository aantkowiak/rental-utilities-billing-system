/* eslint-disable no-console */
import type { APIRoute } from "astro";

import { requireAuth } from "@/lib/api/auth";
import { errorResponse } from "@/lib/errors";
import { ProfileService } from "@/lib/services/ProfileService";

/**
 * GET /v1/profiles
 * List all user profiles with emails.
 * Admin-only endpoint.
 */
export const GET: APIRoute = async ({ request, locals }) => {
  try {
    const auth = await requireAuth(request, locals, { requireAdmin: true });
    if (!auth.success) {
      return auth.response;
    }

    try {
      const result = await ProfileService.list(locals.supabase);

      return new Response(JSON.stringify(result), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("[GET /v1/profiles] Service error:", error);
      throw error;
    }
  } catch (error) {
    console.error("[GET /v1/profiles] Unexpected error:", error);
    return errorResponse(500, "internal_error", "An unexpected error occurred");
  }
};
