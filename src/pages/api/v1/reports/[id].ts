import type { APIRoute } from "astro";
import { z } from "zod";
import type { ReportDTO, ReportEmailAttemptDTO } from "@/types";
import { requireAuth } from "@/lib/api/auth";

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

    // Get authenticated user using requireAuth
    const auth = await requireAuth(request, locals);
    if (!auth.success) {
      return auth.response;
    }

    const userId = auth.user.id;
    const userRole = auth.role;

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
    const isAdmin = userRole === "admin";
    if (!isAdmin) {
      const contracts = report.contracts as any;
      if (contracts.tenant_user_id !== userId) {
        return new Response(JSON.stringify({ code: "forbidden", message: "Brak dostępu do tego raportu." }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    const propertyId = report.property_id;

    // Fetch report items (line items)
    const { data: itemRows } = await supabase
      .from("report_items")
      .select("*")
      .eq("report_id", id)
      .order("created_at", { ascending: true });

    const lineItems = (itemRows ?? []).map((item) => ({
      id: item.id,
      label: item.label,
      amountRaw: item.amount_raw,
      description: item.description,
      category: item.category,
    }));

    // Fetch latest email attempt (most recent one, regardless of status)
    const { data: emailAttemptRows } = await supabase
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
      .limit(1);

    const emailAttempt = emailAttemptRows && emailAttemptRows.length > 0 ? emailAttemptRows[0] : null;

    const lastEmailAttempt: ReportEmailAttemptDTO | null = emailAttempt
      ? {
          id: emailAttempt.id,
          reportEmailId: emailAttempt.report_email_id,
          attemptedAt: emailAttempt.attempted_at,
          status: emailAttempt.status,
          errorMessage: emailAttempt.error_message,
        }
      : null;

    // Format report DTO
    const reportDTO: ReportDTO = {
      id: report.id,
      contractId: report.contract_id,
      propertyId,
      month: report.month.substring(0, 7),
      status: report.status,
      sent: report.sent,
      realizedAt: report.realized_at,
      createdAt: report.created_at,
      updatedAt: report.updated_at,
    };

    // Build permissions (admin only)
    const permissions = isAdmin
      ? {
          canRegenerate: report.status !== "realized",
          regenerateDisabledReason:
            report.status === "realized" ? "Nie można przeliczyć zaksięgowanego raportu." : null,
          canSendEmail: true,
          sendEmailDisabledReason: null,
          canToggleRealized: true,
          toggleRealizedDisabledReason: null,
        }
      : null;

    return new Response(
      JSON.stringify({
        report: reportDTO,
        lineItems,
        lastEmailAttempt,
        permissions,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Unexpected error in GET /api/v1/reports/[id]:", error);

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

    // Get authenticated user using requireAuth with admin check
    const auth = await requireAuth(request, locals, { requireAdmin: true });
    if (!auth.success) {
      return auth.response;
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

    return new Response(JSON.stringify({ code: "internal_error", message: "Wystąpił nieoczekiwany błąd." }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
