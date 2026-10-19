import {
  type ApiErrorBody,
  type BulkOp,
  BulkResponse,
  ChangesResponse,
  type ErrorCode,
  ErrorEnvelope,
  type ExplainRequest,
  ExplainResponse,
  HistoryResponse,
  IDEMPOTENCY_HEADER,
  Listing,
  type ListQueryInput,
  ListResponse,
  type Marketplace,
  type PatchBody,
  toSearchParams,
} from "@cockpit/contract";
import type { z } from "zod";

export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly retryable: boolean;
  readonly retryAfterMs: number | undefined;
  /** Server's current listing on CONFLICT. */
  readonly current: Listing | undefined;

  constructor(body: ApiErrorBody, readonly status: number, current?: Listing) {
    super(body.message);
    this.name = "ApiError";
    this.code = body.code;
    this.retryable = body.retryable;
    this.retryAfterMs = body.retryAfterMs;
    this.current = current;
  }
}

/** Remaining rate-limit wait, so the UI can show "Waiting 3s…". `untilMs` is null when clear. */
export type RateLimitListener = (untilMs: number | null) => void;

export type ClientOptions = {
  fetch: typeof fetch;
  baseUrl?: string;
  /** Max automatic retries of a rate-limited read. Writes are never retried automatically. */
  maxReadRetries?: number;
  sleep?: (ms: number, signal?: AbortSignal) => Promise<void>;
  now?: () => number;
};

export type Client = ReturnType<typeof createClient>;

/** The explanation gives up after this; the drawer then shows "No suggestion" and the manual actions. */
export const EXPLAIN_TIMEOUT_MS = 6_000;

const internal = (message: string, status = 0) =>
  new ApiError({ code: "INTERNAL", message, retryable: false }, status);

function defaultSleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason);
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(t);
      reject(signal.reason);
    });
  });
}

function retryAfterMs(res: Response, env: ErrorEnvelope | null): number {
  const header = Number(res.headers.get("Retry-After"));
  if (Number.isFinite(header) && header > 0) return header * 1000;
  return env?.error.retryAfterMs ?? 1000;
}

export function createClient(options: ClientOptions) {
  const { fetch, baseUrl = "/api", maxReadRetries = 3, sleep = defaultSleep, now = Date.now } = options;
  const listeners = new Set<RateLimitListener>();
  let rateLimitedUntil: number | null = null;

  const setRateLimit = (until: number | null) => {
    rateLimitedUntil = until;
    for (const l of listeners) l(until);
  };

  async function send<S extends z.ZodType>(
    schema: S,
    path: string,
    init: RequestInit,
    kind: "read" | "write",
    retryRateLimit = true,
  ): Promise<z.infer<S>> {
    for (let attempt = 0; ; attempt++) {
      let res: Response;
      try {
        res = await fetch(`${baseUrl}${path}`, init);
      } catch (e) {
        if (init.signal?.aborted) throw e;
        throw new ApiError({ code: "INTERNAL", message: "Network error. Check your connection.", retryable: true }, 0);
      }
      const body: unknown = await res.json().catch(() => null);

      if (!res.ok) {
        const parsed = ErrorEnvelope.safeParse(body);
        const env = parsed.success ? parsed.data : null;
        if (res.status === 429 && kind === "read" && retryRateLimit && attempt < maxReadRetries) {
          const wait = retryAfterMs(res, env);
          setRateLimit(now() + wait);
          await sleep(wait, init.signal ?? undefined);
          setRateLimit(null);
          continue;
        }
        if (!env) throw internal(`Unexpected ${res.status} response from server`, res.status);
        throw new ApiError(env.error, res.status, env.current);
      }

      const parsed = schema.safeParse(body);
      if (!parsed.success) throw internal("Unexpected response from server", res.status);
      return parsed.data;
    }
  }

  const json = (method: string, body: unknown, headers: Record<string, string> = {}): RequestInit => ({
    method,
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json", ...headers },
  });

  return {
    listListings: (query: ListQueryInput, signal?: AbortSignal) =>
      send(ListResponse, `/listings?${toSearchParams(query).toString()}`, { signal }, "read"),
    /** `retryRateLimit: false` lets a background poll handle its own 429 quietly instead of waiting here. */
    getChanges: (since: string, signal?: AbortSignal, opts: { retryRateLimit?: boolean } = {}) =>
      send(ChangesResponse, `/listings/changes?since=${encodeURIComponent(since)}`, { signal }, "read", opts.retryRateLimit),
    getHistory: (id: string, signal?: AbortSignal) =>
      send(HistoryResponse, `/listings/${encodeURIComponent(id)}/history`, { signal }, "read"),
    patchListing: (id: string, body: PatchBody) =>
      send(Listing, `/listings/${encodeURIComponent(id)}`, json("PATCH", body), "write"),
    bulk: (ops: BulkOp[], idempotencyKey: string) =>
      send(BulkResponse, "/listings/bulk", json("POST", { ops }, { [IDEMPOTENCY_HEADER]: idempotencyKey }), "write"),
    retrySync: (id: string, marketplace: Marketplace) =>
      send(Listing, `/listings/${encodeURIComponent(id)}/retry-sync`, json("POST", { marketplace }), "write"),
    /**
     * The AI explanation of one marketplace error. Failed answers (504, 502) carry an ExplainResponse
     * too, so any parseable body resolves; only a network error, an abort or a garbled body rejects.
     */
    explainSync: async (body: ExplainRequest, signal?: AbortSignal): Promise<ExplainResponse> => {
      const controller = new AbortController();
      const abort = () => controller.abort(signal?.reason);
      signal?.addEventListener("abort", abort);
      const timer = setTimeout(() => controller.abort(new Error("Explanation timed out")), EXPLAIN_TIMEOUT_MS);
      try {
        const res = await fetch(`${baseUrl}/ai/explain-sync`, { ...json("POST", body), signal: controller.signal });
        const parsed = ExplainResponse.safeParse(await res.json().catch(() => null));
        if (!parsed.success) throw internal(`Unexpected ${res.status} response from the explain route`, res.status);
        return parsed.data;
      } finally {
        clearTimeout(timer);
        signal?.removeEventListener("abort", abort);
      }
    },
    rateLimitedUntil: () => rateLimitedUntil,
    onRateLimit: (listener: RateLimitListener) => {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
  };
}
