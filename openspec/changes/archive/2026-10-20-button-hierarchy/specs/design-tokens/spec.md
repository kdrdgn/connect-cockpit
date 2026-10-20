# Spec Delta

## MODIFIED Requirements

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

## ADDED Requirements

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
