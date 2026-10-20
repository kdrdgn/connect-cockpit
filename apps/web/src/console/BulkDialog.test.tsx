import type { BulkOp, BulkResult, Listing } from "@cockpit/contract";
import { render, screen } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import buttonStyles from "@/ui/Button.module.css";
import { BulkDialog, LastBulkActions } from "./BulkActions";
import type { BulkIntent } from "./bulkPreview";
import { type LastBulk, useUi } from "./store";

const flow = { apply: () => {}, close: () => {}, retryFailed: () => {}, undo: () => {} } as never;
const variantOf = (name: string | RegExp) => {
  const b = screen.getByRole("button", { name, hidden: true });
  return (["primary", "danger", "ghost"] as const).find((v) => b.classList.contains(buttonStyles[v] ?? "")) ?? "default";
};

const DELIST: BulkIntent = { kind: "delist", marketplace: "stubhub" };
const PRICE: BulkIntent = { kind: "price", pct: 10 };
const delist = (id: string): BulkOp => ({ op: "delist", id, version: 1, marketplace: "stubhub" });
const relist = (id: string): BulkOp => ({ op: "relist", id, version: 1, marketplace: "stubhub" });
const setPrice = (id: string): BulkOp => ({ op: "setPrice", id, version: 1, price: 100 });
const ok = (id: string): BulkResult => ({ id, ok: true, listing: {} as Listing });
const fail = (id: string): BulkResult => ({ id, ok: false, error: { code: "conflict", message: "Changed elsewhere", retryable: false } as never });

function last(kind: LastBulk["kind"], intent: BulkIntent, ops: BulkOp[], results: BulkResult[]): LastBulk {
  return { kind, intent, ops, results, before: new Map() };
}

beforeAll(() => {
  // jsdom has no modal dialogs.
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute("open", "");
  };
});

beforeEach(() => useUi.setState({ bulk: { stage: "idle" }, lastBulk: null }));

describe("bulk preview emphasis", () => {
  it("Apply is danger for a delist, with the same label", () => {
    useUi.setState({ bulk: { stage: "preview", intent: DELIST, rows: [], ops: [delist("A"), delist("B")] } });
    render(<BulkDialog flow={flow} />);
    expect(variantOf("Apply to 2 listings")).toBe("danger");
    expect(variantOf("Cancel")).toBe("default");
  });

  it("Apply is primary for a price change", () => {
    useUi.setState({ bulk: { stage: "preview", intent: PRICE, rows: [], ops: [setPrice("A")] } });
    render(<BulkDialog flow={flow} />);
    expect(variantOf("Apply to 1 listing")).toBe("primary");
  });
});

// Focus on Close is checked in the browser (edit-bulk-undo.spec.ts): jsdom has no modal focus.
describe("bulk result emphasis", () => {
  it("with failures, Retry failed is the only filled button", () => {
    useUi.setState({ bulk: { stage: "result" }, lastBulk: last("apply", PRICE, [setPrice("A"), setPrice("B")], [ok("A"), fail("B")]) });
    render(<BulkDialog flow={flow} />);
    expect(variantOf("Retry failed (1)")).toBe("primary");
    expect(variantOf(/^Undo/)).toBe("default");
    expect(variantOf("Close")).toBe("default");
  });

  it("with no failures, Close is primary and Undo stays default", () => {
    useUi.setState({ bulk: { stage: "result" }, lastBulk: last("apply", PRICE, [setPrice("A")], [ok("A")]) });
    render(<BulkDialog flow={flow} />);
    expect(variantOf("Close")).toBe("primary");
    expect(variantOf(/^Undo/)).toBe("default");
  });
});

describe("Retry failed follows what it would send", () => {
  it("is danger when the failed ops are delists", () => {
    useUi.setState({ lastBulk: last("apply", DELIST, [delist("A"), delist("B")], [ok("A"), fail("B")]) });
    render(<LastBulkActions flow={flow} />);
    expect(variantOf("Retry failed (1)")).toBe("danger");
  });

  it("is primary when the failed ops are price changes", () => {
    useUi.setState({ lastBulk: last("retry", PRICE, [setPrice("A")], [fail("A")]) });
    render(<LastBulkActions flow={flow} />);
    expect(variantOf("Retry failed (1)")).toBe("primary");
  });

  it("is primary for a failed undo of a delist, which only relists", () => {
    useUi.setState({ lastBulk: last("undo", DELIST, [relist("A")], [fail("A")]) });
    render(<LastBulkActions flow={flow} />);
    expect(variantOf("Retry failed (1)")).toBe("primary");
  });
});
