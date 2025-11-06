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
    environmentMatchGlobs: [["src/components/**/__tests__/**", "jsdom"]],
  },
});
