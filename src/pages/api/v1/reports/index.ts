import type { APIRoute } from "astro";
import { requireAuth } from "@/lib/api/auth";
import { errorResponse } from "@/lib/errors";
import { z } from "zod";

export const prerender = false;

const ListReportsQuerySchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
    .optional(),
});

export const GET: APIRoute = async ({ request, locals, url }) => {
  const auth = await requireAuth(request, locals);
  if (!auth.success) {
    return auth.response;
  }

  try {
    const supabase = locals.supabase;

    //Parse query parameters
    const rawQuery = {
      month: url.searchParams.get("month") ?? undefined,
    };

    const validation = ListReportsQuerySchema.safeParse(rawQuery);
    if (!validation.success) {
      return errorResponse(400, "validation_error", "Invalid query parameters", {
        errors: validation.error.format(),
      });
    }

    const { month } = validation.data;

    // Build query based on role
    let query = supabase
      .from("reports")
      .select(
        `
        id,
        contract_id,
        month,
        status,
        sent,
        realized_at,
        created_at,
        updated_at,
        contracts!inner(id, property_id, tenant_user_id)
      `
      )
      .order("month", { ascending: false });

    // Apply filters based on role
    if (auth.role === "admin") {
      // Admin can see all reports, optionally filtered by month
      if (month) {
        query = query.eq("month", `${month}-01`);
      }
    } else if (auth.role === "tenant") {
      // Tenant can only see their own reports
      query = query.eq("contracts.tenant_user_id", auth.user.id);

      if (month) {
        query = query.eq("month", `${month}-01`);
      }
    } else {
      return errorResponse(403, "forbidden", "Unknown user role");
    }

    const { data: reports, error: reportsError } = await query;

    if (reportsError) {
      console.error("[GET /v1/reports] Error fetching reports:", reportsError);
      return errorResponse(500, "internal_error", "Failed to list reports");
    }

    // Fetch email attempts for each report
    const reportIds = reports?.map((r) => r.id) || [];
    const { data: emailAttempts } = await supabase
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
      .in("report_emails.report_id", reportIds.length > 0 ? reportIds : ["00000000-0000-0000-0000-000000000000"])
      .order("attempted_at", { ascending: false });

    // Map email attempts to reports
    const emailAttemptsMap = new Map<string, (typeof emailAttempts)[0] | null>();
    if (emailAttempts) {
      for (const attempt of emailAttempts) {
        const reportId = (attempt.report_emails as any).report_id;
        if (!emailAttemptsMap.has(reportId)) {
          emailAttemptsMap.set(reportId, attempt);
        }
      }
    }

    // Format response items
    const items = (reports || []).map((report: any) => {
      const lastEmailAttempt = emailAttemptsMap.get(report.id);

      // Basic report DTO
      const reportDTO = {
        id: report.id,
        contractId: report.contract_id,
        month: report.month.substring(0, 7), // Convert "YYYY-MM-DD" to "YYYY-MM"
        status: report.status,
        sent: report.sent,
        realizedAt: report.realized_at,
        createdAt: report.created_at,
        updatedAt: report.updated_at,
      };

      // Format email attempt if exists
      const emailAttemptDTO = lastEmailAttempt
        ? {
            id: lastEmailAttempt.id,
            reportEmailId: lastEmailAttempt.report_email_id,
            attemptedAt: lastEmailAttempt.attempted_at,
            status: lastEmailAttempt.status,
            errorMessage: lastEmailAttempt.error_message,
          }
        : null;

      // Calculate permissions
      const permissions = calculatePermissions(report, auth.role);

      return {
        report: reportDTO,
        lastEmailAttempt: emailAttemptDTO,
        permissions,
      };
    });

    return new Response(JSON.stringify({ items }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[GET /v1/reports] Unexpected error:", error);
    return errorResponse(500, "internal_error", "An unexpected error occurred");
  }
};

function calculatePermissions(report: any, role: string) {
  const isRealized = report.status === "realized";
  const isDraft = report.status === "draft";

  if (role === "admin") {
    return {
      canGenerate: true,
      generateDisabledReason: null,
      canRegenerate: !isRealized,
      regenerateDisabledReason: isRealized ? "Nie można przeliczyć zaksięgowanego raportu." : null,
      canSendEmail: true,
      sendEmailDisabledReason: null,
      canToggleRealized: true,
      toggleRealizedDisabledReason: null,
    };
  }

  if (role === "tenant") {
    return {
      canGenerate: isDraft,
      generateDisabledReason: isDraft ? null : "Raport został już wygenerowany.",
      canSendEmail: !isDraft,
      sendEmailDisabledReason: isDraft ? "Raport musi być najpierw wygenerowany." : null,
    };
  }

  return null;
}
