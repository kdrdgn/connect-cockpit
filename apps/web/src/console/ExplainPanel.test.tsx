import { keys } from "@cockpit/client";
import type { ExplainResult, Listing } from "@cockpit/contract";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import buttonStyles from "@/ui/Button.module.css";
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
    sync: {
      ...base.sync,
      stubhub: { state: "live", updatedAt: base.date, listedQuantity: base.quantity },
      seatgeek: { state: "error", updatedAt: base.date, lastError: ERROR },
    },
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

describe("drawer action emphasis", () => {
  const variantOf = (button: HTMLElement) =>
    (["primary", "danger", "ghost"] as const).find((v) => button.classList.contains(buttonStyles[v] ?? "")) ?? "default";
  const section = (name: string) => within(screen.getByRole("region", { name }));
  const actions = (name: string) =>
    section(name)
      .getAllByRole("button")
      .filter((b) => !b.textContent?.startsWith("Suggested") && b.textContent !== "Try again")
      .map((b) => [b.textContent, variantOf(b)]);

  it("an errored marketplace leads with Retry sync, then Edit price, then a quiet Delist…", async () => {
    await setup(() => new Promise(() => {}));
    expect(actions("SeatGeek")).toEqual([
      ["Retry sync", "primary"],
      ["Edit price", "default"],
      ["Delist…", "ghost"],
    ]);
  });

  it("keeps the same emphasis and order once the explanation arrives", async () => {
    await setup(answer({ floor: 96 }));
    await screen.findByRole("button", { name: "Suggested: Adjust price to £114" });
    expect(variantOf(screen.getByRole("button", { name: "Suggested: Adjust price to £114" }))).toBe("default");
    expect(actions("SeatGeek")).toEqual([
      ["Retry sync", "primary"],
      ["Edit price", "default"],
      ["Delist…", "ghost"],
    ]);
  });

  it("confirming a delist is danger and takes over from Retry sync", async () => {
    const { user } = await setup(() => new Promise(() => {}));
    await user.click(section("SeatGeek").getByRole("button", { name: "Delist…" }));
    const confirm = section("SeatGeek").getByRole("button", { name: "Confirm delist from SeatGeek" });
    expect(document.activeElement).toBe(confirm);
    expect(actions("SeatGeek")).toEqual([
      ["Retry sync", "default"],
      ["Edit price", "default"],
      ["Confirm delist from SeatGeek", "danger"],
      ["Keep listed", "ghost"],
    ]);
  });

  it("a live marketplace has no filled button", async () => {
    await setup(() => new Promise(() => {}));
    expect(actions("StubHub")).toEqual([["Delist…", "ghost"]]);
  });

  it("a retry suggestion is not repeated: one Retry sync, explanation still shown", async () => {
    await setup(answer({ cause: "marketplace_outage", action: "retry" }));
    expect(await screen.findByText("Suggested: use Retry sync below.")).toBeTruthy();
    expect(screen.getByText("SeatGeek has a minimum price for this event.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /^Suggested:/ })).toBeNull();
    expect(section("SeatGeek").getAllByRole("button", { name: "Retry sync" })).toHaveLength(1);
  });
});
