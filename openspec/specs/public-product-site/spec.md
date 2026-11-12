<!-- pdac-scope: cited -->

## Purpose

The public ProductShape site helps readers understand the product, its process and its artifacts, while connecting explanations to canonical sources and available engineering outputs.

## Requirements

### Requirement: The public site explains ProductShape and its process

The site MUST explain ProductShape's purpose, process and artifacts, distinguishing the product from the PDaC methodology.

<!-- pdac:cite id="CON-BRAND" digest="sha256:0479c42858b67632f3e7956466e74b3c20123f3922a42355b33595158d781c5f" -->

#### Scenario: Reader learns what ProductShape is

- **WHEN** a public reader opens the site
- **THEN** they can find an explanation of ProductShape, its process and its artifacts, and can distinguish ProductShape from the Product Definition as Code methodology

### Requirement: Archify diagrams explain artifact relationships with their sources

The site MUST include Archify diagrams of process and artifact relationships. Diagrams MUST label conceptual explanations and derived facts, link source-backed facts, and convey meaning without color alone.

<!-- pdac:cite id="FR-PUBLIC-SITE" digest="sha256:71186b031008e9279b039906bc4ccca648df31e2fd9fa5d22da3a0005e90925e" -->

#### Scenario: Source-backed diagram links to its source

- **WHEN** a reader inspects a diagram that represents canonical product artifacts or relationships
- **THEN** the diagram identifies that information as source-backed and provides a link to the relevant canonical source

#### Scenario: Conceptual diagram is not mistaken for canonical data

- **WHEN** a reader inspects a conceptual diagram or narrative
- **THEN** it is labelled as explanatory and does not imply that its illustrative relationships are canonical model data

#### Scenario: Meaning survives removal of colour

- **WHEN** the diagram is viewed without colour
- **THEN** its important distinctions and relationships remain understandable through labels, shape, line style or other non-colour cues

### Requirement: Public site serves a generated example Product Snapshot

The public site MUST serve a Product Snapshot generated from the authored example model in `examples/shop/` during the public-site build. The page MUST work without network access, name the source revision it was generated from, and MUST NOT present the example as ProductShape's own model. The public build MUST NOT need ProductShape's own product model to produce it.

<!-- pdac:cite id="FR-PUBLIC-SITE" digest="sha256:71186b031008e9279b039906bc4ccca648df31e2fd9fa5d22da3a0005e90925e" -->

#### Scenario: Reader opens the example from the home page

- **WHEN** a reader follows the example link on the public home page
- **THEN** a standalone Product Snapshot of the example product opens on the public site and loads without any network request outside it

#### Scenario: Example is regenerated on every build

- **WHEN** the public site is built from a clean checkout without a generated engineering Snapshot
- **THEN** the build generates the example Snapshot from `examples/shop/` and the output names the source revision it came from

### Requirement: Public site links only to available engineering outputs

The site MUST link to Product, architecture or E2E outputs only when they are available in the engineering portal.

<!-- pdac:cite id="FR-ENGINEERING-PORTAL" digest="sha256:f32c683fd04766f8987f17efbce625468e6181549ec83216192b6bcc3e0063b8" -->

#### Scenario: Link appears when its output exists

- **WHEN** a relevant engineering output is available in the portal
- **THEN** the public site can link the reader to that output

#### Scenario: No link implies a missing output exists

- **WHEN** a relevant engineering output has not been produced or published
- **THEN** the public site does not link to it as an available destination
