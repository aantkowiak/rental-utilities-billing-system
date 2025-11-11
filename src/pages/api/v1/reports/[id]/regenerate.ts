import type { APIRoute } from "astro";
import { createSupabaseClient } from "@/db/supabase.client";
import { AppError } from "@/lib/errors";

export const prerender = false;

export const POST: APIRoute = async ({ params, request, locals }) => {
  try {
    const supabase = createSupabaseClient(request, locals);
    const { id } = params;

    if (!id) {
      return new Response(JSON.stringify({ code: "validation_error", message: "Brak ID raportu." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

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

    // Check if user is admin
    const { data: profile } = await supabase.from("profiles").select("role").eq("user_id", user.id).single();

    if (!profile || profile.role !== "admin") {
      return new Response(
        JSON.stringify({ code: "forbidden", message: "Tylko administrator może przeliczać raporty." }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Check if report exists and is not realized
    const { data: report, error: reportError } = await supabase
      .from("reports")
      .select("id, status")
      .eq("id", id)
      .single();

    if (reportError || !report) {
      return new Response(JSON.stringify({ code: "not_found", message: "Raport nie został znaleziony." }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (report.status === "realized") {
      return new Response(
        JSON.stringify({ code: "conflict", message: "Nie można przeliczyć zaksięgowanego raportu." }),
        {
          status: 409,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // For now, return a placeholder response
    // In a real implementation, this would trigger a background job to regenerate the report
    return new Response(
      JSON.stringify({
        message: "Raport został przekazany do ponownego wygenerowania.",
        reportId: id,
      }),
      {
        status: 202,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Unexpected error in POST /api/v1/reports/[id]/regenerate:", error);

    if (error instanceof AppError) {
      return new Response(JSON.stringify({ code: error.code, message: error.message }), {
        status: error.statusCode,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ code: "internal_error", message: "Wystąpił nieoczekiwany błąd." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
