import { keys } from "@cockpit/client";
import type { ExplainResult, Listing } from "@cockpit/contract";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { useToasts } from "@/ui/Toast";
import { Drawer } from "./Drawer";
import { EditCell } from "./EditCell";
import { registerTable } from "./focus";
import { useUi } from "./store";
import { harness } from "./testing";

const ERROR = "SeatGeek rejected the price: below the event minimum of £96";
const meta = { source: "model", cached: false, inputTokens: 400, outputTokens: 60, latencyMs: 900 } as const;
const answer = (result: Partial<ExplainResult>) => async () =>
  Response.json({
    result: { explanation: "SeatGeek has a minimum price for this event.", cause: "price_rule", action: "adjust_price", confidence: "high", flagged: false, ...result },
    meta,
  });

async function setup(explain: (body: unknown) => Promise<Response>) {
  const h = await harness({}, { explain });
  const base = h.listings[0]!;
  const listing: Listing = {
    ...base,
    price: 90,
    marketPrice: 120,
    sync: { ...base.sync, seatgeek: { state: "error", updatedAt: base.date, lastError: ERROR } },
  };
  h.qc.setQueryData(keys.listing(listing.id), listing);
  render(
    <>
      <table>
        <tbody data-table-body>
          <tr data-id={listing.id}>
            <td>
              <EditCell id={listing.id} index={0} field="price" value={listing.price} version={listing.version} label="Price" />
            </td>
          </tr>
        </tbody>
      </table>
      <Drawer id={listing.id} returnTo={{ row: 0, col: 0 }} />
    </>,
    { wrapper: h.wrapper },
  );
  return { h, listing, user: userEvent.setup() };
}

beforeEach(() => {
  useUi.setState({ editing: null, drafts: {}, rollbackFlash: new Set() });
  useToasts.setState({ toasts: [] });
  registerTable(() => {}, 1);
});

describe("ExplainPanel", () => {
  it("shows the manual actions while the explanation is loading", async () => {
    await setup(() => new Promise(() => {}));
    expect(await screen.findByText("Reading the error…")).toBeTruthy();
    for (const name of ["Retry sync", "Edit price", "Delist…"]) {
      expect(screen.getAllByRole("button", { name }).length).toBeGreaterThan(0);
    }
  });

  it("Adjust price to £114 opens the price editor with 114 and sends nothing", async () => {
    const { h, user } = await setup(answer({ floor: 96 }));
    await user.click(await screen.findByRole("button", { name: "Suggested: Adjust price to £114" }));
    await waitFor(() => expect((screen.getByRole("textbox") as HTMLInputElement).value).toBe("114"));
    expect(h.writes()).toHaveLength(0);
  });

  it("a suggested delist opens the existing confirmation and delists nothing", async () => {
    const { h, user } = await setup(answer({ cause: "duplicate_listing", action: "delist" }));
    await user.click(await screen.findByRole("button", { name: "Suggested: Delist from SeatGeek…" }));
    expect(screen.getByRole("button", { name: "Confirm delist from SeatGeek" })).toBeTruthy();
    expect(h.writes()).toHaveLength(0);
  });

  it("a failed request shows No suggestion and Try again, with no toast", async () => {
    let calls = 0;
    await setup(async () => {
      calls++;
      return Response.json({ result: null, reason: "model_error", meta }, { status: 502 });
    });
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Try again" }));
    await waitFor(() => expect(calls).toBe(2));
    expect(screen.getByText(/No suggestion/)).toBeTruthy();
    expect(useToasts.getState().toasts).toHaveLength(0);
  });

  it("labels an answer from the mock", async () => {
    await setup(async () =>
      Response.json({ result: { explanation: "x", cause: "unknown", action: "none", confidence: "low", flagged: true }, meta: { ...meta, source: "mock" } }),
    );
    expect(await screen.findByText("Mock AI")).toBeTruthy();
    expect(screen.getByText("No action suggested.")).toBeTruthy();
    expect(screen.getByText("Low confidence")).toBeTruthy();
  });
});
