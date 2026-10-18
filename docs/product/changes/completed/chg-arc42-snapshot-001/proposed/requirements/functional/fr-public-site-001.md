---
id: FR-PUBLIC-SITE-001
type: functional-requirement
title: Explain ProductShape and its process on the public site
status: draft
derived-from:
  - UC-PUBLIC-SITE-001
verification:
  - scenario: A reader can find an explanation of ProductShape, its process and its artifacts from the public site.
  - scenario: The site includes examples of Archify diagrams with accompanying explanations and does not claim that the diagrams are canonical sources.
  - scenario: The public site links to relevant engineering outputs only when those outputs are available.
---

## Requirement

The public site MUST explain ProductShape's purpose, process and artifacts. It MUST include examples of Archify diagrams with accompanying text that helps readers understand artifact relationships, identify the diagrams as explanatory views, and link to relevant engineering outputs only when those outputs are available.

## Rationale

The public site is the entry point for readers who need to understand ProductShape without first studying its repository. Visual explanations help make the process and relationships legible while source links preserve the distinction between explanation and canonical material.
