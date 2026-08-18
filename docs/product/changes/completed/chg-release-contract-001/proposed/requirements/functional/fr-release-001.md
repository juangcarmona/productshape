---
id: FR-RELEASE-001
type: functional-requirement
title: Keep the released CLI and public guidance executable as one contract
status: active
derived-from:
  - UC-INIT-001
verification:
  - scenario: The CLI prints its own package version and exits successfully
  - scenario: The primary quickstart identifies an exact supported published CLI version and every command succeeds against it
  - scenario: Behaviour not present in the supported published baseline is absent from current guidance or marked unreleased
  - scenario: A release candidate is packed, installed without workspace links in a clean repository, and executes the documented initialization and citation-drift workflow
  - scenario: Public package names, migration language, changelog and limitations agree on the supported release baseline
---

## Requirement

The ProductShape CLI MUST print the version of the installed `@prodshape/cli` package when invoked with `--version` and MUST exit successfully. The value MUST come from the same package metadata used to build and publish that executable; the product MUST NOT require a second manually maintained version value.

The primary public quickstart MUST identify an exact supported published CLI version and MUST contain only commands that version implements. Public documentation MUST either omit behaviour that has not reached the supported published baseline or mark it explicitly as unreleased. Current package names and compatibility language MUST agree across the root documentation, package documentation, release notes and limitations.

The release gate MUST build and pack the release candidate, install that tarball into a clean temporary repository without workspace links, and execute the primary quickstart from its published source rather than a simplified test copy. The workflow MUST initialize and validate the repository, emit a citation through the documented mechanism, verify it as current, change the cited artifact, verify the citation as stale for the specified diagnostic reason, and confirm `prodshape --version` against the packed package metadata.

## Rationale

A command, its package and the documentation that tells a user to run it are not independent deliverables. If the documentation advances first, a valid package rejects the copied command; if tests use workspace links or a private recipe, they prove a different product from the one users install. An exact supported baseline makes the contract reproducible, while explicit unreleased labels let the next release be documented without being misrepresented as current.

The package manifest already owns release identity. Reading or embedding that value at build time prevents a second constant from drifting. Packing and installing before the smoke test catches missing files, invalid package metadata, broken binaries and accidental workspace resolution that ordinary unit tests cannot see.

## Acceptance Scenarios

- A user installs the exact CLI version named by the primary quickstart and runs `prodshape --version`. The printed value equals the package manifest version and the process exits `0`.
- A release candidate is built and packed. The smoke test installs only the tarball in a clean repository, extracts and executes the canonical quickstart, and completes initialization, validation and the citation workflow without workspace resolution.
- The quickstart emits a citation to a canonical artifact and verification reports it `current`. After the documented edit changes that artifact, verification reports it `stale` with `PRODUCT061`; any other status or reason fails the contract.
- A command exists on the development branch but not in the exact supported published package. Current public guidance does not claim that the published baseline implements it; next-release material labels it unreleased.
- A package is renamed or superseded. Primary documentation and migration language identify the current package and state the compatibility boundary without mixing the old and current names.
