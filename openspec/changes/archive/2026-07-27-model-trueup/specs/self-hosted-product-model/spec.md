# self-hosted-product-model — delta

## ADDED Requirements

### Requirement: The baseline describes every capability the toolkit actually has

The self-hosted product model SHALL describe the behaviour the shipped toolkit exhibits, and SHALL
NOT describe behaviour it does not. In particular every capability that modifies or removes a user's
files SHALL be authorised by a requirement that also states the condition under which the product
refuses, so that a reader can establish from the model alone what the toolkit is permitted to do.

A requirement clause SHALL NOT be falsifiable by a configuration surface the product ships: where
output depends on repository configuration, the obligation SHALL name configuration among its
inputs.

Correcting the baseline against shipped behaviour SHALL itself go through a Product Change, because
the direction of the correction does not exempt it from the rule that the baseline changes only by
explicit promotion.

#### Scenario: A destructive capability is discoverable from the model

- **WHEN** a reader asks the model whether the toolkit can delete files in their repository
- **THEN** a requirement states that it removes managed files it no longer generates, and states
  that a file whose content has diverged is kept and reported instead

#### Scenario: No requirement is falsified by configuration

- **WHEN** a rendering choice changes which files are produced from the same assets and target
- **THEN** the reproducibility obligation accounts for configuration rather than being contradicted
  by it

#### Scenario: Corrections are promoted, not edited in

- **WHEN** the baseline is found to disagree with shipped behaviour
- **THEN** the correction is proposed as a Product Change, validated as an overlay, and reaches the
  baseline only by explicit promotion
