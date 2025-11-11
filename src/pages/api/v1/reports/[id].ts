import type { APIRoute } from "astro";
import { requireAuth } from "@/lib/api/auth";
import { errorResponse } from "@/lib/errors";
import { z } from "zod";

export const prerender = false;

const UpdateReportStatusSchema = z.object({
  status: z.enum(["realized", "unlocked"]),
});

export const GET: APIRoute = async ({ params, request, locals }) => {
  try {
    const supabase = locals.supabase;
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

    // Get user profile
    const { data: profile } = await supabase.from("profiles").select("role, user_id").eq("user_id", user.id).single();

    if (!profile) {
      return new Response(JSON.stringify({ code: "forbidden", message: "Brak uprawnień." }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Fetch report with contract info
    const { data: report, error: reportError } = await supabase
      .from("reports")
      .select(
        `
        *,
        contracts!inner(tenant_user_id, property_id)
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

    // Check permissions
    if (profile.role !== "admin") {
      const contracts = report.contracts as any;
      if (contracts.tenant_user_id !== user.id) {
        return new Response(JSON.stringify({ code: "forbidden", message: "Brak dostępu do tego raportu." }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // Fetch latest email attempt
    const { data: emailAttempt } = await supabase
      .from("report_email_attempts")
      .select(
        `
        id,
        report_email_id,
        attempted_at,
        status,
        error_message,
        report_emails!inner(report_id)
      `
      )
      .eq("report_emails.report_id", id)
      .order("attempted_at", { ascending: false })
      .limit(1)
      .single();

    // Format response
    const reportDTO = {
      id: report.id,
      contractId: report.contract_id,
      month: report.month.substring(0, 7),
      status: report.status,
      sent: report.sent,
      realizedAt: report.realized_at,
      createdAt: report.created_at,
      updatedAt: report.updated_at,
    };

    const emailAttemptDTO = emailAttempt
      ? {
          id: emailAttempt.id,
          reportEmailId: emailAttempt.report_email_id,
          attemptedAt: emailAttempt.attempted_at,
          status: emailAttempt.status,
          errorMessage: emailAttempt.error_message,
        }
      : null;

    return new Response(
      JSON.stringify({
        report: reportDTO,
        lastEmailAttempt: emailAttemptDTO,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Unexpected error in GET /api/v1/reports/[id]:", error);

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

export const PATCH: APIRoute = async ({ params, request, locals }) => {
  try {
    const supabase = locals.supabase;
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
        JSON.stringify({ code: "forbidden", message: "Tylko administrator może zmieniać status raportu." }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validationResult = UpdateReportStatusSchema.safeParse(body);

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

    const { status } = validationResult.data;

    // Update report status
    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === "realized") {
      updateData.realized_at = new Date().toISOString();
    } else if (status === "unlocked") {
      updateData.realized_at = null;
    }

    const { error: updateError } = await supabase.from("reports").update(updateData).eq("id", id);

    if (updateError) {
      console.error("Error updating report status:", updateError);
      return new Response(
        JSON.stringify({ code: "internal_error", message: "Nie udało się zaktualizować statusu raportu." }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify({ message: "Status raportu został zaktualizowany." }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Unexpected error in PATCH /api/v1/reports/[id]:", error);

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
