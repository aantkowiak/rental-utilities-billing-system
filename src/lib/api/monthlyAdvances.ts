import { errorResponse } from "@/lib/errors";
import { MonthlyAdvanceServiceError } from "@/lib/services/MonthlyAdvanceService";

export const mapMonthlyAdvanceServiceError = (error: unknown): Response => {
  if (error instanceof MonthlyAdvanceServiceError) {
    switch (error.code) {
      case "MONTHLY_ADVANCE_NOT_FOUND":
        return errorResponse(404, "monthly_advance_not_found", error.message);
      case "MONTHLY_ADVANCE_FORBIDDEN":
        return errorResponse(403, "forbidden", error.message);
      case "MONTHLY_ADVANCE_DUPLICATE":
        return errorResponse(409, "conflict", error.message);
      case "MONTHLY_ADVANCE_LOCKED_BY_REPORTS":
        return errorResponse(422, "monthly_advance_locked", error.message);
      default:
        return errorResponse(500, "internal_error", error.message);
    }
  }

  if (error instanceof Error) {
    return errorResponse(500, "internal_error", error.message);
  }

  return errorResponse(500, "internal_error", "An unexpected error occurred");
};
