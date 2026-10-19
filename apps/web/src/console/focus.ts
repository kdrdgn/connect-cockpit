import { INTERACTIVE_COLS } from "./columns";
import { useUi } from "./store";

// The table registers its virtualizer here, so anything (arrows, Tab, n/N, the drawer) can focus any row.
let scrollToIndex: ((index: number) => void) | null = null;
let rowCount = 0;

export function registerTable(scroll: (index: number) => void, count: number) {
  scrollToIndex = scroll;
  rowCount = count;
  return () => {
    scrollToIndex = null;
  };
}

export const tableRowCount = () => rowCount;

/** The listing of the last focused row, so "Next problem" knows where the broker is even after clicking it. */
let lastRowId: string | null = null;
export const lastFocusedRowId = () => lastRowId;
export function trackRowFocus(e: FocusEvent | React.FocusEvent) {
  const id = (e.target as HTMLElement | null)?.closest<HTMLElement>("tr[data-id]")?.dataset.id;
  if (id) {
    lastRowId = id;
    useUi.getState().setFocusedRowId(id);
  }
}
export const setLastFocusedRowId = (id: string) => {
  lastRowId = id;
};

// Skips an input that is still leaving edit mode; its button is about to take its place.
const cellSelector = (row: number, col: number) =>
  `[data-table-body] [data-row="${row}"][data-col="${col}"]:not([data-editing])`;

const nextFrame = () =>
  new Promise<void>((resolve) =>
    typeof requestAnimationFrame === "function" ? requestAnimationFrame(() => resolve()) : setTimeout(resolve, 16),
  );

let generation = 0;

/**
 * Focuses a cell, rendering its row first if it is outside the virtual window. A newer call cancels a pending
 * one, and it gives up if focus moved somewhere else meanwhile, so a late call never steals focus.
 */
export async function focusCell(row: number, col: number): Promise<boolean> {
  if (row < 0 || row >= rowCount) return false;
  const mine = ++generation;
  const startedOn = document.activeElement;
  const c = Math.max(0, Math.min(INTERACTIVE_COLS.length - 1, col));
  const find = () => document.querySelector<HTMLElement>(cellSelector(row, c));
  let el = find();
  if (!el) {
    if (!document.querySelector(`[data-table-body] [data-row="${row}"]`)) scrollToIndex?.(row);
    for (let i = 0; i < 10 && !el; i++) {
      await nextFrame();
      if (mine !== generation) return false;
      const active = document.activeElement;
      // The element we started on may have unmounted (focus falls to body); anything else means the user moved on.
      if (active !== startedOn && active !== document.body && active !== null) return false;
      el = find();
    }
  }
  if (!el) return false;
  el.focus();
  el.scrollIntoView({ block: "nearest" });
  return true;
}

/** The next interactive cell in reading order, wrapping to the next or previous row. */
export function neighbour(row: number, col: number, dir: 1 | -1): { row: number; col: number } {
  const last = INTERACTIVE_COLS.length - 1;
  if (dir === 1) return col < last ? { row, col: col + 1 } : { row: row + 1, col: 0 };
  return col > 0 ? { row, col: col - 1 } : { row: row - 1, col: last };
}
