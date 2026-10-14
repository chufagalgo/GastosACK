import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    // "server-only" lanza un error fuera de React Server Components; en los tests no hace falta.
    alias: { "server-only": new URL("./tests/stubs/empty.ts", import.meta.url).pathname },
  },
  test: { include: ["src/**/*.test.ts", "tests/**/*.test.ts"] },
});
