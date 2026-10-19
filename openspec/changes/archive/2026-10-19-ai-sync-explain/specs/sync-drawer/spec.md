# Spec Delta

## MODIFIED Requirements

### Requirement: Space for an explanation
The drawer SHALL show, for each marketplace in error, an explanation and one suggested action between the error message and the manual actions. When no explanation is available, because it is loading, failed, timed out or was rejected, the manual actions SHALL be complete on their own.

#### Scenario: No explanation available
- **WHEN** no explanation is available for an errored marketplace
- **THEN** the drawer shows the error, Retry sync and the price and delist actions, with no empty or broken area

#### Scenario: Explanation available
- **WHEN** an explanation for StubHub's error has arrived
- **THEN** it appears under StubHub's error message, above StubHub's manual actions, and only in StubHub's section
