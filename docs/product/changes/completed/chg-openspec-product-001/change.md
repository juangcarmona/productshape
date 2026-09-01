---
id: CHG-OPENSPEC-PRODUCT-001
type: product-change
title: Host the product workflow in OpenSpec through a managed project-local schema
status: applied
base-revision: '940d1a3'
operations:
  add: []
  modify:
    - FR-OPENSPEC-001
  remove: []
---

## Problem

The accepted OpenSpec integration contract limits repository writes to the configuration file and the integration metadata, and forbids forking OpenSpec's default schema. Written when configuration was the only official OpenSpec extension surface, that wording also forbids installing a separate project-local schema, which is OpenSpec's own supported extension mechanism and the only way to host a PDaC product workflow inside OpenSpec without patching the framework.

## Intended Product Outcome

The integration has two lanes with one ownership rule. The citation lane keeps grounding spec-driven delivery documents in the accepted model. The product lane installs a managed project-local schema named product whose OpenSpec changes host an ordinary Product Change delta; the hosted delta validates as an overlay with concurrency spanning both change containers, apply revalidates at apply time and honours the accepted apply obligations except the container move, which OpenSpec's own archive operation performs later without ever touching the model, and the product workflow's availability is reported per capability so an OpenSpec below its floor leaves the citation lane fully usable. The integration still never patches OpenSpec-generated files, never modifies OpenSpec's built-in schemas and never writes into a native spec-driven change's documents.

## Rationale

The boundary being protected was never "no schemas"; it was native ownership: the framework's files belong to the framework. A project-local schema directory is the framework's official surface for project extensions, exactly as the configuration file is, so installing managed files there is configuration, not colonisation, and a workspace with the integration removed remains a fully valid OpenSpec workspace. Making the prohibition precise (generated files, built-in schemas, native change documents) keeps the original protection and unblocks hosting the product workflow where the workflow engine lives.

## Affected Product Areas

The OpenSpec integration requirement: its official write surfaces, the new hosted product workflow obligations, and capability-specific availability. No other artifact changes; the citation, drift, scope and mutation obligations stay as accepted.

## Open Questions

None.

## Product Acceptance

FR-OPENSPEC-001 names the two lanes and the precise prohibitions, states the hosted product workflow obligations (managed schema installation, overlay validation with cross-container concurrency, apply-time revalidation under the apply-authorised state with the container move left to the framework's archive, capability-specific availability), and its scenarios cover schema lifecycle, hosted validation, hosted apply, archive as container-move-only and the availability report.

## Out of Scope

The delivery workflow and its schema, any wrapper composing product and delivery, the ProductShape Product Change commands and their lifecycle, ADRs, the Spec Kit integration, and every other artifact of this definition.
