import type { APIRoute } from "astro";
import { requireAuth } from "@/lib/api/auth";
import { errorResponse } from "@/lib/errors";
import { ReportService, ReportServiceError } from "@/lib/services/ReportService";
import { z } from "zod";

export const prerender = false;

const GenerateReportSchema = z.object({
  contractId: z.string().uuid(),
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
});

export const POST: APIRoute = async ({ request, locals }) => {
  const auth = await requireAuth(request, locals);
  if (!auth.success) {
    return auth.response;
  }

  try {
    const supabase = locals.supabase;

    // Parse and validate request body
    const body = await request.json();
    const validationResult = GenerateReportSchema.safeParse(body);

    if (!validationResult.success) {
      return errorResponse(400, "validation_error", "Nieprawidłowe dane wejściowe.", {
        errors: validationResult.error.flatten(),
      });
    }

    const { contractId, month } = validationResult.data;

    // Generate report using service
    const report = await ReportService.generate(
      supabase,
      {
        role: auth.role,
        userId: auth.user.id,
      },
      contractId,
      month
    );

    return new Response(
      JSON.stringify({
        report,
        message: "Raport został wygenerowany pomyślnie.",
      }),
      {
        status: 201,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[POST /api/v1/reports/generate] Error:", error);

    if (error instanceof ReportServiceError) {
      const statusMap: Record<typeof error.code, number> = {
        REPORT_NOT_FOUND: 404,
        REPORT_FORBIDDEN: 403,
        REPORT_DUPLICATE: 409,
        CONTRACT_NOT_FOUND: 404,
        MISSING_ANCHOR_READINGS: 422,
        MISSING_MONTHLY_CONDITIONS: 422,
        DATABASE_ERROR: 500,
      };

      return errorResponse(statusMap[error.code] || 500, error.code.toLowerCase(), error.message, error.details);
    }

    return errorResponse(500, "internal_error", "Wystąpił nieoczekiwany błąd.");
  }
};

