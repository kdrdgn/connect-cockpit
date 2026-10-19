/** mulberry32: small, fast, seedable. Good enough for fixtures, not for anything secret. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Rng = ReturnType<typeof makeRng>;

export function makeRng(seed: number) {
  const next = mulberry32(seed);
  return {
    next,
    int: (min: number, max: number) => min + Math.floor(next() * (max - min + 1)),
    pick: <T>(items: readonly T[]): T => {
      const item = items[Math.floor(next() * items.length)];
      if (item === undefined) throw new Error("pick from empty list");
      return item;
    },
    /** Picks a key with probability proportional to its weight. */
    weighted: <K extends string>(weights: Record<K, number>): K => {
      const entries = Object.entries(weights) as [K, number][];
      let r = next() * entries.reduce((sum, [, w]) => sum + w, 0);
      for (const [k, w] of entries) {
        r -= w;
        if (r < 0) return k;
      }
      return entries[entries.length - 1]![0];
    },
  };
}

/** FNV-1a over the joined parts. Same inputs give the same number on every platform. */
export function hash(...parts: (string | number)[]): number {
  let h = 0x811c9dc5;
  for (const ch of parts.join("|")) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}
