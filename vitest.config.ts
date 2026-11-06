import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

Object.assign(process.env, { NODE_ENV: "test" });

export default defineConfig({
  resolve: {
    // Tests run outside Next's React Server Components resolver. Keep the
    // production `server-only` marker intact and replace it only in Vitest.
    alias: {
      "server-only": fileURLToPath(
        new URL("./tests/stubs/server-only.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
  },
});
