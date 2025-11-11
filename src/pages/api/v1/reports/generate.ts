import type { APIRoute } from "astro";
import { createSupabaseClient } from "@/db/supabase.client";
import { AppError } from "@/lib/errors";
import { z } from "zod";

export const prerender = false;

const GenerateReportSchema = z.object({
  contractId: z.string().uuid(),
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
});

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const supabase = createSupabaseClient(request, locals);

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ code: "unauthorized", message: "Nie jesteś zalogowany." }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = GenerateReportSchema.safeParse(body);

    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          code: "validation_error",
          message: "Nieprawidłowe dane wejściowe.",
          details: validationResult.error.flatten(),
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const { contractId, month } = validationResult.data;

    // Check if user has permission
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, user_id")
      .eq("user_id", user.id)
      .single();

    if (!profile) {
      return new Response(
        JSON.stringify({ code: "forbidden", message: "Brak uprawnień." }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Admins can generate any report, tenants can only generate their own
    if (profile.role !== "admin") {
      const { data: contract } = await supabase
        .from("contracts")
        .select("tenant_user_id")
        .eq("id", contractId)
        .single();

      if (!contract || contract.tenant_user_id !== user.id) {
        return new Response(
          JSON.stringify({ code: "forbidden", message: "Brak uprawnień do tego kontraktu." }),
          {
            status: 403,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    }

    // For now, return a placeholder response
    // In a real implementation, this would trigger a background job to generate the report
    return new Response(
      JSON.stringify({ 
        message: "Raport został przekazany do generowania.",
        contractId,
        month,
      }),
      {
        status: 202,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Unexpected error in POST /api/v1/reports/generate:", error);

    if (error instanceof AppError) {
      return new Response(JSON.stringify({ code: error.code, message: error.message }), {
        status: error.statusCode,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ code: "internal_error", message: "Wystąpił nieoczekiwany błąd." }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

