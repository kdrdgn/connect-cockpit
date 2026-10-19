# Spec Delta

## Purpose

Shows where a listing's seats are in the venue and lets the broker filter the table by pointing at a section.

## ADDED Requirements

### Requirement: Venue map
The console SHALL show the venue's sections as an SVG map with the stage, each section labelled with its id. The map SHALL be collapsible, and collapsing it SHALL give the table its space.

#### Scenario: Map renders every section
- **WHEN** the console loads
- **THEN** the map shows all 16 sections with their labels and the stage

### Requirement: Highlight the current row's section
The section of the focused row, or of the drawer's listing when the drawer is open, SHALL be highlighted in the accent colour with a visible outline, not by colour alone.

#### Scenario: Focus moves
- **WHEN** focus moves from a row in section 104 to a row in section 204
- **THEN** section 104 loses its highlight and section 204 gains it

### Requirement: Filter by section
Clicking a section, or activating it from the keyboard, SHALL set the section filter to it. Activating the section that is already the filter SHALL clear it. The active section SHALL look different from the highlighted one.

#### Scenario: Click to filter
- **WHEN** the broker clicks section 104
- **THEN** the URL gets `section=104`, the table shows only section 104, and a "Section 104" chip appears

#### Scenario: Click again to clear
- **WHEN** the broker clicks section 104 again
- **THEN** the section filter is removed

### Requirement: Map is accessible
Every section SHALL be a focusable control with an accessible name that includes its label and the number of listings in the current view.

#### Scenario: Screen reader name
- **WHEN** a screen reader user focuses section 104 with 31 listings in view
- **THEN** it is announced as "Section 104, 31 listings"
