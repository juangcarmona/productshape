# ai-skills — delta

## ADDED Requirements

### Requirement: Recovery records provenance in frontmatter

The `recover-product` skill SHALL instruct that every candidate carries `provenance` frontmatter with
its source and confidence, and SHALL NOT instruct that provenance be recorded only in the body. It
SHALL state that frontmatter is a closed contract, that inventing a field is `PRODUCT002`, and that
the allowed fields can be read deterministically with `schema <kind>` rather than guessed.

Reasoning that is not part of the contract — which claims are observed, which inferred, what the
evidence does not settle — SHALL remain in the artifact body.

#### Scenario: Candidates carry queryable provenance

- **WHEN** the skill drafts a candidate from evidence
- **THEN** the candidate's frontmatter records the source and the confidence

#### Scenario: The obsolete workaround is gone

- **WHEN** the skill's recorded procedure is read
- **THEN** it does not instruct recording provenance in a body subsection to avoid schema rejection
