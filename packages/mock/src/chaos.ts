import { DEFAULT_DATA_SEED } from "./generate";
import { hash } from "./rng";

export type ChaosConfig = {
  chaos: boolean;
  /** Chooses which writes fail. Separate from dataSeed, which chooses the data. */
  seed: number;
  dataSeed: number;
  latency: readonly [min: number, max: number];
  /** Percentage of write attempts that fail. */
  failRate: number;
  /** Percentage of reads that return 429. */
  rate429: number;
};

export const DEFAULT_CHAOS: Omit<ChaosConfig, "seed"> = {
  chaos: true,
  dataSeed: DEFAULT_DATA_SEED,
  latency: [300, 800],
  failRate: 15,
  rate429: 5,
};

const OFF = { latency: [0, 20], failRate: 0, rate429: 0 } as const;

/** Reads chaos settings from URL params, e.g. `?chaos=off&seed=42&latency=0-50&failRate=50&rate429=0`. */
export function parseChaos(params: URLSearchParams): ChaosConfig {
  const int = (key: string) => {
    const raw = params.get(key);
    const n = raw === null ? NaN : Number(raw);
    return Number.isInteger(n) && n >= 0 ? n : undefined;
  };
  const chaos = params.get("chaos") !== "off";
  const base = chaos ? DEFAULT_CHAOS : { ...DEFAULT_CHAOS, ...OFF };
  const [lo, hi] = (params.get("latency") ?? "").split("-").map(Number);
  const latency: readonly [number, number] =
    Number.isFinite(lo) && Number.isFinite(hi) && lo! >= 0 && hi! >= lo! ? [lo!, hi!] : base.latency;
  return {
    chaos,
    seed: int("seed") ?? Math.floor(Math.random() * 2 ** 31),
    dataSeed: int("dataSeed") ?? base.dataSeed,
    latency,
    failRate: Math.min(100, int("failRate") ?? base.failRate),
    rate429: Math.min(100, int("rate429") ?? base.rate429),
  };
}

/**
 * Whether a write fails. Depends only on what is written, never on request order,
 * so tests can predict exactly which rows fail and a retry (next attempt) can pass.
 */
export function writeFails(seed: number, listingId: string, attempt: number, failRate: number): boolean {
  return hash(seed, listingId, attempt) % 100 < failRate;
}
