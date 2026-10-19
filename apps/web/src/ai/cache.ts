import "server-only";
import { createHash } from "node:crypto";
import type { ExplainResult, Marketplace } from "@cockpit/contract";
import { PROMPT_VERSION } from "./prompt";

/**
 * In memory and per server instance; lost on restart. Keyed by the exact sanitised error,
 * which is safe because explanations carry no numbers and the price is computed per listing.
 */
export function createExplainCache(limit = 500) {
  const entries = new Map<string, ExplainResult>();
  return {
    key: (model: string, marketplace: Marketplace, sanitisedError: string) =>
      createHash("sha256").update(JSON.stringify([model, PROMPT_VERSION, marketplace, sanitisedError])).digest("hex"),
    get(key: string): ExplainResult | undefined {
      const hit = entries.get(key);
      if (hit) {
        // Re-insert so the least recently used entry is the first one evicted.
        entries.delete(key);
        entries.set(key, hit);
      }
      return hit;
    },
    set(key: string, value: ExplainResult) {
      entries.delete(key);
      entries.set(key, value);
      if (entries.size > limit) entries.delete(entries.keys().next().value!);
    },
  };
}
export type ExplainCache = ReturnType<typeof createExplainCache>;
