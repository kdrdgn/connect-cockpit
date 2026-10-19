import { z } from "zod";
import { type Listing, Marketplace } from "./listing";

// ---- Request ----------------------------------------------------------------

/**
 * What the client may send to explain one marketplace's error. Strict and without
 * event, venue or ids, so listing text can't reach the model by accident.
 */
export const ExplainRequest = z.strictObject({
  marketplace: Marketplace,
  lastError: z.string().min(1).max(2_000),
  price: z.number().positive(),
  marketPrice: z.number().positive(),
  quantity: z.number().int().nonnegative(),
  listedQuantity: z.number().int().nonnegative().optional(),
});
export type ExplainRequest = z.infer<typeof ExplainRequest>;

/** Builds the request from a listing, copying only the allowed fields. Null when the marketplace isn't in error. */
export function toExplainRequest(listing: Listing, marketplace: Marketplace): ExplainRequest | null {
  const entry = listing.sync[marketplace];
  if (entry.state !== "error" || !entry.lastError) return null;
  return {
    marketplace,
    lastError: entry.lastError.slice(0, 2_000),
    price: listing.price,
    marketPrice: listing.marketPrice,
    quantity: listing.quantity,
    ...(entry.listedQuantity !== undefined && { listedQuantity: entry.listedQuantity }),
  };
}

// ---- Model output -----------------------------------------------------------

export const EXPLAIN_CAUSES = [
  "price_rule",
  "quantity_mismatch",
  "auth_expired",
  "event_mapping",
  "marketplace_outage",
  "duplicate_listing",
  "unknown",
] as const;
export const ExplainCause = z.enum(EXPLAIN_CAUSES);
export type ExplainCause = z.infer<typeof ExplainCause>;

export const EXPLAIN_ACTIONS = ["retry", "adjust_price", "delist", "none"] as const;
export const ExplainAction = z.enum(EXPLAIN_ACTIONS);
export type ExplainAction = z.infer<typeof ExplainAction>;

export const EXPLANATION_MAX = 280;

/** Everything the model is allowed to say. No ids, no marketplace, no final price. */
export const ExplainModelOutput = z.strictObject({
  explanation: z.string().min(1).max(EXPLANATION_MAX).describe("Plain words for a ticket broker. No prices or quantities."),
  cause: ExplainCause,
  action: ExplainAction.describe("Exactly one action for the broker to confirm."),
  confidence: z.enum(["low", "medium", "high"]),
  floor: z.number().positive().optional().describe("A minimum price stated in the error, in GBP, if any."),
});
export type ExplainModelOutput = z.infer<typeof ExplainModelOutput>;

// ---- Route response ---------------------------------------------------------

/** The model output after the server's policy check. `flagged`: the error text looked like instructions. */
export const ExplainResult = ExplainModelOutput.extend({ flagged: z.boolean() });
export type ExplainResult = z.infer<typeof ExplainResult>;

export const EXPLAIN_FAILURES = ["timeout", "invalid_output", "model_error"] as const;
export type ExplainFailure = (typeof EXPLAIN_FAILURES)[number];

export const ExplainMeta = z.object({
  source: z.enum(["model", "mock"]),
  cached: z.boolean(),
  inputTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  latencyMs: z.number().nonnegative(),
});
export type ExplainMeta = z.infer<typeof ExplainMeta>;

export const ExplainResponse = z.object({
  result: ExplainResult.nullable(),
  reason: z.enum(EXPLAIN_FAILURES).optional(),
  meta: ExplainMeta,
});
export type ExplainResponse = z.infer<typeof ExplainResponse>;
