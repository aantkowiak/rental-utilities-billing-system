/* eslint-disable no-console */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/db/database.types";
import * as dotenv from "dotenv";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load test environment variables
dotenv.config({ path: path.resolve(__dirname, "../.env.test") });

const SUPABASE_URL = process.env.SUPABASE_URL || "http://127.0.0.1:54321";
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

const E2E_USER_EMAIL = process.env.E2E_USER_EMAIL || "tenant1@example.com";

/**
 * Global teardown function to clean up test data from Supabase
 * Runs once after all tests have completed
 */
async function globalTeardown() {
  console.log("\n🧹 Starting global teardown...");
  console.log(`📧 Cleaning up data for user: ${E2E_USER_EMAIL}`);

  // Create Supabase admin client (bypasses RLS)
  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  try {
    // Step 1: Find the user by email
    console.log("🔍 Finding user by email...");
    const { data: authUser, error: authError } = await supabase.auth.admin.listUsers();

    if (authError) {
      throw new Error(`Failed to list users: ${authError.message}`);
    }

    const user = authUser.users.find((u) => u.email === E2E_USER_EMAIL);

    if (!user) {
      console.log(`⚠️  User ${E2E_USER_EMAIL} not found. Skipping cleanup.`);
      return;
    }

    console.log(`✅ Found user: ${user.id}`);

    // Step 2: Get user's profile to find associated property
    console.log("🔍 Finding user's property...");
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("property_id")
      .eq("user_id", user.id)
      .single();

    if (profileError) {
      throw new Error(`Failed to get user profile: ${profileError.message}`);
    }

    if (!profile?.property_id) {
      console.log(`⚠️  No property associated with user. Skipping cleanup.`);
      return;
    }

    console.log(`✅ Found property: ${profile.property_id}`);

    // Step 3: Delete reports for the property
    console.log("🗑️  Deleting reports...");
    const { error: reportsError, count: reportsCount } = await supabase
      .from("reports")
      .delete({ count: "exact" })
      .eq("property_id", profile.property_id);

    if (reportsError) {
      throw new Error(`Failed to delete reports: ${reportsError.message}`);
    }

    console.log(`✅ Deleted ${reportsCount || 0} report(s)`);

    // Step 4: Delete readings for the property
    console.log("🗑️  Deleting readings...");
    const { error: readingsError, count: readingsCount } = await supabase
      .from("readings")
      .delete({ count: "exact" })
      .eq("property_id", profile.property_id);

    if (readingsError) {
      throw new Error(`Failed to delete readings: ${readingsError.message}`);
    }

    console.log(`✅ Deleted ${readingsCount || 0} reading(s)`);

    console.log("\n✨ Global teardown completed successfully!");
  } catch (error) {
    console.error("\n❌ Global teardown failed:");
    console.error(error instanceof Error ? error.message : String(error));
    // Don't throw - we don't want teardown failures to fail the entire test suite
  }
}

export default globalTeardown;
