import "server-only";
import {
  type ApiErrorBody,
  ExplainModelOutput,
  ExplainRequest,
  type ExplainResponse,
  type ExplainFailure,
  type ExplainMeta,
} from "@cockpit/contract";
import type { ExplainCache } from "./cache";
import type { Explainer, Usage } from "./explainer";
import { applyPolicy } from "./policy";
import { sanitiseError } from "./prompt";

/** Under the client's 6 s, so the server can still answer "timeout" before the client gives up. */
export const SERVER_TIMEOUT_MS = 5_500;
const MAX_BODY_BYTES = 4_096;

const STATUS: Record<ExplainFailure, number> = { invalid_output: 200, timeout: 504, model_error: 502 };

type Deps = { explainer: Explainer; cache: ExplainCache; now?: () => number; log?: (msg: string, data: object) => void };

const json = (body: ExplainResponse | { error: ApiErrorBody }, status = 200) => Response.json(body, { status });
const invalid = (message: string) => json({ error: { code: "VALIDATION", message, retryable: false } }, 400);

class Timeout extends Error {}

/** Runs `explain` with its own abort, so a hung model call ends at SERVER_TIMEOUT_MS. */
async function withTimeout<T>(run: (signal: AbortSignal) => Promise<T>, outer: AbortSignal | undefined): Promise<T> {
  const controller = new AbortController();
  const onAbort = () => controller.abort(outer?.reason);
  outer?.addEventListener("abort", onAbort);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort(new Timeout());
      reject(new Timeout());
    }, SERVER_TIMEOUT_MS);
  });
  try {
    return await Promise.race([run(controller.signal), timeout]);
  } finally {
    clearTimeout(timer);
    outer?.removeEventListener("abort", onAbort);
  }
}

export async function handleExplain(request: Request, deps: Deps): Promise<Response> {
  const { explainer, cache, now = Date.now, log = (msg, data) => console.warn(msg, data) } = deps;
  const started = now();

  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return invalid("Request body is too large");
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return invalid("Request body is not JSON");
  }
  const parsed = ExplainRequest.safeParse(body);
  if (!parsed.success) return invalid(parsed.error.issues[0]?.message ?? "Invalid request");
  const input = parsed.data;

  const meta = (cached: boolean, usage: Usage = { inputTokens: 0, outputTokens: 0 }): ExplainMeta => ({
    source: explainer.source,
    cached,
    ...usage,
    latencyMs: now() - started,
  });

  const key = cache.key(explainer.model, input.marketplace, sanitiseError(input.lastError));
  const hit = cache.get(key);
  if (hit) return json({ result: hit, meta: meta(true) });

  const fail = (reason: ExplainFailure, usage?: Usage, raw?: unknown) => {
    log("explain-sync failed", { reason, marketplace: input.marketplace, raw: JSON.stringify(raw ?? null).slice(0, 500) });
    return json({ result: null, reason, meta: meta(false, usage) }, STATUS[reason]);
  };

  let answer: Awaited<ReturnType<Explainer["explain"]>>;
  try {
    answer = await withTimeout((signal) => explainer.explain(input, signal), request.signal);
  } catch (e) {
    return fail(e instanceof Timeout ? "timeout" : "model_error");
  }

  const output = ExplainModelOutput.safeParse(answer.raw);
  if (!output.success) return fail("invalid_output", answer.usage, answer.raw);

  const result = applyPolicy(output.data, input);
  cache.set(key, result);
  return json({ result, meta: meta(false, answer.usage) });
}
