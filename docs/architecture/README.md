---
title: ProductShape Architecture
description: Navigation for the twelve arc42 views of the ProductShape reference implementation.
---

# ProductShape Architecture

This is the implementation architecture of the ProductShape reference implementation. Product intent belongs to [`docs/product/model`](../product/model/README.md); normative Product Definition as Code contracts belong to the [specification repository](https://github.com/product-definition-as-code/spec).

The twelve arc42 views below describe how the toolkit realizes that intent. The self-contained [public architecture site](https://juangcarmona.github.io/productshape/en/engineering/) is generated from these Markdown sources.

| Section | View | Purpose |
| --- | --- | --- |
| [01](01-introduction-and-goals.md) | Introduction and Goals | System scope, drivers, and architecture readers |
| [02](02-constraints.md) | Architecture Constraints | Constraints and their structural consequences |
| [03](03-context-and-scope.md) | Context and Scope | Users, external systems, and exchanged information |
| [04](04-solution-strategy.md) | Solution Strategy | Fundamental architectural approaches |
| [05](05-building-block-view.md) | Building Block View | Static decomposition and dependencies |
| [06](06-runtime-view.md) | Runtime View | Representative workflows and interactions |
| [07](07-deployment-view.md) | Deployment View | Distribution and hosted documentation |
| [08](08-crosscutting-concepts.md) | Crosscutting Concepts | Shared mechanisms across packages |
| [09](09-architecture-decisions.md) | Architecture Decisions | Index of architectural decision records |
| [10](10-quality-requirements.md) | Quality Requirements | Product quality intent, architectural response, evidence |
| [11](11-risks-and-technical-debt.md) | Risks and Technical Debt | Current architecture risks and mitigations |
| [12](12-glossary.md) | Glossary | Technical terms used by these views |

Significant decisions are recorded in [`decisions/`](decisions/). Product requirements remain in the product model; this architecture documentation explains their implementation where relevant.
