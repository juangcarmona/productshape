<!-- pdac-scope: cited -->

## Purpose

The public ProductShape site helps readers understand the product, its process and its artifacts, while connecting explanations to canonical sources and available engineering outputs.

## Requirements

### Requirement: The public site explains ProductShape and its process

The site MUST explain ProductShape's purpose, process and artifacts, distinguishing the product from the PDaC methodology.

<!-- pdac:cite id="CON-BRAND-001" digest="sha256:888e80751e04d389d5cee683c18fb47e1795a39dd8213454b16e09aa426be9cc" -->

#### Scenario: Reader learns what ProductShape is

- **WHEN** a public reader opens the site
- **THEN** they can find an explanation of ProductShape, its process and its artifacts, and can distinguish ProductShape from the Product Definition as Code methodology

### Requirement: Archify diagrams explain artifact relationships with their sources

The site MUST include Archify diagrams of process and artifact relationships. Diagrams MUST label conceptual explanations and derived facts, link source-backed facts, and convey meaning without color alone.

<!-- pdac:cite id="FR-PUBLIC-SITE-001" digest="sha256:3cb2c22372dc4696fedaf5ef88ed42158f828accc65a4fa45f46812ee5a1f20a" -->

#### Scenario: Source-backed diagram links to its source

- **WHEN** a reader inspects a diagram that represents canonical product artifacts or relationships
- **THEN** the diagram identifies that information as source-backed and provides a link to the relevant canonical source

#### Scenario: Conceptual diagram is not mistaken for canonical data

- **WHEN** a reader inspects a conceptual diagram or narrative
- **THEN** it is labelled as explanatory and does not imply that its illustrative relationships are canonical model data

#### Scenario: Meaning survives removal of colour

- **WHEN** the diagram is viewed without colour
- **THEN** its important distinctions and relationships remain understandable through labels, shape, line style or other non-colour cues

### Requirement: Public site links only to available engineering outputs

The site MUST link to Product, architecture or E2E outputs only when they are available in the engineering portal.

<!-- pdac:cite id="FR-ENGINEERING-PORTAL-001" digest="sha256:641a6d2ae3bbb10951584e3b2b648ba12b59c8aebab1f0e6787aed751f53b1c5" -->

#### Scenario: Link appears when its output exists

- **WHEN** a relevant engineering output is available in the portal
- **THEN** the public site can link the reader to that output

#### Scenario: No link implies a missing output exists

- **WHEN** a relevant engineering output has not been produced or published
- **THEN** the public site does not link to it as an available destination
