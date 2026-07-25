# Installing into an existing repository

This guide covers what Product Definition as Code physically adds to any existing repository, who
owns each path, and how to configure it. For how to build the model itself, follow the
[greenfield](greenfield.md) or [brownfield](brownfield.md) guide; if the repository already uses
OpenSpec, also read [Adopting in an existing OpenSpec repository](existing-openspec-repository.md).

> The CLI ships as [`@prodshape/cli`](https://www.npmjs.com/package/@prodshape/cli); the
> `product-definition` commands below run through the installed v0.x alias (identical to
> `prodshape`). The layout and configuration below are the fixed v0.1 contract and can also be
> created by hand. See [Limitations of v0.1](../limitations-v0.1.md).

## What init touches

```bash
product-definition init [--ai claude|copilot] [--sdd openspec]
```

`init` adds exactly three areas and modifies nothing else:

```text
docs/product/                    # canonical product definition
├── model/
└── changes/{active,completed,rejected}/
.product/                        # tool home
├── config.yaml
├── installation.lock.json
├── generated/
└── cache/
.claude/ and/or .github/         # optional, only with --ai: generated AI integrations
```

Your source code, build configuration, CI and existing documentation are untouched. `init` in a
repository that already has these paths fails rather than overwriting.

## Authority rules

Every path has exactly one owner. The full authority model is in the
[specification](../specification/index.md#canonical-authority); the installation-level view:

| Path                                     | Authority  | Rules                                                                                                                                                                              |
| ---------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/product/**`                        | Canonical  | Authored by humans (AI may assist). The source of truth for product semantics.                                                                                                     |
| `.product/config.yaml`                   | Canonical  | Authored configuration; see below.                                                                                                                                                 |
| `.product/generated/**`                  | Generated  | Compiled graph, indexes, diagrams. Regenerable from canonical files at any time; never hand-edit.                                                                                  |
| `.product/cache/**`                      | Disposable | Safe to delete.                                                                                                                                                                    |
| `.claude/**`, `.github/**` managed files | Generated  | Carry a managed-file header. Never hand-edit: `product-definition integration update` regenerates them, and `product-definition doctor` reports hand modification as `PRODUCT051`. |
| Your source code                         | Yours      | Never touched by any `product-definition` command.                                                                                                                                 |

Managed integration files are generated from canonical assets (skills, command definitions, hook
descriptors) shipped with the toolkit. If a generated file is wrong, fix the canonical asset or
open an issue — a hand edit will be flagged as drift and lost on the next `integration update`.

## Configuration

`.product/config.yaml` is the repository's configuration. This is the v0.1 shape
(schema `product-definition-as-code/config/v1alpha1`); later versions may extend it under a new
schema identifier:

```yaml
schema: product-definition-as-code/config/v1alpha1
product:
  root: docs/product # product root; model and changes are relative to it
  model: model
  changes: changes
generated:
  root: .product/generated # where compiled outputs go
  commit: false # whether generated outputs are committed (see .gitignore below)
integrations:
  ai: # AI providers with generated integrations
    - claude
  sdd:
    provider: openspec # SDD adapter; openspec is the only v0.1 provider
validation:
  warnings-as-errors: false # escalate validation warnings to errors for this repository
```

Unknown top-level keys are a configuration error (`PRODUCT050`). Defaults match the values shown;
a minimal config declaring only `schema` is valid.

## .gitignore guidance

`.product/generated/` is ignored by default — generated outputs are reproducible from canonical
files, and committing them invites merge noise and drift. `init` adds:

```gitignore
.product/generated/
.product/cache/
```

If your workflow needs generated outputs in the repository (for example, rendering Mermaid
diagrams on a docs site), set `generated.commit: true` and remove the `generated/` ignore line.
Generated files remain non-canonical either way: tooling can always rebuild them and never
requires them to exist. Managed files under `.claude/` and `.github/` are committed — they must be
present for the integrations to work — and `doctor` guards their integrity.
