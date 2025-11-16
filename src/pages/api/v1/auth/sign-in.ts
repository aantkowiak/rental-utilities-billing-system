/* eslint-disable no-console */
import type { APIRoute } from "astro";

import { createSupabaseServerClient } from "@/db/supabase.server";
import { errorResponse } from "@/lib/errors";
import { SignInSchema } from "@/lib/validators";

export const prerender = false;

/**
 * POST /v1/auth/sign-in
 * Sign in with email and password.
 * Returns user data, role, and propertyId on success.
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse(400, "invalid_json", "Malformed JSON in request body");
    }

    // Validate request body
    const validation = SignInSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse(400, "validation_error", "Nieprawidłowe dane logowania", {
        errors: validation.error.format(),
      });
    }

    const { email, password } = validation.data;

    // Create a new Supabase client for this request to set cookies
    const supabase = createSupabaseServerClient(cookies);

    // Authenticate with Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      console.error("[sign-in] Authentication failed:", authError?.message);
      return errorResponse(401, "invalid_credentials", "Nieprawidłowy email lub hasło");
    }

    // Fetch user profile to get role and property_id
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, property_id, display_name")
      .eq("user_id", authData.user.id)
      .single();

    if (profileError || !profile) {
      console.error("[sign-in] Profile fetch failed:", profileError?.message);
      return errorResponse(500, "profile_error", "Nie udało się pobrać profilu użytkownika");
    }

    // Validate role
    if (profile.role !== "tenant" && profile.role !== "admin") {
      console.error("[sign-in] Invalid role:", profile.role);
      return errorResponse(500, "invalid_role", "Nieprawidłowa rola użytkownika");
    }

    // Return user data with role and propertyId
    return new Response(
      JSON.stringify({
        user: {
          id: authData.user.id,
          email: authData.user.email,
          displayName: profile.display_name,
        },
        role: profile.role,
        propertyId: profile.property_id,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[sign-in] Unexpected error:", error);
    return errorResponse(500, "internal_error", "Wystąpił nieoczekiwany błąd");
  }
};
