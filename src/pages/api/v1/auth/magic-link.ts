/* eslint-disable no-console */
import type { APIRoute } from "astro";

import { supabaseAdmin } from "@/db/supabase.client";
import { RequestMagicLinkSchema } from "@/lib/validators";

/**
 * POST /v1/auth/magic-link
 * Request a magic link email for authentication.
 * Always returns 200 to prevent user enumeration.
 *
 * TODO: Add rate limiting (5/min per IP & email)
 */
export const POST: APIRoute = async ({ request, url }) => {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validation = RequestMagicLinkSchema.safeParse(body);

    if (!validation.success) {
      // Return 400 for invalid input format
      return new Response(
        JSON.stringify({
          error: "Invalid request",
          details: validation.error.format(),
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const { email } = validation.data;

    // Generate magic link using Supabase Admin SDK
    const redirectTo = `${url.origin}/auth/callback`;

    const { error } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: {
        redirectTo,
      },
    });

    if (error) {
      // Log error internally but don't expose to client
      console.error("[magic-link] Error generating link:", error.message);
    }

    // Always return 200 to prevent user enumeration
    return new Response(JSON.stringify({ status: "sent" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Log unexpected errors
    console.error("[magic-link] Unexpected error:", error);

    // Still return 200 to prevent user enumeration
    return new Response(JSON.stringify({ status: "sent" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
};
