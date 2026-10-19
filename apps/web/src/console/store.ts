import type { BulkOp, BulkResult, Listing } from "@cockpit/contract";
import type { BulkIntent, PreviewRow } from "./bulkPreview";
import type { Density } from "@cockpit/tokens";
import { create } from "zustand";

export type EditField = "price" | "quantity";
export type CellRef = { row: number; col: number };

/** The last bulk intent, kept so "Retry failed" and Undo can be built from it. */
export type LastBulk = {
  kind: "apply" | "retry" | "undo";
  intent: BulkIntent;
  ops: BulkOp[];
  results: BulkResult[];
  /** Listings as they were before the original apply; undo restores these prices. */
  before: ReadonlyMap<string, Listing>;
};

type UiState = {
  selection: ReadonlySet<string>;
  /** Last row clicked or toggled; shift ranges extend from here. */
  anchor: string | null;
  /** `select`: select the starting text (Enter/F2/click) or not (typing a digit starts the edit with it). */
  /** `baseVersion`: the listing version when editing started; the commit is checked against it. */
  editing: { id: string; field: EditField; select: boolean; baseVersion: number } | null;
  /** Keyed `${id}:${field}`. Lives outside the query cache, so incoming data never touches what the broker types. */
  drafts: Readonly<Record<string, string>>;
  drawerId: string | null;
  /** The cell focus returns to when the drawer closes. */
  drawerReturn: CellRef | null;
  focused: CellRef | null;
  /** The listing whose row has focus; the seating map highlights its section. */
  focusedRowId: string | null;
  density: Density;
  lastBulk: LastBulk | null;
  /** Rows whose last bulk write failed; marked in the table until the next bulk action. */
  bulkFailed: ReadonlySet<string>;
  /** idle -> preview -> applying -> result; retry and undo go applying -> result. */
  bulk: { stage: "idle" } | { stage: "preview"; intent: BulkIntent; rows: PreviewRow[]; ops: BulkOp[] } | { stage: "applying"; label: string } | { stage: "result" };
  /** Cells (`draftKey`) showing a rollback. */
  rollbackFlash: ReadonlySet<string>;
};

type UiActions = {
  toggle: (id: string) => void;
  /** Selects every id between the anchor and `id` in `orderedIds`, inclusive. */
  selectRange: (orderedIds: readonly string[], id: string) => void;
  setSelection: (ids: Iterable<string>) => void;
  clearSelection: () => void;
  startEdit: (id: string, field: EditField, initial: string, baseVersion: number, select?: boolean) => void;
  setDraft: (id: string, field: EditField, value: string) => void;
  endEdit: () => void;
  openDrawer: (id: string, returnTo: CellRef | null) => void;
  closeDrawer: () => void;
  setFocused: (cell: CellRef | null) => void;
  setFocusedRowId: (id: string) => void;
  setDensity: (density: Density) => void;
  setLastBulk: (bulk: LastBulk | null) => void;
  setBulk: (bulk: UiState["bulk"]) => void;
  flashRollback: (cell: string, ms?: number) => void;
};

export const DENSITY_KEY = "cockpit.density";

/** Read when the store is created, so the first render already has the saved density and never overwrites it. */
function savedDensity(): Density {
  try {
    const v = typeof localStorage === "undefined" ? null : localStorage.getItem(DENSITY_KEY);
    return v === "compact" ? "compact" : "comfortable";
  } catch {
    return "comfortable"; // private mode or blocked storage
  }
}

export const draftKey = (id: string, field: EditField) => `${id}:${field}`;

const without = <T,>(set: ReadonlySet<T>, value: T) => {
  const next = new Set(set);
  next.delete(value);
  return next;
};

export const useUi = create<UiState & UiActions>()((set, get) => ({
  selection: new Set(),
  anchor: null,
  editing: null,
  drafts: {},
  drawerId: null,
  drawerReturn: null,
  focused: null,
  focusedRowId: null,
  density: savedDensity(),
  lastBulk: null,
  bulkFailed: new Set(),
  bulk: { stage: "idle" },
  rollbackFlash: new Set(),

  toggle: (id) =>
    set((s) => ({
      selection: s.selection.has(id) ? without(s.selection, id) : new Set(s.selection).add(id),
      anchor: id,
    })),
  selectRange: (orderedIds, id) =>
    set((s) => {
      const to = orderedIds.indexOf(id);
      const from = s.anchor === null ? -1 : orderedIds.indexOf(s.anchor);
      if (to < 0) return {};
      if (from < 0) return { selection: new Set(s.selection).add(id), anchor: id };
      const [lo, hi] = from < to ? [from, to] : [to, from];
      const next = new Set(s.selection);
      for (let i = lo; i <= hi; i++) next.add(orderedIds[i]!);
      return { selection: next };
    }),
  setSelection: (ids) => set({ selection: new Set(ids) }),
  clearSelection: () => set({ selection: new Set(), anchor: null }),

  startEdit: (id, field, initial, baseVersion, select = true) =>
    set((s) => ({ editing: { id, field, select, baseVersion }, drafts: { ...s.drafts, [draftKey(id, field)]: initial } })),
  setDraft: (id, field, value) => set((s) => ({ drafts: { ...s.drafts, [draftKey(id, field)]: value } })),
  endEdit: () =>
    set((s) => {
      if (!s.editing) return {};
      const { [draftKey(s.editing.id, s.editing.field)]: _, ...drafts } = s.drafts;
      return { editing: null, drafts };
    }),

  openDrawer: (id, drawerReturn) => set({ drawerId: id, drawerReturn }),
  closeDrawer: () => set({ drawerId: null }),
  setFocused: (focused) => set({ focused }),
  setFocusedRowId: (focusedRowId) => {
    if (get().focusedRowId !== focusedRowId) set({ focusedRowId });
  },
  setDensity: (density) => set({ density }),
  setLastBulk: (lastBulk) =>
    set({ lastBulk, bulkFailed: new Set(lastBulk?.results.flatMap((r) => (r.ok ? [] : [r.id])) ?? []) }),
  setBulk: (bulk) => set({ bulk }),

  flashRollback: (cell, ms = 1200) => {
    set((s) => ({ rollbackFlash: new Set(s.rollbackFlash).add(cell) }));
    setTimeout(() => {
      if (get().rollbackFlash.has(cell)) set((s) => ({ rollbackFlash: without(s.rollbackFlash, cell) }));
    }, ms);
  },
}));

/** Per-row selectors: a row re-renders only when its own answer changes. */
export const useIsSelected = (id: string) => useUi((s) => s.selection.has(id));
export const useBulkFailed = (id: string) => useUi((s) => s.bulkFailed.has(id));
export const useIsEditing = (id: string, field: EditField) =>
  useUi((s) => s.editing?.id === id && s.editing.field === field);
/** Rollback flash is keyed per cell (`draftKey`), so only the cell that failed turns red. */
export const useIsFlashing = (id: string, field: EditField) => useUi((s) => s.rollbackFlash.has(draftKey(id, field)));
