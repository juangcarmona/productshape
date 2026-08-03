# 0007 — Deterministic core and AI reasoning are separated

Status: Accepted Date: 2026-07-25

## Context

The methodology is designed for AI-assisted engineering, so it is tempting to let AI do everything: elicit knowledge, write artifacts, and also decide whether the model is valid. But a verdict that varies between runs, models or prompts is not a verdict. Traceability, promotion gates and CI decisions need answers that are reproducible and contestable. At the same time, the genuinely hard work — turning conversations and code into good product artifacts — is exactly where AI helps most.

## Decision

Structural invariants are enforced only by deterministic code. Schema validation, identifier and reference resolution, relationship typing, overlay compilation, digest computation, staleness, closure selection and diagnostic ordering live in the `core` package and are exercised through the CLI. Given the same repository content, they produce the same diagnostics in the same order on every platform. AI output is never an input to a structural verdict.

AI is used only for semantic reasoning, through the six canonical skills: **define** (elicit and draft artifacts), **recover** (reconstruct product knowledge from an existing codebase), **analyze** (judge coherence, gaps and contradictions), **slice** (propose delivery decomposition), **prepare-handoff** (assemble and explain handoff context) and **audit** (review model quality). Skills draft and reason; they always end by invoking deterministic validation, and their output is reviewed like any authored content.

The four canonical hooks are deterministic guards: descriptors that invoke CLI commands at provider-defined points. Hooks block or warn on mechanical conditions; they never approve a change, never promote, and never rewrite content. Every approval point — accepting a change, approving a slice, promoting — is held by a human.

## Consequences

Positive:

- Validation results are reproducible, diffable and CI-safe; a green check means the same thing on every machine and every run.
- Diagnostics have stable codes and deterministic order, so tooling and pipelines can match on them without flakiness.
- AI can be swapped, upgraded or removed without changing what "valid" means; the methodology works, more slowly, with no AI at all.
- Clear accountability: structure is the tool's job, semantics are reviewed by humans.

Negative:

- Some real quality problems are invisible to validation. Two rules that contradict each other, a vague domain term, a use case that misses the actual user need — all pass every structural check and surface only through AI analysis or human review.
- The boundary itself must be policed: pressure to "just have the skill fix it" or to let a hook auto-approve recurs, and giving in even once breaks the reproducibility guarantee.
- Users may over-trust a passing validation run, reading structural soundness as semantic correctness.
