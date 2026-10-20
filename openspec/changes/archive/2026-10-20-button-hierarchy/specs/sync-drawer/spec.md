# Spec Delta

## MODIFIED Requirements

### Requirement: Space for an explanation
The drawer SHALL show, for each marketplace in error, an explanation and at most one suggested action between the error message and the manual actions. A suggested action that matches a manual action already shown SHALL NOT be repeated as a separate control. When no explanation is available, because it is loading, failed, timed out or was rejected, the manual actions SHALL be complete on their own.

#### Scenario: No explanation available
- **WHEN** no explanation is available for an errored marketplace
- **THEN** the drawer shows the error, Retry sync and the price and delist actions, with no empty or broken area

#### Scenario: Explanation available
- **WHEN** an explanation for StubHub's error has arrived
- **THEN** it appears under StubHub's error message, above StubHub's manual actions, and only in StubHub's section

#### Scenario: Suggestion matches Retry sync
- **WHEN** the explanation for StubHub suggests retrying
- **THEN** StubHub's section shows the explanation with no suggestion control, and Retry sync appears once, in the manual actions

## ADDED Requirements

### Requirement: Manual action emphasis
In each marketplace section, Retry sync SHALL be the primary action whenever it is offered, Edit price SHALL be a default button, and "Delist…" SHALL be a ghost button. These emphasis levels and their order SHALL NOT change when an explanation loads, fails or arrives.

#### Scenario: Errored marketplace
- **WHEN** the drawer shows a marketplace in error
- **THEN** Retry sync is primary, Edit price is default and "Delist…" is ghost, in that order

#### Scenario: Explanation arrives
- **WHEN** the explanation arrives while the broker is looking at the section
- **THEN** the manual actions keep the same emphasis and position they had while it was loading

#### Scenario: Healthy marketplace
- **WHEN** the drawer shows a live marketplace
- **THEN** no control in that section is filled

### Requirement: Delist confirmation is danger
Confirming a delist in the drawer SHALL use the danger emphasis, and "Keep listed" SHALL be a ghost button. While the confirmation is open, no other control in that section SHALL be filled.

#### Scenario: Confirming a delist
- **WHEN** the broker activates "Delist…" on an errored StubHub section
- **THEN** "Confirm delist from StubHub" is danger and has focus, "Keep listed" is ghost, and Retry sync shows as default until the confirmation closes
