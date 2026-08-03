---
id: ACT-REPOSITORY-MAINTAINER
type: actor
title: Repository Maintainer
status: active
actor-kind: human
---

## Purpose

The Repository Maintainer is accountable for the repository that hosts a product definition. They make the toolkit available, keep its configuration and integrations healthy, and act as the human gate through which changes enter the accepted product baseline.

## Goals

- A repository where the product definition structure, configuration and integrations work reliably for everyone who contributes.
- A baseline that only ever moves through validated, human-approved, explicitly promoted Product Changes.
- Confidence that nothing in the definition was overwritten, promoted or altered silently.

## Responsibilities

- Initialize Product Definition as Code in the repository and install the chosen AI and SDD integrations.
- Keep configuration current as the repository, team and integrations evolve.
- Review and approve Product Changes and Delivery Slices.
- Perform promotion: apply an implemented, verified change to the baseline as a deliberate act.

## Boundaries

- Does not author most product semantics day to day; drafting and evolving artifacts is primarily the Product Engineer's work.
- Does not bypass validation: a change or promotion that fails structural checks is not approved or executed regardless of urgency.
- Does not delegate approval or promotion decisions to automation or to an AI assistant.
