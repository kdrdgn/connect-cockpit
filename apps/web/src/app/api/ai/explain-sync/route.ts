import Anthropic from "@anthropic-ai/sdk";
import { createExplainCache } from "@/ai/cache";
import { readAiEnv } from "@/ai/env";
import { createMockExplainer, createModelExplainer, type Explainer } from "@/ai/explainer";
import { handleExplain } from "@/ai/handle";

const cache = createExplainCache();
const mock = createMockExplainer();
let model: { key: string; name: string; explainer: Explainer } | null = null;

function explainer(): Explainer {
  const env = readAiEnv();
  if (env.provider === "mock") return mock;
  if (model?.key !== env.apiKey || model.name !== env.model) {
    model = { key: env.apiKey, name: env.model, explainer: createModelExplainer(new Anthropic({ apiKey: env.apiKey }), env.model) };
  }
  return model.explainer;
}

export async function POST(request: Request) {
  return handleExplain(request, { explainer: explainer(), cache });
}
