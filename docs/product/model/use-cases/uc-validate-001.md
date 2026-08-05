---
id: UC-VALIDATE-001
type: use-case
title: Validate the product model
status: active
primary-actor: ACT-PRODUCT-ENGINEER
supporting-actors:
  - ACT-AI-ASSISTANT
bounded-context: BC-PRODUCT-DEFINITION
governed-by:
  - BR-CANONICAL-001
  - BR-IDENTITY-001
  - BR-RELATIONSHIPS-001
  - BR-AI-001
uses-terms:
  - TERM-PRODUCT-ARTIFACT
  - TERM-PRODUCT-GRAPH
---

## Goal

A deterministic verdict on the structural coherence of the product model: either the model satisfies every structural contract, or a precise list of diagnostics says exactly what does not.

## Trigger

The Product Engineer runs `prodshape validate` — directly, from a repository hook, or in a continuous integration pipeline. The AI Assistant runs it after drafting to check its own output.

## Preconditions

- The repository is initialized and contains product artifacts.

## Main Flow

1. The actor runs `prodshape validate`.
2. All product artifacts are discovered from their canonical locations.
3. Each artifact is checked for structural conformance: frontmatter contract, required body sections, identity rules.
4. Every declared relationship is checked: the referenced ID must exist and its type must be allowed for that relationship.
5. Lifecycle rules are checked, including references from active artifacts to retired or deprecated ones.
6. Diagnostics are reported with stable codes, each naming the file and artifact concerned.
7. The command exits with a code reflecting the outcome: success when no errors exist, failure otherwise.

## Alternative Flows

- Change overlay: with `--change <ID>`, validation checks the model as it would look with that Product Change applied, without touching the baseline.
- Machine-readable output: with `--format json`, the same diagnostics are emitted in a form other tools can consume.

## Failure Conditions

- Structural errors exist: the command exits non-zero and lists every diagnostic with its stable code, file and artifact, so nothing must be fixed blind.

## Postconditions

- The actor knows whether the model is structurally coherent and, if not, exactly why.
- The repository state is unmodified: validation reports and never edits.
