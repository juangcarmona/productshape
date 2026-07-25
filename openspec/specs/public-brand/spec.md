# public-brand Specification

## Purpose

The ProductShape public brand for the reference implementation, kept distinct from the methodology name Product Definition as Code.

## Requirements

### Requirement: The reference implementation ships under the ProductShape brand

The reference implementation SHALL present ProductShape as its public identity across the
repository name, the npm scope `@prodshape/*`, the primary binary `prodshape`, the documentation
title and every public reference, while the methodology keeps the name "Product Definition as
Code" and the two read as distinct layers. The `product-definition` binary SHALL remain a working
v0.x compatibility alias producing identical output, and the `.product/` configuration directory,
the `product-definition-as-code/...` schema identifiers (and their URN form) and the `PRODUCT###`
diagnostic codes SHALL be unchanged. Implements product requirement CON-BRAND-001
(CHG-BRAND-001 / SLI-BRAND-001).

#### Scenario: Public surfaces present ProductShape while the methodology name is retained

- **WHEN** a newcomer reads the repository, npm scope `@prodshape/*`, the `prodshape` binary, the
  documentation title or any public reference
- **THEN** each presents ProductShape as the reference implementation, the methodology is still
  named Product Definition as Code, and no surface conflates the two

#### Scenario: product-definition still works as an alias with identical output

- **WHEN** the same command is run through the `product-definition` alias instead of `prodshape`
- **THEN** it succeeds and produces output identical to the `prodshape` invocation

#### Scenario: Validate and doctor stay green with contracts unchanged

- **WHEN** `validate` and `doctor` are run on the renamed repository
- **THEN** both exit 0, and the `.product/` directory, the `product-definition-as-code/...` schema
  identifiers and the `PRODUCT###` diagnostic codes are unchanged
