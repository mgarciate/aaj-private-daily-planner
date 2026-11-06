import { defineConfig } from "vitest/config";

Object.assign(process.env, { NODE_ENV: "test" });

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
  },
});
