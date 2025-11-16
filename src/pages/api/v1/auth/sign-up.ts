/* eslint-disable no-console */
import type { APIRoute } from "astro";

import { errorResponse } from "@/lib/errors";
import { SignUpSchema } from "@/lib/validators";

export const prerender = false;

/**
 * POST /v1/auth/sign-up
 * Sign up with email and password.
 * Sends a confirmation email to the user.
 * Returns success status on completion.
 */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse(400, "invalid_json", "Malformed JSON in request body");
    }

    // Validate request body
    const validation = SignUpSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse(400, "validation_error", "Nieprawidłowe dane rejestracji", {
        errors: validation.error.format(),
      });
    }

    const { email, password } = validation.data;

    // Sign up with Supabase
    const { data: authData, error: authError } = await locals.supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${new URL(request.url).origin}/auth/login`,
      },
    });

    if (authError) {
      console.error("[sign-up] Registration failed:", authError.message);

      // Handle specific Supabase errors
      if (authError.message.includes("already registered")) {
        return errorResponse(409, "user_exists", "Użytkownik z tym adresem email już istnieje");
      }

      if (authError.message.includes("password")) {
        return errorResponse(400, "weak_password", "Hasło jest zbyt słabe");
      }

      return errorResponse(400, "registration_failed", authError.message);
    }

    if (!authData.user) {
      console.error("[sign-up] No user returned after signup");
      return errorResponse(500, "registration_failed", "Nie udało się utworzyć konta");
    }

    // Check if email confirmation is required
    const requiresEmailConfirmation = !authData.session;

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        requiresEmailConfirmation,
        message: requiresEmailConfirmation
          ? "Sprawdź swoją skrzynkę pocztową i potwierdź adres email, aby aktywować konto."
          : "Konto zostało utworzone pomyślnie.",
      }),
      {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[sign-up] Unexpected error:", error);
    return errorResponse(500, "internal_error", "Wystąpił nieoczekiwany błąd");
  }
};
