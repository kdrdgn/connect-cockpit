# Spec Delta

## MODIFIED Requirements

### Requirement: Deterministic fixtures
Given a data seed, the mock SHALL generate the same dataset every time: about 500 listings across 18 events named "Artist – Tour" with fictional artist and tour names, about 5 fictional venue names that share one section layout of 16 sections drawn as SVG polygons, each event at one venue, and every listing's section matching a layout section id. About 2% of listings SHALL start with a quantity mismatch.

#### Scenario: Reproducible data
- **WHEN** fixtures are generated twice with the same data seed
- **THEN** both datasets are identical

#### Scenario: Sections match the map
- **WHEN** any listing is read
- **THEN** its section id exists in the shared layout's sections

#### Scenario: Venues vary
- **WHEN** fixtures are generated with the default data seed
- **THEN** listings name at least 4 different venues, and all listings for one event name the same venue

#### Scenario: Event names carry a tour
- **WHEN** any listing is read
- **THEN** its event reads "<artist> – <tour>"
