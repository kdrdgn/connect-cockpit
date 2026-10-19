import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { onTableKeyDown } from "./keyboard";
import { Row } from "./Row";
import { ViewIdsContext } from "./selection";
import { useUi } from "./store";
import { harness } from "./testing";

beforeEach(() => useUi.setState({ selection: new Set(), anchor: null }));

async function renderRows() {
  const h = await harness();
  const page = await h.client.listListings({ limit: 60 });
  const { keys } = await import("@cockpit/client");
  for (const l of page.items) h.qc.setQueryData(keys.listing(l.id), l);
  const ids = page.items.map((l) => l.id);
  render(
    <ViewIdsContext.Provider value={ids}>
      <table>
        <tbody data-table-body onKeyDown={(e) => onTableKeyDown(e, ids)}>
          {ids.map((id, i) => (
            <Row key={id} id={id} index={i} />
          ))}
        </tbody>
      </table>
    </ViewIdsContext.Provider>,
    { wrapper: h.wrapper },
  );
  return { ids, boxes: screen.getAllByRole("checkbox") };
}

describe("row selection", () => {
  it("checking row 10 then shift-clicking row 49 selects 40", async () => {
    const { boxes } = await renderRows();
    const user = userEvent.setup();
    await user.click(boxes[10]!);
    await user.keyboard("{Shift>}");
    await user.click(boxes[49]!);
    await user.keyboard("{/Shift}");
    expect(useUi.getState().selection.size).toBe(40);
    expect(boxes.filter((b) => (b as HTMLInputElement).checked)).toHaveLength(40);
  });

  it("Space on a price cell selects its row instead of editing", async () => {
    const { ids } = await renderRows();
    const user = userEvent.setup();
    screen.getAllByRole("button", { name: /^Price/ })[3]!.focus();
    await user.keyboard(" ");
    expect([...useUi.getState().selection]).toEqual([ids[3]]);
    expect(screen.queryByRole("textbox")).toBeNull();
  });
});
