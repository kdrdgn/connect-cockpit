import { describe, expect, it } from "vitest";
import { contrastRatio, hueSaturation } from "./contrast";
import { toCssVars } from "./css";
import { type ColorRole, color } from "./tokens";

const light = color.light;
const TEXT_ROLES: ColorRole[] = ["ink", "inkMuted", "inkSubtle", "accent", "attention", "attentionStrong", "danger"];
const SURFACES: ColorRole[] = ["bg", "surface", "surfaceRaised"];
// Status text also sits on its own tint.
const TINTED: [ColorRole, ColorRole][] = [
  ["accent", "accentBg"],
  ["attention", "attentionBg"],
  ["danger", "dangerBg"],
  ["ink", "accentBg"],
  ["ink", "attentionBg"],
  // A far-off price gap on a selected row.
  ["attentionStrong", "accentBg"],
];

describe("design tokens", () => {
  it("generates stable CSS variables", () => {
    expect(toCssVars()).toMatchSnapshot();
  });

  it("switches density through variables", () => {
    const css = toCssVars();
    expect(css).toContain("--row-height: 40px;");
    expect(css).toMatch(/\[data-density="compact"\] \{[^}]*--row-height: 28px;/);
    expect(css).toContain("--space-4: 16px;");
  });

  it("has no green role, by name or by value", () => {
    for (const palette of [color.light, color.dark]) {
      for (const [role, value] of Object.entries(palette)) {
        expect(role.toLowerCase()).not.toContain("green");
        const { hue, saturation } = hueSaturation(value);
        expect(saturation > 0.25 && hue >= 75 && hue <= 165, `${role} ${value} reads as green`).toBe(false);
      }
    }
  });

  it.each(TEXT_ROLES.flatMap((t) => SURFACES.map((s) => [t, s] as const)))(
    "light %s on %s meets AA (4.5:1)",
    (fg, bg) => {
      expect(contrastRatio(light[fg], light[bg])).toBeGreaterThanOrEqual(4.5);
    },
  );

  it.each(TINTED)("light %s on %s meets AA (4.5:1)", (fg, bg) => {
    expect(contrastRatio(light[fg], light[bg])).toBeGreaterThanOrEqual(4.5);
  });

  it("exposes attention-strong as a CSS variable", () => {
    expect(toCssVars()).toContain("--color-attention-strong: #A8400A;");
  });

  it("keeps red for rollback: attention-strong is an orange, danger the only red", () => {
    for (const palette of [color.light, color.dark]) {
      expect(hueSaturation(palette.attentionStrong).hue).toBeGreaterThanOrEqual(15);
      const reds = Object.entries(palette).filter(([, v]) => {
        const { hue, saturation } = hueSaturation(v);
        return saturation > 0.25 && (hue < 15 || hue > 345);
      });
      expect(reds.map(([role]) => role).filter((r) => !r.startsWith("danger"))).toEqual([]);
    }
  });

  it("zeroes motion under prefers-reduced-motion", () => {
    expect(toCssVars()).toMatch(/prefers-reduced-motion: reduce[\s\S]*--motion-fast: 0ms;[\s\S]*--motion-base: 0ms;/);
  });
});
