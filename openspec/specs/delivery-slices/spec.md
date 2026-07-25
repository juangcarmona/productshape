# delivery-slices Specification

## Purpose

Vertical delivery increments that decompose an approved Product Change into implementable, verifiable slices.

## Requirements

### Requirement: Slices validate against their owning change's overlay

Slice files under a change's `slices/` directory SHALL be schema-validated and their references
resolved against that change's overlay: `product-change` must name the containing change
(PRODUCT030 otherwise), every `implements[].requirement` and `affects` entry must resolve in the
overlay (PRODUCT006), partial coverage requires a `scope` (PRODUCT031), and `depends-on` must
reference sibling slices without cycles (PRODUCT032). Additionally, slice validation SHALL warn
(PRODUCT109) when a slice's `affects` names artifacts outside the closure computed from its
implemented requirements.

#### Scenario: Foreign change reference

- **WHEN** a slice inside chg-a declares product-change: CHG-B-001
- **THEN** PRODUCT030 is reported

#### Scenario: Partial coverage without scope

- **WHEN** an implements entry declares coverage: partial with no scope
- **THEN** PRODUCT031 is reported

#### Scenario: Dependency cycle

- **WHEN** slice A depends on slice B and B depends on A
- **THEN** PRODUCT032 is reported

#### Scenario: Excessive unrelated coverage

- **WHEN** a slice affects an artifact unreachable from its implemented requirements' closure
- **THEN** PRODUCT109 is reported as a warning naming the artifact
