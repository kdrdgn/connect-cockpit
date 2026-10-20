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
Two density modes SHALL exist. Compact is a 28 px row, 8 px cell padding and 13/16 text, about 30 rows on a 1080p screen. Comfortable is a 40 px row, 12 px cell padding and 14/20 text. Density SHALL change only row height, cell padding, text size and whether a cell's secondary line is stacked (comfortable) or inline (compact).

#### Scenario: Switching density
- **WHEN** density switches from comfortable to compact
- **THEN** row height, cell padding and text size change, and toolbar and dialog spacing do not

#### Scenario: Secondary line in compact
- **WHEN** a cell has a secondary line and density is compact
- **THEN** the secondary text sits on the same line as the primary text, and the row stays 28 px

### Requirement: Colour budget
Colour roles SHALL be: background, surface, raised surface, border, strong border, ink, muted ink, subtle ink, accent (focus and selection), attention plus attention background (errors, overpriced, stale), attention-strong (a price gap beyond ±30% only), and danger (a system rollback, or confirming an action that removes something). A system rollback is the console reverting an edit the server rejected; an Undo the broker starts is not one. No green role SHALL exist, and attention-strong SHALL NOT be red. Healthy states SHALL use ink.

#### Scenario: No green
- **WHEN** the colour roles are listed
- **THEN** none of them is green and "live" maps to ink

#### Scenario: Red stays for rollback
- **WHEN** the colour roles are listed
- **THEN** danger is the only red role, it is used only for a system rollback or a control that confirms removing something, and attention-strong is an orange distinct from it

#### Scenario: Undo is not danger
- **WHEN** the console offers Undo after a bulk action
- **THEN** the Undo control does not use the danger role

#### Scenario: Attention-strong passes AA
- **WHEN** attention-strong text is shown on the surface or the accent background
- **THEN** its contrast ratio is at least 4.5:1

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

### Requirement: Button emphasis follows consequence
Buttons SHALL use four emphasis levels, each with one meaning: primary for the recommended next step, danger for confirming an action that removes something, default for a reasonable alternative, and ghost for an escape or the start of a flow. Attention colours SHALL NOT be used on buttons, since they describe state, not actions.

#### Scenario: Starting a destructive flow is quiet
- **WHEN** a control opens a confirmation for removing something rather than doing it
- **THEN** it is a ghost button, and only the confirming control uses danger

#### Scenario: No amber buttons
- **WHEN** a control fixes a problem shown in attention colour
- **THEN** the control itself does not use attention colours

### Requirement: One filled button per section
At most one filled button (primary or danger) SHALL be visible in a section, dialog footer or toolbar group at a time. When none of the actions is clearly recommended, none SHALL be filled.

#### Scenario: Confirming replaces the recommendation
- **WHEN** a section shows a primary recommended action and the broker opens a destructive confirmation in that section
- **THEN** the confirming control is danger and the previously primary control shows as default until the confirmation closes

### Requirement: Danger buttons are filled and legible
A danger button SHALL be filled with the danger colour and use the surface colour for its text, mirroring primary. Its text SHALL meet WCAG AA against its fill in the light theme.

#### Scenario: Danger contrast
- **WHEN** a danger button is shown in the light theme
- **THEN** its label's contrast ratio against its fill is at least 4.5:1
