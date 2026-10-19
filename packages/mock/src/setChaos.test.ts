import { describe, expect, it } from "vitest";
import { createEngine } from "./engine";

const patch = (id: string, version: number, price: number) =>
  new Request(`http://mock.local/api/listings/${id}`, { method: "PATCH", body: JSON.stringify({ version, price }), headers: { "Content-Type": "application/json" } });

describe("setChaos", () => {
  it("raising failRate to 100 fails the next write and keeps every listing as it was", async () => {
    const engine = createEngine({ config: { latency: [0, 0], failRate: 0, rate429: 0 } });
    const [a, b] = engine.all();
    const ok = await engine.handle(patch(a!.id, a!.version, 111));
    expect(ok.status).toBe(200);
    const countBefore = engine.all().length;

    engine.setChaos({ failRate: 100 });
    const res = await engine.handle(patch(b!.id, b!.version, 222));
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(engine.all()).toHaveLength(countBefore);
    expect(engine.get(a!.id)?.price).toBe(111); // the earlier edit survives
    expect(engine.get(b!.id)?.price).toBe(b!.price);
  });

  it("chaos off and on restores the previous values", () => {
    const engine = createEngine({ config: { latency: [300, 800], failRate: 40, rate429: 5 } });
    engine.setChaos({ chaos: false });
    expect(engine.config).toMatchObject({ chaos: false, failRate: 0, rate429: 0, latency: [0, 20] });
    engine.setChaos({ chaos: true });
    expect(engine.config).toMatchObject({ chaos: true, failRate: 40, rate429: 5, latency: [300, 800] });
  });
});
