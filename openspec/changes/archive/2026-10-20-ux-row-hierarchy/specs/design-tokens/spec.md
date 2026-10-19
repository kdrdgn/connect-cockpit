# Spec Delta

## MODIFIED Requirements

### Requirement: Density modes
Two density modes SHALL exist. Compact is a 28 px row, 8 px cell padding and 13/16 text, about 30 rows on a 1080p screen. Comfortable is a 40 px row, 12 px cell padding and 14/20 text. Density SHALL change only row height, cell padding, text size and whether a cell's secondary line is stacked (comfortable) or inline (compact).

#### Scenario: Switching density
- **WHEN** density switches from comfortable to compact
- **THEN** row height, cell padding and text size change, and toolbar and dialog spacing do not

#### Scenario: Secondary line in compact
- **WHEN** a cell has a secondary line and density is compact
- **THEN** the secondary text sits on the same line as the primary text, and the row stays 28 px

### Requirement: Colour budget
Colour roles SHALL be: background, surface, raised surface, border, strong border, ink, muted ink, subtle ink, accent (focus and selection), attention plus attention background (errors, overpriced, stale), attention-strong (a price gap beyond ±30% only), and danger (rollback only). No green role SHALL exist, and attention-strong SHALL NOT be red. Healthy states SHALL use ink.

#### Scenario: No green
- **WHEN** the colour roles are listed
- **THEN** none of them is green and "live" maps to ink

#### Scenario: Red stays for rollback
- **WHEN** the colour roles are listed
- **THEN** danger is the only red role and attention-strong is an orange distinct from it

#### Scenario: Attention-strong passes AA
- **WHEN** attention-strong text is shown on the surface or the accent background
- **THEN** its contrast ratio is at least 4.5:1
