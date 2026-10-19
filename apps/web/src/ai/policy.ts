import "server-only";
import { EXPLANATION_MAX, type ExplainModelOutput, type ExplainRequest, type ExplainResult } from "@cockpit/contract";

/**
 * Text that reads like instructions to a model rather than a marketplace error. Easy to dodge on
 * purpose: this is the last layer, behind minimised input, delimiting and the closed schema.
 */
const INSTRUCTION_LIKE = [
  /\bignore\b.{0,30}\binstructions?\b/i,
  /\b(system|assistant|developer)\s*:/i,
  /\brespond with\b/i,
  /\byou are now\b/i,
  /\baction\s*=/i,
];

export const UNUSUAL_PREFIX = "This message looks unusual and may not come from the marketplace.";

export const looksLikeInstructions = (text: string) => INSTRUCTION_LIKE.some((re) => re.test(text));

/** Deterministic checks on every parsed answer, from the model or the mock. */
export function applyPolicy(output: ExplainModelOutput, input: ExplainRequest): ExplainResult {
  const { floor, ...rest } = output;
  const result: ExplainResult = { ...rest, flagged: false };
  // The floor is read from untrusted text: keep it only when it's a plausible price.
  if (floor !== undefined && Number.isFinite(floor) && floor > 0 && floor <= input.marketPrice * 10) result.floor = floor;

  if (looksLikeInstructions(input.lastError)) {
    result.flagged = true;
    result.cause = "unknown";
    delete result.floor;
    if (result.action === "delist" || result.action === "adjust_price") result.action = "none";
    if (!/unusual|suspicious|instruction/i.test(result.explanation)) {
      result.explanation = `${UNUSUAL_PREFIX} ${result.explanation}`.slice(0, EXPLANATION_MAX);
    }
  }
  return result;
}
