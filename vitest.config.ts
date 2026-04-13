import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    environmentMatchGlobs: [
      ["tests/components/**/*.test.ts", "jsdom"],
      ["tests/components/**/*.test.tsx", "jsdom"],
      ["tests/components/**/*.spec.ts", "jsdom"],
      ["tests/components/**/*.spec.tsx", "jsdom"],
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
