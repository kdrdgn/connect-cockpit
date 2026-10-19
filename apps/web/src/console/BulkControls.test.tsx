import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { BulkControls } from "./BulkActions";
import { ViewIdsContext } from "./selection";

function setup() {
  const preview = vi.fn();
  render(
    <ViewIdsContext.Provider value={["L1", "L2"]}>
      <BulkControls flow={{ preview } as never} />
    </ViewIdsContext.Provider>,
  );
  return { preview, user: userEvent.setup() };
}

describe("BulkControls", () => {
  it("names the two previews differently", () => {
    setup();
    expect(screen.getByRole("button", { name: "Preview price change…" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Preview delist…" })).toBeTruthy();
  });

  it("has no default marketplace for delist; the preview waits for a choice", async () => {
    const { preview, user } = setup();
    const button = screen.getByRole("button", { name: "Preview delist…" }) as HTMLButtonElement;
    expect((screen.getByLabelText("Delist from") as HTMLSelectElement).value).toBe("");
    expect(button.disabled).toBe(true);
    await user.selectOptions(screen.getByLabelText("Delist from"), "seatgeek");
    await user.click(button);
    expect(preview).toHaveBeenCalledWith({ kind: "delist", marketplace: "seatgeek" }, ["L1", "L2"]);
  });
});
