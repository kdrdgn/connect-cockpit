import "server-only";

export const DEFAULT_MODEL = "claude-haiku-5-5";

export type AiEnv = { provider: "model"; apiKey: string; model: string } | { provider: "mock"; model: "mock" };

/** Read per request, so a changed .env.local or a test's override applies without a restart. */
export function readAiEnv(env: NodeJS.ProcessEnv = process.env): AiEnv {
  const apiKey = env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey || env.AI_PROVIDER === "mock") return { provider: "mock", model: "mock" };
  return { provider: "model", apiKey, model: env.AI_MODEL?.trim() || DEFAULT_MODEL };
}
