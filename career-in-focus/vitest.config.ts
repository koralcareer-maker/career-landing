import { defineConfig } from "vitest/config";

// Minimal Vitest config — keeps the test runner out of the Next.js build
// pipeline (it's invoked from `npm run build` via package.json scripts).
// Tests live next to the code they cover as `*.test.ts(x)`.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    // No `globals: true` — keep imports explicit so accidents stay loud.
    reporters: ["default"],
  },
  // Resolve `@/...` like the Next.js tsconfig path alias does.
  resolve: {
    alias: {
      "@": new URL("./src/", import.meta.url).pathname,
    },
  },
});
