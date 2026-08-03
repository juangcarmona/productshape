# structural-validation — delta

## ADDED Requirements

### Requirement: Draft artifacts resting on weak evidence are surfaced for review

Baseline validation SHALL report `PRODUCT111` as a warning for every artifact whose status is `draft` and whose `provenance.confidence` is `low`, naming the artifact and the `provenance.confidence` field. The warning SHALL NOT be configuration-gated: unlike the model-shape warnings, it reports a property the artifact asserts about itself.

An artifact with no `provenance`, with a higher confidence, or with a status other than `draft` SHALL NOT be reported: accepting a low-confidence candidate into the baseline is the human decision the warning exists to prompt, and it MUST stop firing once made.

#### Scenario: Low-confidence draft reported

- **WHEN** a `draft` artifact declares `provenance.confidence: low`
- **THEN** validation reports `PRODUCT111` as a warning naming that artifact

#### Scenario: Accepted candidate no longer reported

- **WHEN** the same artifact is promoted to `active` with its provenance unchanged
- **THEN** no `PRODUCT111` warning is reported

#### Scenario: Greenfield artifacts unaffected

- **WHEN** a `draft` artifact declares no provenance
- **THEN** no `PRODUCT111` warning is reported
