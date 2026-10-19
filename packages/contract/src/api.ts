import { z } from "zod";
import { Listing, Marketplace, SyncState } from "./listing";

// ---- Errors ---------------------------------------------------------------

export const ERROR_CODES = [
  "VALIDATION",
  "CONFLICT",
  "RATE_LIMITED",
  "MARKETPLACE_REJECTED",
  "NOT_FOUND",
  "INTERNAL",
] as const;
export const ErrorCode = z.enum(ERROR_CODES);
export type ErrorCode = z.infer<typeof ErrorCode>;

export const ApiErrorBody = z.object({
  code: ErrorCode,
  message: z.string().min(1),
  retryable: z.boolean(),
  retryAfterMs: z.number().int().nonnegative().optional(),
});
export type ApiErrorBody = z.infer<typeof ApiErrorBody>;

export const ErrorEnvelope = z
  .object({
    error: ApiErrorBody,
    // Present on CONFLICT so the client can show what changed.
    current: Listing.optional(),
  })
  .superRefine((env, ctx) => {
    if (env.error.code === "CONFLICT" && !env.current) {
      ctx.addIssue({ code: "custom", path: ["current"], message: "CONFLICT must include current" });
    }
    if (env.error.code === "RATE_LIMITED" && env.error.retryAfterMs === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["error", "retryAfterMs"],
        message: "RATE_LIMITED must include retryAfterMs",
      });
    }
  });
export type ErrorEnvelope = z.infer<typeof ErrorEnvelope>;

// ---- List -----------------------------------------------------------------

export const SORT_FIELDS = ["date", "price", "event", "section", "quantity"] as const;
export const SortField = z.enum(SORT_FIELDS);
export type SortField = z.infer<typeof SortField>;

export const Sort = z.object({ field: SortField, dir: z.enum(["asc", "desc"]) });
export type Sort = z.infer<typeof Sort>;

export const SyncFilter = z.object({ marketplace: Marketplace, state: SyncState });
export type SyncFilter = z.infer<typeof SyncFilter>;

export const ListQuery = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(200).default(100),
  sort: Sort.default({ field: "date", dir: "asc" }),
  q: z.string().optional(),
  dateFrom: z.iso.date().optional(),
  dateTo: z.iso.date().optional(),
  priceMin: z.number().nonnegative().optional(),
  priceMax: z.number().nonnegative().optional(),
  section: z.string().optional(),
  // Repeated values combine with OR; other filter kinds combine with AND.
  sync: z.array(SyncFilter).default([]),
  problem: z.literal("any").optional(),
});
export type ListQuery = z.infer<typeof ListQuery>;
export type ListQueryInput = z.input<typeof ListQuery>;

export const ListResponse = z.object({
  items: z.array(Listing),
  nextCursor: z.string().nullable(),
  total: z.number().int().nonnegative(),
  changesCursor: z.string(),
});
export type ListResponse = z.infer<typeof ListResponse>;

const num = (v: string | null) => (v === null || v === "" ? undefined : Number(v));
const str = (v: string | null) => (v === null || v === "" ? undefined : v);

/** Parses URL search params into a ListQuery. Throws a ZodError on invalid input. */
export function parseListQuery(params: URLSearchParams): ListQuery {
  const [field, dir] = (params.get("sort") ?? "date:asc").split(":");
  return ListQuery.parse({
    cursor: str(params.get("cursor")),
    limit: num(params.get("limit")),
    sort: { field, dir },
    q: str(params.get("q")),
    dateFrom: str(params.get("dateFrom")),
    dateTo: str(params.get("dateTo")),
    priceMin: num(params.get("priceMin")),
    priceMax: num(params.get("priceMax")),
    section: str(params.get("section")),
    sync: params.getAll("sync").map((s) => {
      const [marketplace, state] = s.split(":");
      return { marketplace, state };
    }),
    problem: str(params.get("problem")),
  });
}

export function toSearchParams(query: ListQueryInput): URLSearchParams {
  const p = new URLSearchParams();
  const set = (k: string, v: string | number | undefined) => {
    if (v !== undefined && v !== "") p.set(k, String(v));
  };
  set("cursor", query.cursor);
  set("limit", query.limit);
  if (query.sort) set("sort", `${query.sort.field}:${query.sort.dir}`);
  set("q", query.q);
  set("dateFrom", query.dateFrom);
  set("dateTo", query.dateTo);
  set("priceMin", query.priceMin);
  set("priceMax", query.priceMax);
  set("section", query.section);
  for (const f of query.sync ?? []) p.append("sync", `${f.marketplace}:${f.state}`);
  set("problem", query.problem);
  return p;
}

// ---- Changes --------------------------------------------------------------

export const ChangesResponse = z.object({
  changes: z.array(Listing),
  changesCursor: z.string(),
});
export type ChangesResponse = z.infer<typeof ChangesResponse>;

// ---- Writes ---------------------------------------------------------------

export const PatchBody = z
  .object({
    version: z.number().int().nonnegative(),
    price: z.number().positive().optional(),
    quantity: z.number().int().nonnegative().optional(),
  })
  .refine((b) => b.price !== undefined || b.quantity !== undefined, {
    message: "PATCH needs price or quantity",
  });
export type PatchBody = z.infer<typeof PatchBody>;

export const IDEMPOTENCY_HEADER = "Idempotency-Key";

export const BulkOp = z.discriminatedUnion("op", [
  z.object({
    op: z.literal("setPrice"),
    id: z.string(),
    version: z.number().int(),
    price: z.number().positive(),
  }),
  z.object({ op: z.literal("delist"), id: z.string(), version: z.number().int(), marketplace: Marketplace }),
  // Undo of a delist.
  z.object({ op: z.literal("relist"), id: z.string(), version: z.number().int(), marketplace: Marketplace }),
]);
export type BulkOp = z.infer<typeof BulkOp>;

export const BulkRequest = z.object({ ops: z.array(BulkOp).min(1).max(500) });
export type BulkRequest = z.infer<typeof BulkRequest>;

export const BulkResult = z.discriminatedUnion("ok", [
  z.object({ id: z.string(), ok: z.literal(true), listing: Listing }),
  z.object({ id: z.string(), ok: z.literal(false), error: ApiErrorBody }),
]);
export type BulkResult = z.infer<typeof BulkResult>;

export const BulkResponse = z.object({ results: z.array(BulkResult) });
export type BulkResponse = z.infer<typeof BulkResponse>;

export const RetrySyncBody = z.object({ marketplace: Marketplace });
export type RetrySyncBody = z.infer<typeof RetrySyncBody>;

// ---- History --------------------------------------------------------------

export const HistoryEntry = z.object({
  marketplace: Marketplace,
  state: SyncState,
  lastError: z.string().optional(),
  at: z.iso.datetime(),
});
export type HistoryEntry = z.infer<typeof HistoryEntry>;

export const HistoryResponse = z.object({ entries: z.array(HistoryEntry) });
export type HistoryResponse = z.infer<typeof HistoryResponse>;

