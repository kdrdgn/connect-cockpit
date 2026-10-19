import {
  type ApiErrorBody,
  BulkRequest,
  type BulkResult,
  type ErrorCode,
  type HistoryEntry,
  IDEMPOTENCY_HEADER,
  type Listing,
  MARKETPLACES,
  type Marketplace,
  PatchBody,
  RetrySyncBody,
  type SyncEntry,
  parseListQuery,
} from "@cockpit/contract";
import { type ChaosConfig, DEFAULT_CHAOS, writeFails } from "./chaos";
import { generate, startOfDay } from "./generate";
import { decodeCursor, page } from "./query";
import { makeRng } from "./rng";
import { MARKETPLACE_NAMES, ORDINARY_TEMPLATES } from "./templates";

export type EngineOptions = {
  config?: Partial<ChaosConfig>;
  now?: () => number;
  /** Injected so tests can skip real waiting. */
  sleep?: (ms: number, signal?: AbortSignal | null) => Promise<void>;
};

export type Engine = ReturnType<typeof createEngine>;

const DRIFT_INTERVAL_MS = 3_000;
const EDITED_ELSEWHERE_AFTER_MS = 60_000;

const STATUS: Record<ErrorCode, number> = {
  VALIDATION: 400,
  NOT_FOUND: 404,
  CONFLICT: 409,
  MARKETPLACE_REJECTED: 422,
  RATE_LIMITED: 429,
  INTERNAL: 500,
};

const REJECTIONS = [
  "rejected the update: listing is locked while a sale is processing",
  "rejected the update: price change limit reached for this hour",
  "did not confirm the update in time; nothing was changed",
];

function defaultSleep(ms: number, signal?: AbortSignal | null): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason);
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(t);
      reject(signal.reason);
    });
  });
}

class ApiError extends Error {
  constructor(
    readonly body: ApiErrorBody,
    readonly current?: Listing,
  ) {
    super(body.message);
  }
}

const err = (code: ErrorCode, message: string, retryable = false) => new ApiError({ code, message, retryable });

