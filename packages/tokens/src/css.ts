import { type Density, type Tokens, tokens as defaultTokens } from "./tokens";

const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
const block = (selector: string, vars: Record<string, string>) =>
  `${selector} {\n${Object.entries(vars)
    .map(([k, v]) => `  --${k}: ${v};`)
    .join("\n")}\n}`;

function densityVars(t: Tokens, d: Density): Record<string, string> {
  const { rowHeight, cellX, text } = t.density[d];
  return {
    "row-height": `${rowHeight}px`,
    "cell-x": `${cellX}px`,
    "cell-font-size": `${text[0]}px`,
    "cell-line-height": `${text[1]}px`,
  };
}

function colorVars(palette: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(palette).map(([role, value]) => [`color-${kebab(role)}`, value]));
}

/** CSS for the root layout to inline. Components only ever use var(--…), never raw values. */
export function toCssVars(t: Tokens = defaultTokens): string {
  const root: Record<string, string> = {
    "font-family": t.font.family,
    "font-numeric": t.font.numeric,
    ...Object.fromEntries(Object.entries(t.space).map(([k, v]) => [`space-${String(k).replace(".", "_")}`, `${v}px`])),
    ...Object.fromEntries(
      Object.entries(t.text).flatMap(([k, [size, line]]) => [
        [`text-${k}-size`, `${size}px`],
        [`text-${k}-line`, `${line}px`],
      ]),
    ),
    ...Object.fromEntries(Object.entries(t.font.weight).map(([k, v]) => [`weight-${k}`, String(v)])),
    ...Object.fromEntries(Object.entries(t.radius).map(([k, v]) => [`radius-${k}`, `${v}px`])),
    ...Object.fromEntries(Object.entries(t.motion).map(([k, v]) => [`motion-${k}`, `${v}ms`])),
    ...colorVars(t.color.light),
    ...densityVars(t, "comfortable"),
  };
  return [
    block(":root", root),
    block('[data-density="compact"]', densityVars(t, "compact")),
    "/* Dark values are defined but not contrast-verified; opt in with data-theme=\"dark\". */",
    block('[data-theme="dark"]', colorVars(t.color.dark)),
    `@media (prefers-reduced-motion: reduce) {\n${block(":root", { "motion-fast": "0ms", "motion-base": "0ms" })}\n}`,
  ].join("\n\n");
}
