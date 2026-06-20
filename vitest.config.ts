import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname),
      // Next.js stubs these bundler markers at build time; vitest's node
      // resolution can't, so map them to a no-op so server modules import.
      "server-only": path.resolve(__dirname, "test/server-only-stub.ts"),
      "client-only": path.resolve(__dirname, "test/server-only-stub.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["lib/__tests__/**/*.test.ts"],
  },
});
