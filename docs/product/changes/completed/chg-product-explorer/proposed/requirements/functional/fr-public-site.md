---
id: FR-PUBLIC-SITE
type: functional-requirement
title: Explain ProductShape and its process on the public site
status: active
derived-from:
  - UC-PUBLIC-SITE
verification:
  - scenario: A reader can find an explanation of ProductShape, its process and its artifacts from the public site.
  - scenario: The site includes examples of Archify diagrams with accompanying explanations and does not claim that the diagrams are canonical sources.
  - scenario: The public site links to relevant engineering outputs only when those outputs are available.
  - scenario: From the public site, a reader can open a generated Product Explorer of an example product that works without network access and names the source revision it was generated from.
  - scenario: The example Product Explorer is regenerated from the example's authored model on every public-site build and does not depend on ProductShape's own product model.
---

## Requirement

The public site MUST explain ProductShape's purpose, process and artifacts. It MUST include examples of Archify diagrams with accompanying text that helps readers understand artifact relationships, identify the diagrams as explanatory views, and link to relevant engineering outputs only when those outputs are available.

The public site MUST also serve a generated Product Explorer of a small example product, so a reader can see what a product model looks like when explored as a graph. That Product Explorer MUST be generated from the example's authored model during the public-site build, MUST identify the source revision it came from, and MUST NOT be presented as ProductShape's own product model or as a canonical source.

## Rationale

The public site is the entry point for readers who need to understand ProductShape without first studying its repository. Visual explanations help make the process and relationships legible while source links preserve the distinction between explanation and canonical material. A real, explorable example shows the outcome of the method more directly than a description of it, and a small example product keeps that view readable without exposing ProductShape's own engineering model on the public site.
