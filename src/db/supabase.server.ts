import { createServerClient } from "@supabase/ssr";
import type { AstroCookies } from "astro";

import { type Database } from "./database.types";

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

/**
 * Creates a Supabase client for server-side use with proper cookie handling.
 * This client will automatically use the user's session from cookies.
 * Use this for authenticated requests.
 */
export const createSupabaseServerClient = (cookies: AstroCookies) => {
  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        // Astro cookies object doesn't provide getAll(), so we return an empty array
        // The library will fall back to using get() for specific cookie names
        return [];
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookies.set(name, value, options);
        });
      },
      get(name: string) {
        const cookie = cookies.get(name);
        return cookie?.value;
      },
      set(name: string, value: string, options: Record<string, unknown>) {
        cookies.set(name, value, options);
      },
      remove(name: string, options: Record<string, unknown>) {
        cookies.delete(name, options);
      },
    },
  });
};

/**
 * Creates a Supabase admin client using service role key.
 * This bypasses RLS and should only be used for admin operations
 * that require elevated privileges.
 *
 * WARNING: Use sparingly and never with user-provided data without validation.
 */
export const createSupabaseAdminClient = () => {
  return createServerClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
    cookies: {
      get() {
        return undefined;
      },
      set() {
        // Admin client doesn't use cookies
      },
      remove() {
        // Admin client doesn't use cookies
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

export type SupabaseClient = ReturnType<typeof createSupabaseServerClient>;
export type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>;
