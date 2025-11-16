/// <reference types="astro/client" />

import type { User } from "@supabase/supabase-js";
import type { SupabaseClient } from "./db/supabase.server.ts";

declare global {
  namespace App {
    interface Locals {
      supabase: SupabaseClient;
      auth: {
        user: User;
        role: "tenant" | "admin";
        propertyId: string | null;
      } | null;
    }
  }
}

interface ImportMetaEnv {
  readonly SUPABASE_URL: string;
  readonly SUPABASE_KEY: string;
  readonly SUPABASE_SERVICE_ROLE_KEY: string;
  readonly OPENROUTER_API_KEY: string;
  readonly SERVICE_ROLE_KEY: string;
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
