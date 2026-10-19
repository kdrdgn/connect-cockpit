import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { EditCell } from "./EditCell";
import { registerTable } from "./focus";
import { useUi } from "./store";
import { harness } from "./testing";

function Cells({ id, quantity, price, version = 1 }: { id: string; quantity: number; price: number; version?: number }) {
  return (
    <table>
      <tbody data-table-body>
        <tr>
          <td>
            <EditCell id={id} index={0} field="quantity" value={quantity} version={version} label="Quantity" />
          </td>
          <td>
            <EditCell id={id} index={0} field="price" value={price} version={version} label="Price" />
          </td>
        </tr>
      </tbody>
    </table>
  );
}

beforeEach(() => {
  useUi.setState({ editing: null, drafts: {}, rollbackFlash: new Set() });
  registerTable(() => {}, 1);
});

describe("EditCell", () => {
  it("rejects -1 as a quantity and sends nothing", async () => {
    const h = await harness();
    const l = h.listings[0]!;
    render(<Cells id={l.id} quantity={l.quantity} price={l.price} version={l.version} />, { wrapper: h.wrapper });
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /^Quantity/ }));
    await user.keyboard("{Control>}a{/Control}-1{Enter}");
    expect(screen.getByRole("alert").textContent).toBe("Quantity must be 0 or more");
    expect(screen.getByRole("textbox")).toBeTruthy();
    expect(h.writes()).toHaveLength(0);
  });

  it("an unchanged commit sends nothing", async () => {
    const h = await harness();
    const l = h.listings[0]!;
    render(<Cells id={l.id} quantity={l.quantity} price={l.price} version={l.version} />, { wrapper: h.wrapper });
    const user = userEvent.setup();
    screen.getByRole("button", { name: /^Price/ }).focus();
    await user.keyboard("{Enter}{Enter}");
    expect(screen.queryByRole("textbox")).toBeNull();
    await waitFor(() => expect(document.activeElement?.getAttribute("aria-label")).toMatch(/^Price: /));
    expect(h.writes()).toHaveLength(0);
  });

  it("Tab after typing 3 in quantity sends one PATCH and focuses the same row's price cell", async () => {
    const h = await harness();
    const l = h.listings.find((x) => x.quantity !== 3)!;
    render(<Cells id={l.id} quantity={l.quantity} price={l.price} version={l.version} />, { wrapper: h.wrapper });
    const user = userEvent.setup();
    screen.getByRole("button", { name: /^Quantity/ }).focus();
    await user.keyboard("3{Tab}");
    await waitFor(() => expect(h.writes()).toHaveLength(1));
    const [write] = h.writes();
    expect(write?.method).toBe("PATCH");
    expect(write?.body).toEqual({ quantity: 3, version: l.version });
    await waitFor(() => expect(document.activeElement?.getAttribute("aria-label")).toMatch(/^Price: /));
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("Escape cancels without writing", async () => {
    const h = await harness();
    const l = h.listings[0]!;
    render(<Cells id={l.id} quantity={l.quantity} price={l.price} version={l.version} />, { wrapper: h.wrapper });
    const user = userEvent.setup();
    screen.getByRole("button", { name: /^Price/ }).focus();
    await user.keyboard("{Enter}130{Escape}");
    await waitFor(() => expect(document.activeElement?.getAttribute("aria-label")).toMatch(/^Price: /));
    expect(h.writes()).toHaveLength(0);
  });
});

describe("EditCell conflicts", () => {
  it("shows what someone else saved and does not apply the broker's value", async () => {
    const { ToastRegion } = await import("@/ui/Toast");
    const { keys } = await import("@cockpit/client");
    const h = await harness();
    const l = h.listings[0]!;
    // Someone else saves £125 first; our cache still holds the old version.
    await h.client.patchListing(l.id, { price: 125, version: l.version });
    render(
      <>
        <Cells id={l.id} quantity={l.quantity} price={l.price} version={l.version} />
        <ToastRegion />
      </>,
      { wrapper: h.wrapper },
    );
    const user = userEvent.setup();
    screen.getByRole("button", { name: /^Price/ }).focus();
    await user.keyboard("{Enter}130{Enter}");
    await waitFor(() => expect(screen.getByText("Changed elsewhere to £125. Your £130 was not saved.")).toBeTruthy());
    expect(h.qc.getQueryData<{ price: number }>(keys.listing(l.id))?.price).toBe(125);
  });
});

describe("EditCell mid-edit changes", () => {
  it("a change that lands while typing keeps the draft, and the commit conflicts", async () => {
    const { ToastRegion } = await import("@/ui/Toast");
    const { applyChanges } = await import("@cockpit/client");
    const h = await harness();
    const l = h.listings[0]!;
    render(
      <>
        <Cells id={l.id} quantity={l.quantity} price={l.price} version={l.version} />
        <ToastRegion />
      </>,
      { wrapper: h.wrapper },
    );
    const user = userEvent.setup();
    screen.getByRole("button", { name: /^Price/ }).focus();
    await user.keyboard("{Enter}130");
    // Someone else saves £125, and the next poll brings it into the cache while the input is open.
    const changed = await h.client.patchListing(l.id, { price: 125, version: l.version });
    applyChanges(h.qc, [changed]);
    expect((screen.getByRole("textbox") as HTMLInputElement).value).toBe("130");
    await user.keyboard("{Enter}");
    await waitFor(() => expect(screen.getByText("Changed elsewhere to £125. Your £130 was not saved.")).toBeTruthy());
  });
});
