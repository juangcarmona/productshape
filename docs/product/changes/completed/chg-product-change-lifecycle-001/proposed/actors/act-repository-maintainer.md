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
- A baseline that only changes through validated, human-approved Product Changes whose applied result is reviewed and merged.
- Confidence that nothing in the definition was applied, accepted or altered silently.

## Responsibilities

- Initialize Product Definition as Code in the repository and install the chosen AI and SDD integrations.
- Keep configuration current as the repository, team and integrations evolve.
- Review Product Changes for product approval and review applied results for acceptance into the baseline.
- Run or explicitly authorize apply after product approval, without making delivery evidence a precondition.

## Boundaries

- Does not author most product semantics day to day; drafting and evolving artifacts is primarily the Product Engineer's work.
- Does not bypass validation: a change or applied result that fails structural checks is not approved or merged regardless of urgency.
- Does not delegate product approval or merge acceptance to automation or to an AI assistant.
- Does not treat an accepted definition as evidence that the product has been implemented, verified, released or deployed.
