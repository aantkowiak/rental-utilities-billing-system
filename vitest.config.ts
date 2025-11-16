import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(fileURLToPath(new URL("./src", import.meta.url))),
    },
  },
  test: {
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    exclude: ["node_modules", "dist", "e2e"],
    // Use jsdom for components, node for everything else
    environmentMatchGlobs: [
      ["src/components/**/__tests__/**", "jsdom"],
      ["**/*.test.tsx", "jsdom"],
      ["**/*.test.ts", "node"],
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      exclude: [
        "node_modules/",
        "dist/",
        "e2e/",
        "**/*.config.{js,ts}",
        "**/*.d.ts",
        "**/__tests__/**",
        "**/tests/**",
        "**/*.test.{ts,tsx}",
        "**/*.spec.{ts,tsx}",
        "src/env.d.ts",
        "src/db/database.types.ts",
      ],
      // Target coverage thresholds from tech-stack.md
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
    // Enable parallel test execution
    pool: "threads",
    poolOptions: {
      threads: {
        singleThread: false,
      },
    },
  },
});
