import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { ExplainModelOutput, type ExplainRequest } from "@cockpit/contract";
import { z } from "zod";
import { buildUserMessage, SYSTEM_PROMPT } from "./prompt";

export type Usage = { inputTokens: number; outputTokens: number };

/** One seam for the real model and the mock. `raw` is unvalidated; the route parses it. */
export type Explainer = {
  source: "model" | "mock";
  model: string;
  explain(input: ExplainRequest, signal: AbortSignal): Promise<{ raw: unknown; usage: Usage }>;
};

export const TOOL_NAME = "report_sync_error";

const { $schema: _, ...inputSchema } = z.toJSONSchema(ExplainModelOutput) as Record<string, unknown>;

export const REPORT_TOOL: Anthropic.Tool = {
  name: TOOL_NAME,
  description: "Report the explanation, cause and one suggested action for a marketplace sync error.",
  input_schema: { ...inputSchema, type: "object" },
};

type MessagesClient = Pick<Anthropic, "messages">;

/** The SDK is passed in so tests can check the request without a network call. */
export function createModelExplainer(client: MessagesClient, model: string): Explainer {
  return {
    source: "model",
    model,
    async explain(input, signal) {
      const message = await client.messages.create(
        {
          model,
          max_tokens: 300,
          temperature: 0,
          system: SYSTEM_PROMPT,
          tools: [REPORT_TOOL],
          tool_choice: { type: "tool", name: TOOL_NAME, disable_parallel_tool_use: true },
          messages: [{ role: "user", content: buildUserMessage(input) }],
        },
        // No SDK retries: they would blow the 6 s budget. "Try again" is the retry.
        { signal, maxRetries: 0 },
      );
      const block = message.content.find((b) => b.type === "tool_use" && b.name === TOOL_NAME);
      return {
        raw: block?.type === "tool_use" ? block.input : undefined,
        usage: { inputTokens: message.usage.input_tokens, outputTokens: message.usage.output_tokens },
      };
    },
  };
}

// ---- Mock -------------------------------------------------------------------

type Rule = { test: RegExp; output: Omit<ExplainModelOutput, "floor"> };

/** Keyword rules for the invented templates. Labelled as a mock everywhere it shows. */
const RULES: Rule[] = [
  {
    test: /below the event minimum|price/i,
    output: { cause: "price_rule", action: "adjust_price", confidence: "high", explanation: "The marketplace has a minimum price for this event and your price is under it. Raise the price to list again." },
  },
  {
    test: /quantity exceeds|inventory/i,
    output: { cause: "quantity_mismatch", action: "retry", confidence: "high", explanation: "The marketplace has more tickets listed than you hold. Retrying sends your current quantity." },
  },
  {
    test: /authentication expired|reconnect/i,
    output: { cause: "auth_expired", action: "none", confidence: "high", explanation: "Your seller login on this marketplace has expired. Reconnect the account in the marketplace's settings, then retry." },
  },
  {
    test: /event mapping/i,
    output: { cause: "event_mapping", action: "retry", confidence: "medium", explanation: "The marketplace can't match this listing to one of its events. Retry once; if it fails again the event link needs fixing." },
  },
  {
    test: /timed out|upstream|unavailable/i,
    output: { cause: "marketplace_outage", action: "retry", confidence: "high", explanation: "The marketplace didn't answer in time. This is usually temporary, so retrying is safe." },
  },
  {
    test: /duplicate listing/i,
    output: { cause: "duplicate_listing", action: "delist", confidence: "medium", explanation: "These seats are already listed on this marketplace. Delist this copy so they can't sell twice." },
  },
];

const UNKNOWN: Rule["output"] = {
  cause: "unknown",
  action: "retry",
  confidence: "low",
  explanation: "This error doesn't match a known pattern and looks unusual. Retry once, then check the listing on the marketplace.",
};

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(t);
      reject(signal.reason);
    });
  });

export function createMockExplainer(latencyMs = 400): Explainer {
  return {
    source: "mock",
    model: "mock",
    async explain(input, signal) {
      await sleep(latencyMs, signal);
      const output = RULES.find((r) => r.test.test(input.lastError))?.output ?? UNKNOWN;
      const floor = output.cause === "price_rule" ? Number(/£\s?(\d+(?:\.\d+)?)/.exec(input.lastError)?.[1]) : NaN;
      return { raw: { ...output, ...(Number.isFinite(floor) && { floor }) }, usage: { inputTokens: 0, outputTokens: 0 } };
    },
  };
}
