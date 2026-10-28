// [U0] Vitest for pure engines (placement, planner validation, clock, store migration). Target < 5 s.
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    include: ["src/**/*.test.ts", "tests/unit/**/*.test.ts"],
    environment: "node",
    passWithNoTests: true,
    env: { TZ: "UTC" },
  },
});
