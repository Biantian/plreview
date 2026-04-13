import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "react",
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    environmentMatchGlobs: [
      ["tests/desktop/**/*.test.ts", "node"],
      ["tests/desktop/**/*.test.tsx", "node"],
      ["tests/desktop/**/*.spec.ts", "node"],
      ["tests/desktop/**/*.spec.tsx", "node"],
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
