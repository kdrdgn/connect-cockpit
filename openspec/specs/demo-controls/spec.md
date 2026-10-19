# demo-controls Specification

## Purpose

Lets the presenter make the mock misbehave on demand during a live demo, so failure paths can be shown without waiting for chance.

## Requirements

### Requirement: Runtime chaos controls
A small panel, closed by default, SHALL let the presenter switch chaos on or off, set the write failure rate from 0 to 100%, and trigger a drift update immediately. Changes SHALL apply to the next request without a reload and SHALL NOT discard listing state.

#### Scenario: Raise the failure rate
- **WHEN** the presenter sets the failure rate to 50% and applies a bulk change to 40 rows
- **THEN** about half of the rows fail, and the listings edited earlier keep their edits

#### Scenario: Drift now
- **WHEN** the presenter triggers a drift update
- **THEN** sync changes appear in the table on the next poll

### Requirement: Panel never ships to brokers by accident
The panel SHALL be reachable only when the page is opened with a demo flag in the URL, and SHALL say plainly that it controls a mock.

#### Scenario: Normal URL
- **WHEN** the console is opened without the demo flag
- **THEN** no demo panel or its toggle is present
