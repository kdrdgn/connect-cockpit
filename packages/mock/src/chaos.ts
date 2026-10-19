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

export const CHAOS_OFF = { latency: [0, 20] as const, failRate: 0, rate429: 0 };

/** A URL value the mock couldn't use, with what it used instead. */
export type IgnoredParam = { key: string; value: string; reason: string; using: string };

/**
 * Reads chaos settings from URL params, e.g. `?chaos=off&seed=42&latency=0-50&failRate=50&rate429=0`, and
 * reports every value it had to ignore, so a typo like `failRate=50%` is visible instead of silently defaulted.
 */
export function parseChaosParams(params: URLSearchParams): { config: ChaosConfig; ignored: IgnoredParam[] } {
  const ignored: IgnoredParam[] = [];
  const chaosRaw = params.get("chaos");
  if (chaosRaw !== null && chaosRaw !== "on" && chaosRaw !== "off") {
    ignored.push({ key: "chaos", value: chaosRaw, reason: "use on or off", using: "on" });
  }
  const chaos = chaosRaw !== "off";
  const base = chaos ? DEFAULT_CHAOS : { ...DEFAULT_CHAOS, ...CHAOS_OFF };

  const int = (key: string, max: number, fallback: number | string): number | undefined => {
    const raw = params.get(key);
    if (raw === null) return undefined;
    const n = Number(raw);
    if (raw.trim() !== "" && Number.isInteger(n) && n >= 0 && n <= max) return n;
    const range = max === Number.MAX_SAFE_INTEGER ? "a whole number, 0 or more" : `a whole number from 0 to ${max}`;
    ignored.push({ key, value: raw, reason: `use ${range}`, using: String(fallback) });
    return undefined;
  };

  const latencyRaw = params.get("latency");
  let latency: readonly [number, number] = base.latency;
  if (latencyRaw !== null) {
    const m = /^(\d+)-(\d+)$/.exec(latencyRaw.trim());
    const [lo, hi] = m ? [Number(m[1]), Number(m[2])] : [NaN, NaN];
    if (m && hi >= lo) latency = [lo, hi];
    else ignored.push({ key: "latency", value: latencyRaw, reason: "use min-max in ms, like 0-50", using: `${base.latency[0]}-${base.latency[1]}` });
  }

  const config: ChaosConfig = {
    chaos,
    seed: int("seed", Number.MAX_SAFE_INTEGER, "random") ?? Math.floor(Math.random() * 2 ** 31),
    dataSeed: int("dataSeed", Number.MAX_SAFE_INTEGER, base.dataSeed) ?? base.dataSeed,
    latency,
    failRate: int("failRate", 100, base.failRate) ?? base.failRate,
    rate429: int("rate429", 100, base.rate429) ?? base.rate429,
  };
  return { config, ignored };
}

export function parseChaos(params: URLSearchParams): ChaosConfig {
  return parseChaosParams(params).config;
}

/** The active settings in words, e.g. "latency 300–800 ms · writes fail 15% · 429 on 5% of reads · write seed 42". */
export function describeChaos(c: ChaosConfig): string {
  return [
    c.chaos ? null : "chaos off",
    `latency ${c.latency[0]}–${c.latency[1]} ms`,
    `writes fail ${c.failRate}%`,
    `429 on ${c.rate429}% of reads`,
    `write seed ${c.seed}`,
    `data seed ${c.dataSeed}`,
  ]
    .filter(Boolean)
    .join(" · ");
}

/**
 * Whether a write fails. Depends only on what is written, never on request order,
 * so tests can predict exactly which rows fail and a retry (next attempt) can pass.
 */
export function writeFails(seed: number, listingId: string, attempt: number, failRate: number): boolean {
  return hash(seed, listingId, attempt) % 100 < failRate;
}
