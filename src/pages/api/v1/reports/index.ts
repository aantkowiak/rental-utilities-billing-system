/* eslint-disable no-console */
import type { APIRoute } from "astro";
import { requireAuth } from "@/lib/api/auth";
import { errorResponse } from "@/lib/errors";
import { z } from "zod";

export const prerender = false;

const ListReportsQuerySchema = z.object({
  propertyId: z.string().uuid().optional(),
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
      propertyId: url.searchParams.get("propertyId") ?? undefined,
    };

    const validation = ListReportsQuerySchema.safeParse(rawQuery);
    if (!validation.success) {
      return errorResponse(400, "validation_error", "Invalid query parameters", {
        errors: validation.error.format(),
      });
    }

    const { propertyId } = validation.data;

    // Build query based on role
    let query = supabase
      .from("reports")
      .select(
        `
        id,
        contract_id,
        property_id,
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
      // Admin can see all reports, optionally filtered by property
      if (propertyId) {
        query = query.eq("property_id", propertyId);
      }
    } else if (auth.role === "tenant") {
      // Tenant can only see their own reports
      query = query.eq("contracts.tenant_user_id", auth.user.id);

      if (propertyId) {
        query = query.eq("property_id", propertyId);
      }
    } else {
      return errorResponse(403, "forbidden", "Unknown user role");
    }

    const { data: reports, error: reportsError } = await query;

    if (reportsError) {
      console.error("[GET /v1/reports] Error fetching reports:", reportsError);
      return errorResponse(500, "internal_error", "Failed to list reports");
    }

    const reportRows = reports ?? [];
    const reportIds = reportRows.map((r) => r.id);
    const propertyIds = Array.from(new Set(reportRows.map((r) => r.property_id)));
    const monthIsoSet = Array.from(new Set(reportRows.map((r) => r.month)));

    // Aggregate amounts from report_items
    const amountMap = new Map<string, number>();
    if (reportIds.length > 0) {
      const { data: itemRows, error: itemsError } = await supabase
        .from("report_items")
        .select("report_id, amount_raw")
        .in("report_id", reportIds);

      if (itemsError) {
        console.error("[GET /v1/reports] Error fetching report items:", itemsError);
      } else if (itemRows) {
        for (const item of itemRows) {
          const current = amountMap.get(item.report_id) ?? 0;
          const amount = Number(item.amount_raw) || 0;
          amountMap.set(item.report_id, current + amount);
        }
      }
    }

    // Fetch monthly advances for property/month pairs
    const advanceMap = new Map<string, number>();
    if (propertyIds.length > 0 && monthIsoSet.length > 0) {
      const { data: advances, error: advancesError } = await supabase
        .from("monthly_advances")
        .select("property_id, month, advance_payment")
        .in("property_id", propertyIds)
        .in("month", monthIsoSet);

      if (advancesError) {
        console.error("[GET /v1/reports] Error fetching monthly advances:", advancesError);
      } else if (advances) {
        for (const advance of advances) {
          const key = `${advance.property_id}:${advance.month}`;
          advanceMap.set(key, Number(advance.advance_payment) || 0);
        }
      }
    }

    // Fetch last successful email send per report
    const lastSentMap = new Map<string, string | null>();
    if (reportIds.length > 0) {
      const { data: attempts, error: attemptsError } = await supabase
        .from("report_email_attempts")
        .select(
          `
          attempted_at,
          status,
          report_emails!inner(report_id)
        `
        )
        .in("report_emails.report_id", reportIds)
        .order("attempted_at", { ascending: false });

      if (attemptsError) {
        console.error("[GET /v1/reports] Error fetching email attempts:", attemptsError);
      } else if (attempts) {
        for (const attempt of attempts) {
          const reportId = (attempt.report_emails as any).report_id;
          if (attempt.status === "success" && !lastSentMap.has(reportId)) {
            lastSentMap.set(reportId, attempt.attempted_at);
          }
        }
      }
    }

    // Format response items
    const items = reportRows.map((report: any) => {
      const totalAmount = amountMap.get(report.id) ?? 0;
      const advanceKey = `${report.property_id}:${report.month}`;
      const advancePayment = advanceMap.get(advanceKey) ?? 0;
      // Balance = advancePayment - actualRent (per PRD FR-011)
      // Positive balance = tenant overpaid (refund)
      // Negative balance = tenant underpaid (additional payment required)
      const balanceRaw = advancePayment - totalAmount;

      return {
        report: {
          id: report.id,
          contractId: report.contract_id,
          propertyId: report.property_id,
          month: report.month.substring(0, 7), // Convert "YYYY-MM-DD" to "YYYY-MM"
          status: report.status,
          sent: report.sent,
          realizedAt: report.realized_at,
          createdAt: report.created_at,
          updatedAt: report.updated_at,
          lastSentAt: lastSentMap.get(report.id) ?? null,
          balanceRaw,
        },
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
