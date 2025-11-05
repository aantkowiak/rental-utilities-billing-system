import { errorResponse } from "@/lib/errors";
import { MonthlyConditionServiceError } from "@/lib/services/MonthlyConditionService";

export const mapMonthlyConditionServiceError = (error: unknown): Response => {
  if (error instanceof MonthlyConditionServiceError) {
    switch (error.code) {
      case "MONTHLY_CONDITION_NOT_FOUND":
        return errorResponse(404, "monthly_condition_not_found", error.message);
      case "MONTHLY_CONDITION_FORBIDDEN":
        return errorResponse(403, "forbidden", error.message);
      case "MONTHLY_CONDITION_DUPLICATE":
        return errorResponse(409, "conflict", error.message);
      case "MONTHLY_CONDITION_LOCKED_BY_REPORTS":
        return errorResponse(422, "monthly_condition_locked", error.message);
      default:
        return errorResponse(500, "internal_error", error.message);
    }
  }

  if (error instanceof Error) {
    return errorResponse(500, "internal_error", error.message);
  }

  return errorResponse(500, "internal_error", "An unexpected error occurred");
};
