import type { LiveStatus } from "@cockpit/client";
import { describe, expect, it } from "vitest";
import { liveText } from "./LiveIndicator";

const now = 100_000;
const ok: LiveStatus = { lastOkAt: now - 2_000, pausedUntil: null, failures: 0, hidden: false };
const ready = { started: true, waitUntil: null };

describe("liveText", () => {
  it("says Connecting before anything has loaded, not Live", () => {
    expect(liveText({ ...ok, lastOkAt: null }, now, { started: false, waitUntil: null })).toBe("Connecting…");
  });

  it("shows a blocking rate-limit wait in the same slot, ahead of everything else", () => {
    expect(liveText(ok, now, { started: false, waitUntil: now + 2_400 })).toBe("Waiting 3s…");
  });

  it("keeps freshness, quiet poll pauses and stalls as before", () => {
    expect(liveText(ok, now, ready)).toBe("Live · 2s ago");
    expect(liveText({ ...ok, pausedUntil: now + 3_000 }, now, ready)).toBe("Live · paused 3s");
    expect(liveText({ ...ok, failures: 3 }, now, ready)).toBe("Updates stalled. Retrying");
  });
});
