import { type ListQueryInput, MARKETPLACES, SYNC_STATES, type Sort, SORT_FIELDS, type SyncFilter } from "@cockpit/contract";
import {
  createLoader,
  createParser,
  createSerializer,
  parseAsFloat,
  parseAsNativeArrayOf,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from "nuqs";
import { useEffect, useMemo, useState } from "react";

const isoDate = createParser({
  parse: (v) => (/^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) ? v : null),
  serialize: (v: string) => v,
});

const nonNegative = createParser({
  parse: (v) => {
    const n = parseAsFloat.parse(v);
    return n !== null && n >= 0 ? n : null;
  },
  serialize: (n: number) => String(n),
});

const syncFilter = createParser<SyncFilter>({
  parse: (v) => {
    const [marketplace, state] = v.split(":");
    const mp = MARKETPLACES.find((m) => m === marketplace);
    const st = SYNC_STATES.find((s) => s === state);
    return mp && st ? { marketplace: mp, state: st } : null;
  },
  serialize: (f) => `${f.marketplace}:${f.state}`,
  eq: (a, b) => a.marketplace === b.marketplace && a.state === b.state,
});

export const DEFAULT_SORT: Sort = { field: "date", dir: "asc" };

const sort = createParser<Sort>({
  parse: (v) => {
    const [field, dir] = v.split(":");
    const f = SORT_FIELDS.find((s) => s === field);
    return f && (dir === "asc" || dir === "desc") ? { field: f, dir } : null;
  },
  serialize: (s) => `${s.field}:${s.dir}`,
  eq: (a, b) => a.field === b.field && a.dir === b.dir,
});

/** Same names and formats as the list API (`toSearchParams`), so a console URL and an API URL read alike. */
export const filterParsers = {
  q: parseAsString,
  dateFrom: isoDate,
  dateTo: isoDate,
  priceMin: nonNegative,
  priceMax: nonNegative,
  section: parseAsString,
  sync: parseAsNativeArrayOf(syncFilter),
  problem: parseAsStringLiteral(["any"] as const),
  sort: sort.withDefault(DEFAULT_SORT),
};

/** Every filter off; the sort stays, because sort is not a filter. */
export const CLEARED_FILTERS = {
  q: null,
  sync: null,
  dateFrom: null,
  dateTo: null,
  priceMin: null,
  priceMax: null,
  section: null,
  problem: null,
} as const;

export type FilterValues = Awaited<ReturnType<typeof loadFilters>>;

export const loadFilters = createLoader(filterParsers);
export const serializeFilters = createSerializer(filterParsers);

/** Drops empty values so the query key only holds filters that are actually set. */
export function toListQuery(v: FilterValues): ListQueryInput {
  const q: ListQueryInput = { sort: v.sort };
  if (v.q?.trim()) q.q = v.q.trim();
  if (v.dateFrom) q.dateFrom = v.dateFrom;
  if (v.dateTo) q.dateTo = v.dateTo;
  if (v.priceMin !== null) q.priceMin = v.priceMin;
  if (v.priceMax !== null) q.priceMax = v.priceMax;
  if (v.section) q.section = v.section;
  if (v.sync.length) q.sync = v.sync;
  if (v.problem) q.problem = v.problem;
  return q;
}

export const SEARCH_DEBOUNCE_MS = 250;

export function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

/**
 * URL-backed filters. The URL (and the search box) update on every keystroke; the query only sees `q` once
 * typing pauses, so one request goes out per search. Filter changes replace the history entry.
 */
export function useFilters() {
  const [values, setValues] = useQueryStates(filterParsers, { history: "replace", clearOnDefault: true });
  const q = useDebounced(values.q, SEARCH_DEBOUNCE_MS);
  const query = useMemo(() => toListQuery({ ...values, q }), [values, q]);
  return { values, query, setValues };
}
