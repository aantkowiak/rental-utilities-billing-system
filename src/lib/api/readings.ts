import { errorResponse } from "@/lib/errors";
import { ReadingsServiceError, type UserRole } from "@/lib/services/ReadingsService";

interface TenantAccessGuardOptions {
  role: UserRole;
  tenantPropertyId: string | null;
  targetPropertyId: string;
}

export const guardTenantPropertyAccess = ({
  role,
  tenantPropertyId,
  targetPropertyId,
}: TenantAccessGuardOptions): Response | null => {
  if (role !== "tenant") {
    return null;
  }

  if (tenantPropertyId && tenantPropertyId !== targetPropertyId) {
    return errorResponse(403, "forbidden", "Tenant does not have access to the requested property");
  }

  return null;
};

export const mapReadingsServiceError = (error: unknown): Response => {
  if (error instanceof ReadingsServiceError) {
    switch (error.code) {
      case "READING_NOT_FOUND":
        return errorResponse(404, "reading_not_found", error.message);
      case "READING_FORBIDDEN":
      case "READING_WINDOW_VIOLATION":
        return errorResponse(403, "forbidden", error.message);
      case "READING_DUPLICATE_REPLACEMENT":
      case "READING_PROPERTY_MISMATCH":
        return errorResponse(409, "conflict", error.message);
      default:
        return errorResponse(500, "internal_error", error.message || "An unexpected error occurred");
    }
  }

  if (error instanceof Error) {
    return errorResponse(500, "internal_error", error.message);
  }

  return errorResponse(500, "internal_error", "An unexpected error occurred");
};

export const toMonthStart = (isoDate: string): string | null => {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const monthStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  return monthStart.toISOString().split("T")[0];
};
