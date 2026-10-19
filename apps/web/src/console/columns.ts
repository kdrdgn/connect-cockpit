import { MARKETPLACES, type Marketplace, type SortField } from "@cockpit/contract";

/** Interactive columns, in Tab order. Arrow keys move between these; everything else is read-only text. */
export const INTERACTIVE_COLS = ["select", "quantity", "price"] as const;
export type InteractiveCol = (typeof INTERACTIVE_COLS)[number];
export const colIndex = (c: InteractiveCol) => INTERACTIVE_COLS.indexOf(c);

export type Column =
  | { key: "select" | "event" | "date" | "section" | "row" | "quantity" | "price" | "gap"; width?: number; sort?: SortField }
  | { key: Marketplace; width: number };

export const COLUMNS: readonly Column[] = [
  { key: "select", width: 36 },
  { key: "event", sort: "event" },
  { key: "date", width: 104, sort: "date" },
  { key: "section", width: 60, sort: "section" },
  { key: "row", width: 48 },
  { key: "quantity", width: 60, sort: "quantity" },
  { key: "price", width: 88, sort: "price" },
  { key: "gap", width: 76 },
  ...MARKETPLACES.map((m) => ({ key: m, width: 40 })),
];

export const COLUMN_COUNT = COLUMNS.length;
