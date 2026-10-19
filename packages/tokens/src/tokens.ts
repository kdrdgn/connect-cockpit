// Single source of design values for web (as CSS custom properties) and mobile (as plain values).

/** 4px base. Keys are multiples of 4, so space[4] = 16px and the CSS name is --space-4. */
export const space = { 0: 0, 0.5: 2, 1: 4, 2: 8, 3: 12, 4: 16, 6: 24, 8: 32, 12: 48 } as const;

export const font = {
  family: '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, Roboto, "Helvetica Neue", Arial, sans-serif',
  /** Applied to every figure so price and quantity columns line up. */
  numeric: "tabular-nums",
  weight: { regular: 400, medium: 500, semibold: 600 },
} as const;

/** [size, lineHeight] in px. */
export const text = {
  xs: [12, 16],
  sm: [13, 16],
  md: [14, 20],
  lg: [16, 24],
  xl: [20, 28],
} as const;

/** Density changes only row height, cell padding and cell text; toolbar and dialog spacing stay fixed. */
export const density = {
  comfortable: { rowHeight: 40, cellX: space[3], text: text.md },
  compact: { rowHeight: 28, cellX: space[2], text: text.sm },
} as const;
export type Density = keyof typeof density;

export const radius = { sm: 2, md: 4, lg: 8 } as const;

export const motion = { fast: 120, base: 200 } as const;

/**
 * Colour roles. There is deliberately no green: healthy is ink, so the few coloured marks are the work queue.
 * attention = errors, overpriced, stale pending. danger = rollback flash only. accent = focus and selection.
 */
export const color = {
  light: {
    bg: "#F5F6F8",
    surface: "#FFFFFF",
    surfaceRaised: "#FFFFFF",
    border: "#E2E5E9",
    borderStrong: "#C5CAD1",
    ink: "#1A1E23",
    inkMuted: "#47505B",
    inkSubtle: "#5F6873",
    accent: "#2152BF",
    accentBg: "#E8EEFA",
    attention: "#8F5200",
    attentionBg: "#FCF1DE",
    danger: "#B3261E",
    dangerBg: "#FCEBE9",
  },
  // Defined so components can be themed, but NOT contrast-verified. Not enabled by default.
  dark: {
    bg: "#101317",
    surface: "#171B20",
    surfaceRaised: "#1E232A",
    border: "#2A3038",
    borderStrong: "#3A424C",
    ink: "#E8EBEF",
    inkMuted: "#B4BCC6",
    inkSubtle: "#8D96A1",
    accent: "#7AA2F7",
    accentBg: "#1C2A47",
    attention: "#F0B45A",
    attentionBg: "#3A2A12",
    danger: "#F2867D",
    dangerBg: "#3D1C1A",
  },
} as const;
export type ColorRole = keyof typeof color.light;

export const tokens = { space, font, text, density, radius, motion, color } as const;
export type Tokens = typeof tokens;
