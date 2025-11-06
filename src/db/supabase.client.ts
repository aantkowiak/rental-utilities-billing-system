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

export const supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey);

export const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
