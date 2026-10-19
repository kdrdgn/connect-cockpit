import type { KeyboardEvent } from "react";
import { INTERACTIVE_COLS } from "./columns";
import { focusCell, tableRowCount } from "./focus";
import { selectRow } from "./selection";

const LAST_COL = INTERACTIVE_COLS.length - 1;
const PAGE_ROWS = 20;

const cellOf = (el: EventTarget | null) => {
  if (!(el instanceof HTMLElement) || el.dataset.row === undefined || el.dataset.col === undefined) return null;
  return { row: Number(el.dataset.row), col: Number(el.dataset.col), editing: el.dataset.editing !== undefined };
};

const rendered = (row: number) => !!document.querySelector(`[data-table-body] tr[data-index="${row}"]`);

/**
 * Arrow keys between interactive cells, for sighted keyboard users. Tab stays native; this only steps in when
 * the next row isn't rendered yet, so Tab never falls out of the table at the virtual window's edge.
 */
export function onTableKeyDown(e: KeyboardEvent<HTMLElement>, viewIds: readonly string[] = []) {
  const cell = cellOf(e.target);
  if (!cell || cell.editing || e.altKey || e.metaKey) return;
  const { row, col } = cell;
  // Space selects the row from any of its cells (a checkbox handles it natively, including Shift+Space).
  if (e.key === " " && !(e.target instanceof HTMLInputElement)) {
    const id = (e.target as HTMLElement).closest<HTMLElement>("tr[data-id]")?.dataset.id;
    if (id) {
      e.preventDefault();
      selectRow(viewIds, id, e.shiftKey);
    }
    return;
  }
  const go = (r: number, c: number) => {
    e.preventDefault();
    void focusCell(Math.max(0, Math.min(tableRowCount() - 1, r)), c);
  };
  switch (e.key) {
    case "ArrowUp":
      return go(row - 1, col);
    case "ArrowDown":
      return go(row + 1, col);
    case "ArrowLeft":
      return col > 0 ? go(row, col - 1) : undefined;
    case "ArrowRight":
      return col < LAST_COL ? go(row, col + 1) : undefined;
    case "Home":
      return e.ctrlKey ? go(0, col) : go(row, 0);
    case "End":
      return e.ctrlKey ? go(tableRowCount() - 1, col) : go(row, LAST_COL);
    case "PageUp":
      return go(row - PAGE_ROWS, col);
    case "PageDown":
      return go(row + PAGE_ROWS, col);
    case "Tab":
      if (!e.shiftKey && col === LAST_COL && row + 1 < tableRowCount() && !rendered(row + 1)) return go(row + 1, 0);
      if (e.shiftKey && col === 0 && row > 0 && !rendered(row - 1)) return go(row - 1, LAST_COL);
      return;
  }
}
