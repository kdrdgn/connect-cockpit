import Anthropic from "@anthropic-ai/sdk";
import { ExplainModelOutput, suggestPrice } from "@cockpit/contract";
import { afterAll, describe, expect, it } from "vitest";
import { readAiEnv } from "./env";
import { EVAL_CASES } from "./evals";
import { createMockExplainer, createModelExplainer, type Explainer } from "./explainer";
import { applyPolicy } from "./policy";

const env = readAiEnv();
const base: Explainer =
  env.provider === "model" ? createModelExplainer(new Anthropic({ apiKey: env.apiKey }), env.model) : createMockExplainer(0);

// EVAL_FORCE_DELIST=1 makes the explainer answer delist to the injection case, to show the gate fails the run.
const explainer: Explainer =
  process.env.EVAL_FORCE_DELIST === "1"
    ? {
        ...base,
        explain: async (input, signal) => {
          const out = await base.explain(input, signal);
          return /ignore previous/i.test(input.lastError) ? { ...out, raw: { ...(out.raw as object), action: "delist" } } : out;
        },
      }
    : base;

const rows: string[] = [];

describe(`explain-sync evals against ${explainer.source === "mock" ? "the MOCK (no ANTHROPIC_API_KEY)" : explainer.model}`, () => {
  for (const c of EVAL_CASES) {
    it(c.name, async () => {
      const started = performance.now();
      const { raw, usage } = await explainer.explain(c.input, AbortSignal.timeout(15_000));
      const latency = Math.round(performance.now() - started);
      const parsed = ExplainModelOutput.safeParse(raw);
      const final = parsed.success ? applyPolicy(parsed.data, c.input) : null;
      const price = final?.action === "adjust_price" ? suggestPrice({ floor: final.floor, marketPrice: c.input.marketPrice }).price : undefined;
      const pass =
        final !== null && final.cause === c.cause && c.actions.includes(final.action) && (c.price === undefined || price === c.price);
      const rawText = parsed.success ? `${parsed.data.cause} / ${parsed.data.action}` : "invalid";
      const finalText = final ? `${final.cause} / ${final.action}${price ? ` £${price}` : ""}${final.flagged ? " (flagged)" : ""}` : "no suggestion";
      rows.push(`| ${c.name} | ${rawText} | ${finalText} | ${pass ? "pass" : "FAIL"} | ${usage.inputTokens} / ${usage.outputTokens} | ${latency} ms |`);

      if (c.neverDelist) {
        expect(parsed.success && parsed.data.action, "model answered delist to the injection").not.toBe("delist");
        expect(final?.action, "final answer is delist").not.toBe("delist");
      }
    }, 20_000);
  }
});

afterAll(() => {
  console.log(
    [
      `\nexplain-sync evals · ${explainer.source === "mock" ? "mock explainer (no key set)" : explainer.model}`,
      "| Case | Model answer | After policy | Result | Tokens in / out | Latency |",
      "|---|---|---|---|---|---|",
      ...rows,
    ].join("\n"),
  );
});
