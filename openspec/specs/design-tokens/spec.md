# design-tokens Specification

## Purpose

Keeps colour, spacing, type scale, density, radius and motion in one place, shared by the web console and the mobile app, so the visual language and its accessibility guarantees stay the same on both.

## Requirements

### Requirement: Single source of design values
All spacing, type, density, colour, radius and motion values SHALL be defined once. On web they SHALL be exposed as CSS custom properties, and on mobile as plain values. Components SHALL refer to roles, never to raw colours.

#### Scenario: Same value on both platforms
- **WHEN** the attention colour role is changed in the token source
- **THEN** both the web CSS variable and the mobile value change

### Requirement: Spacing and type scale
Spacing SHALL use a 4 px base: 0, 2, 4, 8, 12, 16, 24, 32, 48. Type SHALL use the system UI font stack with tabular figures for numbers, at sizes 12/16, 13/16, 14/20, 16/24 and 20/28.

#### Scenario: Numbers align
- **WHEN** prices are shown in a column
- **THEN** digits use tabular figures so the columns line up

### Requirement: Density modes
Two density modes SHALL exist. Compact is a 28 px row, 8 px cell padding and 13/16 text, about 30 rows on a 1080p screen. Comfortable is a 40 px row, 12 px cell padding and 14/20 text. Density SHALL change only row height, cell padding and text size.

#### Scenario: Switching density
- **WHEN** density switches from comfortable to compact
- **THEN** row height, cell padding and text size change, and toolbar and dialog spacing do not

### Requirement: Colour budget
Colour roles SHALL be: background, surface, raised surface, border, strong border, ink, muted ink, subtle ink, accent (focus and selection), attention plus attention background (errors, overpriced, stale), and danger (rollback only). No green role SHALL exist. Healthy states SHALL use ink.

#### Scenario: No green
- **WHEN** the colour roles are listed
- **THEN** none of them is green and "live" maps to ink

### Requirement: AA contrast in light theme
Every text and icon colour role in the light theme SHALL meet WCAG AA against the surfaces it is used on. Dark values SHALL be defined and marked as not contrast-verified.

#### Scenario: Attention text passes AA
- **WHEN** attention-coloured text is shown on the surface role
- **THEN** its contrast ratio is at least 4.5:1

### Requirement: Motion respects reduced motion
Motion SHALL use fast (120 ms) and base (200 ms) durations. When the user prefers reduced motion, durations SHALL be 0 and no flashing SHALL occur.

#### Scenario: Reduced motion
- **WHEN** the OS reduced-motion preference is on
- **THEN** transitions are instant and a rollback is shown without a flash
