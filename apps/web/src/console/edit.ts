import type { EditField } from "./store";

export type Parsed = { ok: true; value: number } | { ok: false; message: string };

/** Price: positive, at most 2 decimals. Quantity: whole number, 0 or more. */
export function parseEdit(field: EditField, raw: string): Parsed {
  const text = raw.trim().replace(/^£/, "");
  if (text === "") return { ok: false, message: field === "price" ? "Enter a price" : "Enter a quantity" };
  const n = Number(text);
  if (field === "quantity") {
    if (!Number.isFinite(n)) return { ok: false, message: "Quantity must be a number" };
    if (n < 0) return { ok: false, message: "Quantity must be 0 or more" };
    if (!Number.isInteger(n)) return { ok: false, message: "Quantity must be a whole number" };
    return { ok: true, value: n };
  }
  if (!Number.isFinite(n)) return { ok: false, message: "Price must be a number" };
  if (n <= 0) return { ok: false, message: "Price must be more than £0" };
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return { ok: false, message: "Use at most 2 decimals" };
  return { ok: true, value: n };
}
