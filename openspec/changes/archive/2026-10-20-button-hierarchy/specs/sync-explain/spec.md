# Spec Delta

## MODIFIED Requirements

### Requirement: Explanation loads on its own
When the drawer shows a marketplace in error, an explanation for that marketplace SHALL be requested without the broker asking. It SHALL show a short plain-language explanation of at most 280 characters, a cause and one suggested action. When the suggested action is retry, the drawer's existing Retry sync SHALL serve as the suggestion and no second control SHALL be shown. The manual actions SHALL be shown and usable before the explanation arrives.

#### Scenario: Opening an errored listing
- **WHEN** the broker opens a listing whose SeatGeek sync is in error
- **THEN** the SeatGeek section shows Retry sync, Edit price and Delist at once, and an explanation appears below the error when it arrives, with a suggestion control only if the suggestion is not retry

#### Scenario: Suggested retry is not duplicated
- **WHEN** the explanation for SeatGeek suggests retrying
- **THEN** the explanation and cause are shown, no "Suggested: Retry sync" control appears, and the section has exactly one Retry sync control

#### Scenario: Marketplaces that are not in error
- **WHEN** the drawer opens on a listing with no marketplace in error
- **THEN** no explanation is requested

### Requirement: A human confirms every suggestion
A suggestion SHALL perform nothing by itself. Activating it SHALL start the same manual action the drawer already offers: adjust price opens the listing's inline price editor with the suggested price filled in for the broker to confirm, and delist opens the existing two-step delist confirmation. A retry suggestion SHALL rely on the drawer's own Retry sync, which the broker activates. A suggestion control SHALL be a default button, never primary or danger.

#### Scenario: Suggested price
- **WHEN** the broker activates "Adjust price to £114"
- **THEN** the price cell for that listing is in edit mode with 114 filled in, and no write is sent until the broker presses Enter

#### Scenario: Suggested delist
- **WHEN** the broker activates a suggested delist
- **THEN** the drawer shows "Confirm delist from SeatGeek" and nothing is delisted until it is pressed

#### Scenario: Suggestion emphasis
- **WHEN** the explanation suggests adjusting the price or delisting
- **THEN** the suggestion control is a default button and Retry sync remains the section's only primary action
