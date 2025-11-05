/**
 * Standardized error response utility for API endpoints.
 * Provides consistent error format across all API routes.
 */

interface ErrorDetails {
  [key: string]: unknown;
}

interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: ErrorDetails;
  };
}

/**
 * Creates a standardized error Response object.
 *
 * @param status - HTTP status code (400, 401, 404, 500, etc.)
 * @param code - Machine-readable error code (e.g., "invalid_json", "unauthorized")
 * @param message - Human-readable error message
 * @param details - Optional additional error details
 * @returns Response object with JSON error body
 */
export function errorResponse(
  status: number,
  code: string,
  message: string,
  details?: ErrorDetails
): Response {
  const body: ErrorResponse = {
    error: {
      code,
      message,
      ...(details && { details }),
    },
  };

  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

