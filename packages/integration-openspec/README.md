# @prodshape/integration-openspec

OpenSpec integration for Product Definition as Code (PDaC), in two lanes: a citation lane that grounds OpenSpec's spec-driven delivery workflow in the accepted product model, and a product lane that hosts the PDaC product workflow inside OpenSpec itself.

Both lanes write only official OpenSpec surfaces (`openspec/config.yaml`, `openspec/schemas/product/`) plus ProductShape's own integration metadata (`.product/integrations/openspec.json`). The integration never patches OpenSpec-generated commands or skills, never modifies OpenSpec's built-in schemas, and never writes into a native spec-driven change's documents. Every write is byte-gated and ownership-proven per file: metadata paths are validated and confined to `openspec/schemas/product/`; `prodshape integration add openspec` collides on every pre-existing unrecorded target, even when byte-identical; `update` replaces or removes only content whose recorded digest still proves ownership, including obsolete assets; and `remove` deletes only recorded, proven-managed files while preserving and reporting unrecorded or hand-edited ones. With no recorded product schema it touches nothing under `openspec/schemas/`. Dry runs report exactly what the real operation would do.

## The citation lane (delivery)

The integration merges PDaC authority context and citation rules into `openspec/config.yaml` and installs a CI-ready verification example. Spec-driven OpenSpec documents cite canonical product artifacts by id and sha256 digest; `prodshape citations verify --provider openspec` resolves every citation against the model and enforces the scope-declaration population contract. A spec-driven delivery change never edits `docs/product/model`.

## The product lane (the hosted product workflow)

The integration installs a project-local OpenSpec schema named `product` at `openspec/schemas/product/`. An OpenSpec change created with that schema hosts a PDaC Product Change: the normative semantic delta (`product/change.md` plus `product/proposed/**`) against the accepted model in `docs/product/model`, which stays the only source of product truth.

The schema pin is a load-bearing, enforced invariant: the rail accepts only one folder-safe OpenSpec 1.11 change name and validates the complete OpenSpec 1.11 metadata shape in `.openspec.yaml`, not merely the presence of a schema string. It treats a change as a product change only when that valid metadata pins `schema: product`. A change pinned to another schema never lists, validates, applies or enters concurrency, however product-shaped its contents look. A product-shaped container with missing or malformed metadata stops listing and concurrency with a clear error instead of disappearing from the live-change set.

The primary workflow is OpenSpec's own:

```text
/opsx:new <change> --schema product
        |
/opsx:continue (or /opsx:ff)      authors proposal.md, then product/change.md + product/proposed/**
        |
/opsx:apply <change>              follows the schema's apply instruction
        |
/opsx:archive <change>            a separate action after successful apply and verification
```

Apply and archive are separate lifecycle operations. The schema's apply instruction delegates the deterministic write to this package's apply rail through the installed bridge script:

```text
node openspec/schemas/product/scripts/product-apply.mjs --change <name> [--dry-run]
```

The bridge resolves the locally installed `@prodshape/integration-openspec` and calls `applyOpenSpecProductChange`, which re-reads the accepted model and revalidates everything at apply time: the configuration, the baseline itself (including per-document load diagnostics of artifacts the change never touches) and the hosted delta as an overlay; a prior validate call is never trusted. Any blocking diagnostic refuses before any write, with the model and the change container byte-identical. It enforces base-revision drift (PRODUCT027) and the apply-authorised state (PRODUCT028, whose hosted message states the protocol requirement without pretending to verify the actor), writes the delta into the model named by lowercase id, reports the product diff computed from the result, and flips the hosted change.md status to applied in place. It never commits and never archives; `openspec archive` moves the change container afterwards and never touches the model. A preflight bridge exists beside it (`product-validate.mjs`) for explicit overlay validation at any point.

Validation is mandatory; authorisation policy is outside the deterministic rail. `status: approved` in the hosted change.md is the apply-authorised protocol state. ProductShape's accepted policy requires human product approval before that state is recorded; the integration verifies the state but cannot identify or judge the actor, and it never performs the transition. Merging the resulting baseline also remains a human decision.

### Requirements

- OpenSpec >= 1.7.0 for the product workflow (`skip_specs` change metadata, declaration-order artifacts, schema-agnostic skill instructions). The schema files install under any supported OpenSpec (>= 1.0.0) and are inert data below the floor: `prodshape doctor` then reports the product workflow UNAVAILABLE while the citation lane keeps working.
- `@prodshape/integration-openspec` installed locally (`npm install --save-dev @prodshape/integration-openspec`). The ProductShape CLI bundles this package for its own commands, so a CLI-only installation does not put it in `node_modules`; the bridge scripts need the package resolvable from the repository and say so when it is not. This documented installation is proven end to end by the packed-consumer suite, which installs the packed tarballs into a fresh repository and runs the bridge scripts by bare specifier with no override.
- `@prodshape/cli` available locally for the authoring capabilities the schema instructions name (`prodshape inspect`, `prodshape impact`, `prodshape template <kind>`, `prodshape validate`).

## Library API

The deterministic rails are exported for wrappers, tests and custom callers; the bridge scripts are thin argument parsers over them.

```ts
import {
  inspectProductModel, // accepted model + in-memory graph + diagnostics
  listOpenSpecProductChanges, // OpenSpec changes hosting product/change.md
  loadOpenSpecProductChange,
  validateOpenSpecProductChange, // overlay validation; concurrency spans both containers
  applyOpenSpecProductChange, // revalidates at apply time; fail closed; never archives
  deriveDeliveryContext, // fresh post-apply context for a future delivery workflow
} from '@prodshape/integration-openspec';
```

Concurrency (PRODUCT025) spans both change containers: a hosted OpenSpec product change and a native change under `docs/product/changes/active` touching the same artifact report against each other.

The citation-lane surface (`addOpenSpecIntegration`, `updateOpenSpecIntegration`, `checkOpenSpecIntegration`, `removeOpenSpecIntegration`, `bootstrapOpenSpecWorkspace`, the population provider) is unchanged and documented in the module source.
