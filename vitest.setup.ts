import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// Setup environment variables for tests
const env = (
  globalThis as typeof globalThis & {
    process?: { env?: Record<string, string | undefined> };
  }
).process?.env;

if (env) {
  env.SUPABASE_URL ??= "http://localhost";
  env.SUPABASE_KEY ??= "test-anon-key";
  env.SUPABASE_SERVICE_ROLE_KEY ??= "test-service-role";
}

// Cleanup after each test (for React component tests)
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
