import { beforeEach, describe, expect, it, vi } from "vitest";
import { useUi } from "./store";

const ids = Array.from({ length: 60 }, (_, i) => `l${i}`);

beforeEach(() => {
  useUi.setState({ selection: new Set(), anchor: null, editing: null, drafts: {} });
});

describe("ui store", () => {
  it("toggling one id changes only that id's selector result", () => {
    const listeners = new Map(ids.map((id) => [id, vi.fn()]));
    const unsubs = ids.map((id) => {
      let prev = useUi.getState().selection.has(id);
      return useUi.subscribe((s) => {
        const next = s.selection.has(id);
        if (next !== prev) listeners.get(id)!(next);
        prev = next;
      });
    });

    useUi.getState().toggle("l7");

    expect(listeners.get("l7")).toHaveBeenCalledOnce();
    for (const [id, fn] of listeners) if (id !== "l7") expect(fn).not.toHaveBeenCalled();
    unsubs.forEach((u) => u());
  });

  it("shift range selects from the anchor, inclusive", () => {
    useUi.getState().toggle("l10");
    useUi.getState().selectRange(ids, "l49");
    expect(useUi.getState().selection.size).toBe(40);
  });

  it("ending an edit drops its draft", () => {
    useUi.getState().startEdit("l1", "price", "120", 1);
    expect(useUi.getState().drafts["l1:price"]).toBe("120");
    useUi.getState().endEdit();
    expect(useUi.getState().drafts["l1:price"]).toBeUndefined();
    expect(useUi.getState().editing).toBeNull();
  });
});