function json(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

export function createEngine(options: EngineOptions = {}) {
  const config: ChaosConfig = { ...DEFAULT_CHAOS, seed: 1, ...options.config };
  const now = options.now ?? Date.now;
  const sleep = options.sleep ?? defaultSleep;
  const rng = makeRng(config.seed ^ 0x5eed);
  const startedAt = now();
  const iso = () => new Date(now()).toISOString();

  // ---- State (in memory only: a reload regenerates everything from the seeds) ----
  const listings = new Map<string, Listing>();
  for (const l of generate(config.dataSeed, startOfDay(startedAt))) listings.set(l.id, l);
  const history = new Map<string, HistoryEntry[]>();
  for (const l of listings.values()) {
    history.set(
      l.id,
      MARKETPLACES.map((m) => entryToHistory(m, l.sync[m])).sort((a, b) => b.at.localeCompare(a.at)),
    );
  }
  const log: { seq: number; id: string }[] = [];
  let seq = 0;
  const attempts = new Map<string, number>();
  const idempotency = new Map<string, unknown>();
  // Pending entries that drift will not resolve, so stale pending shows up. Cleared by retry-sync.
  const stuck = new Set<string>();
  let editedElsewhereDone = false;

  function entryToHistory(marketplace: Marketplace, s: SyncEntry): HistoryEntry {
    return { marketplace, state: s.state, at: s.updatedAt, ...(s.lastError ? { lastError: s.lastError } : {}) };
  }

  function record(l: Listing) {
    listings.set(l.id, l);
    log.push({ seq: ++seq, id: l.id });
  }

  function setSync(l: Listing, m: Marketplace, entry: SyncEntry): Listing {
    history.get(l.id)?.unshift(entryToHistory(m, entry));
    return { ...l, sync: { ...l.sync, [m]: entry } };
  }

  function errorText(l: Listing, m: Marketplace): string {
    const t = rng.pick(ORDINARY_TEMPLATES);
    return t.render({ marketplace: m, marketPrice: l.marketPrice, quantity: l.quantity, section: l.section, row: l.row, n: rng.int(0, 99_999) });
  }

  /** A successful write: bump version and send every live marketplace back to pending. */
  function propagate(l: Listing): Listing {
    let next: Listing = { ...l, version: l.version + 1 };
    for (const m of MARKETPLACES) {
      const s = next.sync[m];
      if (s.state === "live") next = setSync(next, m, { state: "pending", updatedAt: iso(), listedQuantity: s.listedQuantity });
    }
    return next;
  }

  function find(id: string): Listing {
    const l = listings.get(id);
    if (!l) throw err("NOT_FOUND", `Listing ${id} does not exist`);
    return l;
  }

  function checkWrite(l: Listing, version: number) {
    if (version !== l.version) {
      throw new ApiError(
        { code: "CONFLICT", message: "This listing changed since you loaded it. Review the new values and try again.", retryable: false },
        l,
      );
    }
    const attempt = (attempts.get(l.id) ?? 0) + 1;
    attempts.set(l.id, attempt);
    if (writeFails(config.seed, l.id, attempt, config.failRate)) {
      const m = MARKETPLACES[attempt % MARKETPLACES.length]!;
      throw err("MARKETPLACE_REJECTED", `${MARKETPLACE_NAMES[m]} ${REJECTIONS[attempt % REJECTIONS.length]}`, true);
    }
  }

  // ---- Routes ----------------------------------------------------------------

  function list(url: URL) {
    let query;
    try {
      query = parseListQuery(url.searchParams);
    } catch {
      throw err("VALIDATION", "Invalid filter or sort parameters");
    }
    const after = query.cursor ? decodeCursor(query.cursor) : null;
    if (query.cursor && !after) throw err("VALIDATION", "Invalid cursor");
    const result = page([...listings.values()], query, now(), after);
    return json(200, { ...result, changesCursor: String(seq) });
  }

  function changes(url: URL) {
    const since = Number(url.searchParams.get("since") ?? "0");
    if (!Number.isInteger(since) || since < 0) throw err("VALIDATION", "Invalid changes cursor");
    const ids = new Set(log.filter((e) => e.seq > since).map((e) => e.id));
    return json(200, { changes: [...ids].map((id) => listings.get(id)!), changesCursor: String(seq) });
  }

  async function patch(id: string, req: Request) {
    const body = PatchBody.safeParse(await req.json().catch(() => null));
    if (!body.success) throw err("VALIDATION", body.error.issues[0]?.message ?? "Invalid body");
    const l = find(id);
    checkWrite(l, body.data.version);
    const next = propagate({
      ...l,
      ...(body.data.price !== undefined ? { price: body.data.price } : {}),
      ...(body.data.quantity !== undefined ? { quantity: body.data.quantity } : {}),
    });
    record(next);
    return json(200, next);
  }

  async function bulk(req: Request) {
    const key = req.headers.get(IDEMPOTENCY_HEADER);
    if (!key) throw err("VALIDATION", `${IDEMPOTENCY_HEADER} header is required`);
    const stored = idempotency.get(key);
    if (stored) return json(200, stored);
    const body = BulkRequest.safeParse(await req.json().catch(() => null));
    if (!body.success) throw err("VALIDATION", body.error.issues[0]?.message ?? "Invalid body");

    const results: BulkResult[] = body.data.ops.map((op) => {
      try {
        const l = find(op.id);
        checkWrite(l, op.version);
        let next: Listing;
        if (op.op === "setPrice") {
          next = propagate({ ...l, price: op.price });
        } else if (op.op === "delist") {
          next = setSync({ ...l, version: l.version + 1 }, op.marketplace, { state: "not_listed", updatedAt: iso() });
        } else {
          next = setSync({ ...l, version: l.version + 1 }, op.marketplace, { state: "pending", updatedAt: iso() });
        }
        record(next);
        return { id: op.id, ok: true, listing: next };
      } catch (e) {
        if (e instanceof ApiError) return { id: op.id, ok: false, error: e.body };
        throw e;
      }
    });
    const response = { results };
    idempotency.set(key, response);
    return json(200, response);
  }

  async function retrySync(id: string, req: Request) {
    const body = RetrySyncBody.safeParse(await req.json().catch(() => null));
    if (!body.success) throw err("VALIDATION", "Body must name a marketplace");
    const l = find(id);
    checkWrite(l, l.version);
    const m = body.data.marketplace;
    stuck.delete(`${id}:${m}`);
    const next = setSync({ ...l, version: l.version + 1 }, m, {
      state: "pending",
      updatedAt: iso(),
      listedQuantity: l.sync[m].listedQuantity,
    });
    record(next);
    return json(200, next);
  }

  async function dispatch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const match = url.pathname.match(/\/listings(?:\/([^/]+))?(?:\/([^/]+))?\/?$/);
    if (!match) throw err("NOT_FOUND", `No route for ${url.pathname}`);
    const [, id, action] = match;
    const method = req.method.toUpperCase();

    if (method === "GET" && config.rate429 > 0 && rng.next() * 100 < config.rate429) {
      const seconds = rng.int(1, 3);
      return json(
        429,
        { error: { code: "RATE_LIMITED", message: `Too many requests. Try again in ${seconds}s.`, retryable: true, retryAfterMs: seconds * 1000 } },
        { "Retry-After": String(seconds) },
      );
    }

    if (!id && method === "GET") return list(url);
    if (id === "changes" && !action && method === "GET") return changes(url);
    if (id === "bulk" && !action && method === "POST") return bulk(req);
    if (id && !action && method === "PATCH") return patch(id, req);
    if (id && action === "retry-sync" && method === "POST") return retrySync(id, req);
    if (id && action === "history" && method === "GET") {
      find(id);
      return json(200, { entries: history.get(id) ?? [] });
    }
    throw err("NOT_FOUND", `No route for ${method} ${url.pathname}`);
  }

  async function handle(req: Request): Promise<Response> {
    const [lo, hi] = config.latency;
    await sleep(rng.int(lo, hi), req.signal);
    try {
      return await dispatch(req);
    } catch (e) {
      if (e instanceof ApiError) {
        return json(STATUS[e.body.code], { error: e.body, ...(e.current ? { current: e.current } : {}) });
      }
      const message = e instanceof Error ? e.message : "Unknown error";
      return json(500, { error: { code: "INTERNAL", message, retryable: false } });
    }
  }

  // ---- Drift -----------------------------------------------------------------

  function tick() {
    const t = now();
    // Resolve pending entries, except stuck ones.
    for (const l of [...listings.values()]) {
      let next = l;
      for (const m of MARKETPLACES) {
        const s = next.sync[m];
        if (s.state !== "pending" || stuck.has(`${l.id}:${m}`)) continue;
        if (t - Date.parse(s.updatedAt) < 2_000 || rng.next() < 0.4) continue;
        next =
          rng.next() < 0.85
            ? setSync(next, m, { state: "live", updatedAt: iso(), listedQuantity: next.quantity })
            : setSync(next, m, { state: "error", updatedAt: iso(), lastError: errorText(next, m) });
      }
      if (next !== l) record(next);
    }

    // A few new events: marketplaces flap, errors auto-retry, and the odd listedQuantity drifts.
    const all = [...listings.values()];
    for (let i = rng.int(2, 4); i > 0; i--) {
      const l = rng.pick(all);
      const m = rng.pick(MARKETPLACES);
      const s = l.sync[m];
      const roll = rng.next();
      let next: Listing | null = null;
      if (s.state === "live" && roll < 0.4) {
        if (rng.next() < 0.1) stuck.add(`${l.id}:${m}`);
        next = setSync(l, m, { state: "pending", updatedAt: iso(), listedQuantity: s.listedQuantity });
      } else if (s.state === "live" && roll < 0.6) {
        next = setSync(l, m, { state: "error", updatedAt: iso(), lastError: errorText(l, m) });
      } else if (s.state === "live" && roll < 0.7) {
        next = { ...l, sync: { ...l.sync, [m]: { ...s, listedQuantity: l.quantity + 1, updatedAt: iso() } } };
      } else if (s.state === "error" && roll < 0.3) {
        next = setSync(l, m, { state: "pending", updatedAt: iso() });
      }
      if (next) record(next);
    }

    // One seeded "edited elsewhere" price change, so the 409 path can be demonstrated.
    if (!editedElsewhereDone && t - startedAt >= EDITED_ELSEWHERE_AFTER_MS) {
      editedElsewhereDone = true;
      const l = all[config.seed % all.length]!;
      record({ ...l, price: l.price + 5, version: l.version + 1 });
    }
  }

  function start(intervalMs = DRIFT_INTERVAL_MS): () => void {
    const timer = setInterval(tick, intervalMs);
    return () => clearInterval(timer);
  }

  return {
    config,
    handle,
    tick,
    start,
    /** Read-only access for tests and the dev panel. */
    get: (id: string) => listings.get(id),
    all: () => [...listings.values()],
  };
}
