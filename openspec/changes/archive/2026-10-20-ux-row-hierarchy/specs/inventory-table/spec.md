# Spec Delta

## MODIFIED Requirements

### Requirement: Columns
Each row SHALL show a selection checkbox, the event with its venue, the date, section and row together as "section / row", quantity, price, the gap to market, and one narrow column per marketplace (StubHub, SeatGeek, Vivid Seats, Ticombo) in that fixed order. Prices and quantities SHALL use tabular figures.

#### Scenario: Marketplace columns scan vertically
- **WHEN** the broker looks down the StubHub column
- **THEN** every row's StubHub state is in the same horizontal position

### Requirement: Price health at a glance
Each row SHALL show its gap to market as a signed percentage with a direction glyph, using the contract's price-health bands. At market SHALL use muted ink. Above and below SHALL use ink. Overpriced and underpriced SHALL use the attention colour, and a gap beyond ±30% SHALL use the attention-strong colour with a doubled direction glyph, so that tier is visible without colour. The accessible name of a gap beyond ±30% SHALL say it is far from market.

#### Scenario: Overpriced row
- **WHEN** price is 125 and market price is 100
- **THEN** the gap cell shows one up glyph and "+25%" in the attention colour

#### Scenario: Far above market
- **WHEN** price is 142 and market price is 100
- **THEN** the gap cell shows a doubled up glyph and "+42%" in the attention-strong colour, and its accessible name is "42% above market, overpriced, far from market"

#### Scenario: Far below market
- **WHEN** price is 68 and market price is 100
- **THEN** the gap cell shows a doubled down glyph and "−32%" in the attention-strong colour

#### Scenario: Healthy row stays quiet
- **WHEN** price is 102 and market price is 100
- **THEN** the gap cell shows "+2%" in muted ink with no colour

#### Scenario: Above market is ink
- **WHEN** price is 110 and market price is 100
- **THEN** the gap cell shows "+10%" in ink with no colour

### Requirement: Density modes
A toggle SHALL switch between comfortable (40 px rows) and compact (28 px rows, about 30 rows on a 1080p screen). The choice SHALL change row height, cell padding, cell text size and the event cell's layout (venue on a second line in comfortable, after the event on the same line in compact). It SHALL persist across reloads on the same browser.

#### Scenario: Compact on 1080p
- **WHEN** compact is chosen on a 1920×1080 window
- **THEN** at least 28 data rows are visible without scrolling

#### Scenario: Venue line by density
- **WHEN** density switches from comfortable to compact
- **THEN** the venue moves from its own line under the event to the same line after the event, and the row height becomes 28 px

## ADDED Requirements

### Requirement: Date and seat formats
The date SHALL show day and short month, day first ("30 Oct"), with the full date including weekday in its tooltip. The section / row cell SHALL read "section / row" and have the accessible name "Section <section>, row <row>", and its header SHALL sort by section.

#### Scenario: Short date
- **WHEN** a listing's event is on Friday 30 October
- **THEN** the date cell shows "30 Oct" and its tooltip shows the full date with "Friday"

#### Scenario: Section and row together
- **WHEN** a listing is in section 112, row F
- **THEN** the cell shows "112 / F" and a screen reader announces "Section 112, row F"

#### Scenario: Sort by section
- **WHEN** the broker activates the "Sec / Row" header
- **THEN** rows are sorted by section

### Requirement: Row hierarchy
The event SHALL be the strongest text in a row, and the venue SHALL be muted under or after it. When space runs out, the venue SHALL be truncated before the event. The price SHALL be semibold in ink at the row's text size. The date and the section / row cell SHALL be muted ink at regular weight. A row repeating the event and date of the row above SHALL mute its event and venue.

#### Scenario: Price stands out
- **WHEN** a row is rendered
- **THEN** its price is semibold ink, and its quantity, date and section / row are regular weight

#### Scenario: Narrow event column in compact
- **WHEN** compact is on and the event and venue do not fit
- **THEN** the venue is truncated first and the full event name stays visible as long as it fits

#### Scenario: Repeated event
- **WHEN** a row has the same event and date as the row above
- **THEN** its event and venue are both shown muted
