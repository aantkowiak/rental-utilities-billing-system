/* eslint-disable no-console */
import type { APIRoute } from "astro";

import { errorResponse } from "@/lib/errors";

export const prerender = false;

/**
 * POST /v1/auth/sign-out
 * Sign out the current user and clear session.
 */
export const POST: APIRoute = async ({ locals }) => {
  try {
    const { error } = await locals.supabase.auth.signOut();

    if (error) {
      console.error("[sign-out] Error:", error.message);
      return errorResponse(500, "sign_out_error", "Nie udało się wylogować");
    }

    return new Response(JSON.stringify({ status: "signed_out" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[sign-out] Unexpected error:", error);
    return errorResponse(500, "internal_error", "Wystąpił nieoczekiwany błąd");
  }
};

