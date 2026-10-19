import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";
import { defineConfig } from "vitest/config";

const envFile = fileURLToPath(new URL("./.env.local", import.meta.url));

// Real model calls; kept out of `pnpm test`. Reads ANTHROPIC_API_KEY from .env.local like Next does.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./node_modules/server-only/empty.js", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/ai/**/*.eval.ts"],
    // The results table is the point of the run, so show logs from passing tests too.
    silent: false,
    reporters: ["verbose"],
    env: existsSync(envFile) ? (parseEnv(readFileSync(envFile, "utf8")) as Record<string, string>) : {},
  },
});
