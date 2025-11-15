import type { APIRoute } from "astro";
import { requireAuth } from "@/lib/api/auth";

export const prerender = false;

export const POST: APIRoute = async ({ params, request, locals }) => {
  try {
    const supabase = locals.supabase;
    const { id } = params;

    if (!id) {
      return new Response(JSON.stringify({ code: "validation_error", message: "Brak ID raportu." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get authenticated user using requireAuth
    const auth = await requireAuth(request, locals);
    if (!auth.success) {
      return auth.response;
    }

    const userId = auth.user.id;
    const userRole = auth.role;

    // Check if report exists
    const { data: report, error: reportError } = await supabase
      .from("reports")
      .select(
        `
        id,
        status,
        contracts!inner(tenant_user_id)
      `
      )
      .eq("id", id)
      .single();

    if (reportError || !report) {
      return new Response(JSON.stringify({ code: "not_found", message: "Raport nie został znaleziony." }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Check permissions - admin can send any report, tenant can only send their own
    if (userRole !== "admin") {
      const contracts = report.contracts as any;
      if (contracts.tenant_user_id !== userId) {
        return new Response(JSON.stringify({ code: "forbidden", message: "Brak dostępu do tego raportu." }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // For now, return a placeholder response
    // In a real implementation, this would trigger an email send
    return new Response(
      JSON.stringify({
        message: "E-mail z raportem został wysłany.",
        reportId: id,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Unexpected error in POST /api/v1/reports/[id]/send-email:", error);

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
