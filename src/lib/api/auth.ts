import type { User } from "@supabase/supabase-js";

import { errorResponse } from "@/lib/errors";
import type { UserRole } from "@/lib/services/ReadingsService";

interface AuthOptions {
  requireAdmin?: boolean;
}

interface AuthSuccess {
  success: true;
  user: User;
  role: UserRole;
  propertyId: string | null;
}

interface AuthFailure {
  success: false;
  response: Response;
}

export const requireAuth = async (
  _request: Request,
  locals: App.Locals,
  options: AuthOptions = {}
): Promise<AuthSuccess | AuthFailure> => {
  // Check if auth was set by middleware
  if (!locals.auth) {
    return {
      success: false,
      response: errorResponse(401, "unauthorized", "Authentication required"),
    };
  }

  const { user, role, propertyId } = locals.auth;

  // Check admin requirement
  if (options.requireAdmin && role !== "admin") {
    return {
      success: false,
      response: errorResponse(403, "forbidden", "Insufficient permissions"),
    };
  }

  return {
    success: true,
    user,
    role,
    propertyId,
  };
};
