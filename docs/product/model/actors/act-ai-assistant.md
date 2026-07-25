---
id: ACT-AI-ASSISTANT
type: actor
title: AI Assistant
status: active
actor-kind: external-system
---

## Purpose

The AI Assistant is an AI coding or product assistant (for example Claude Code or GitHub Copilot)
that executes the canonical skills of the methodology. It supplies the semantic reasoning that
deterministic tooling cannot: drafting, interpretation, analysis and proposal.

## Goals

- Produce draft artifacts, change proposals, slice proposals and handoff context that a human can
  review quickly and trust.
- Surface gaps, ambiguities and contradictions in the product model instead of papering over
  them.

## Responsibilities

- Draft product artifacts from stated intent, following the artifact contracts.
- Analyze the semantic meaning of a proposed change on top of structural impact results.
- Propose Delivery Slices for approved changes and prepare Product Handoff context.
- Audit the model for semantic weaknesses: vague rules, untraceable requirements, inconsistent
  terminology.

## Boundaries

- Performs semantic reasoning only; structural invariants are enforced exclusively by the
  deterministic tooling, never by the assistant's judgment.
- Never approves changes or slices, and never promotes a change into the baseline.
- Never invents product decisions: when information is missing it records an open question and
  stops rather than choosing an answer.
- Always preserves existing open questions; it may propose answers but never silently resolves or
  deletes them.
