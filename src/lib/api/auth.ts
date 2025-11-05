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

const DEFAULT_TEST_USER_ID = "ab67e555-a882-4a6c-85de-edc362ee10e6";
const DEFAULT_TEST_ROLE: UserRole = "admin";

const buildHardcodedAuth = (): { user: User; role: UserRole; propertyId: string | null } => {
  const userId = import.meta.env.TEST_AUTH_USER_ID ?? DEFAULT_TEST_USER_ID;
  const rawRole = import.meta.env.TEST_AUTH_ROLE;
  const role: UserRole = rawRole === "tenant" ? "tenant" : DEFAULT_TEST_ROLE;
  const propertyId = import.meta.env.TEST_AUTH_PROPERTY_ID ?? null;

  const user = {
    id: userId,
    app_metadata: {},
    user_metadata: {},
  } as unknown as User;

  return { user, role, propertyId };
};

export const requireAuth = async (
  _request: Request,
  _locals: App.Locals,
  options: AuthOptions = {}
): Promise<AuthSuccess | AuthFailure> => {
  const { user, role, propertyId } = buildHardcodedAuth();

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
