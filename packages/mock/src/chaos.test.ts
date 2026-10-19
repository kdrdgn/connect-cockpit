import { describe, expect, it } from "vitest";
import { describeChaos, parseChaosParams } from "./chaos";

const parse = (qs: string) => parseChaosParams(new URLSearchParams(qs));

describe("parseChaosParams", () => {
  it("accepts well-formed values and reports nothing", () => {
    const { config, ignored } = parse("chaos=on&seed=42&latency=0-50&failRate=50&rate429=0");
    expect(config).toMatchObject({ seed: 42, latency: [0, 50], failRate: 50, rate429: 0 });
    expect(ignored).toEqual([]);
  });

  it.each([
    ["failRate=50%", "failRate", "15"],
    ["failRate=0.5", "failRate", "15"],
    ["failRate=150", "failRate", "15"],
    ["rate429=lots", "rate429", "5"],
    ["latency=500", "latency", "300-800"],
    ["latency=800-300", "latency", "300-800"],
    ["seed=abc", "seed", "random"],
    ["chaos=no", "chaos", "on"],
  ])("ignores %s and says what it used instead", (qs, key, using) => {
    const { ignored } = parse(qs);
    expect(ignored).toHaveLength(1);
    expect(ignored[0]).toMatchObject({ key, using });
  });

  it("falls back to the default for an ignored value", () => {
    expect(parse("failRate=50%").config.failRate).toBe(15);
  });
});

describe("describeChaos", () => {
  it("names every setting in words", () => {
    const { config } = parse("seed=42&chaos=off");
    expect(describeChaos(config)).toBe(`chaos off · latency 0–20 ms · writes fail 0% · 429 on 0% of reads · write seed 42 · data seed ${config.dataSeed}`);
  });
});
