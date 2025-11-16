/**
 * @deprecated This file is deprecated. Use supabase.server.ts instead.
 * 
 * The clients defined here do not properly handle per-request authentication.
 * For server-side code (API routes, middleware), use:
 * - createSupabaseServerClient() for authenticated requests
 * - createSupabaseAdminClient() for admin operations
 * 
 * This file is kept for backward compatibility but should not be used.
 */

import { createClient } from "@supabase/supabase-js";

import type { Database } from "../db/database.types.ts";

const resolveEnv = (value: string | undefined, fallback: string, name: string): string => {
  if (value && value.length > 0) {
    return value;
  }

  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.warn(`[supabase] Missing ${name}; falling back to local stub value for development.`);
    return fallback;
  }

  throw new Error(`Missing required environment variable ${name}`);
};

const supabaseUrl = resolveEnv(import.meta.env.SUPABASE_URL, "http://localhost", "SUPABASE_URL");
const supabaseAnonKey = resolveEnv(import.meta.env.SUPABASE_KEY, "test-anon-key", "SUPABASE_KEY");
const supabaseServiceRoleKey = resolveEnv(
  import.meta.env.SUPABASE_SERVICE_ROLE_KEY,
  "test-service-role",
  "SUPABASE_SERVICE_ROLE_KEY"
);

// Client with session persistence for authenticated requests
/** @deprecated Use createSupabaseServerClient() from supabase.server.ts */
export const supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// Admin client without session (uses service role key)
/** @deprecated Use createSupabaseAdminClient() from supabase.server.ts */
export const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

