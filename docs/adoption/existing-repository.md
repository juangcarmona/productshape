# Installing into an existing repository

This guide covers what Product Definition as Code physically adds to any existing repository, who owns each path, and how to configure it. For how to build the model itself, follow the [greenfield](greenfield.md) or [brownfield](brownfield.md) guide; if the repository already uses OpenSpec, also read [Adopting in an existing OpenSpec repository](existing-openspec-repository.md).

> These commands target the supported published baseline, [`@prodshape/cli@0.14.0`](https://www.npmjs.com/package/@prodshape/cli/v/0.14.0). They use `prodshape`; the `product-definition` alias is equivalent through v0.x. The layout and configuration below are a fixed contract and can also be created by hand. See [Limitations](../limitations.md).

## What init touches

```bash
prodshape init [--ai claude|copilot|codex] [--flat] [--shorthand] [--dry-run]
```

`init` adds exactly three areas and modifies nothing else:

```text
docs/product/                    # canonical product definition
├── model/                       # one directory per artifact kind (recommended, not required)
└── changes/{active,completed,rejected,superseded}/
.product/                        # tool home
├── config.yaml
├── installation.lock.json       # only with --ai; commit it
├── integrations/openspec.json   # only after integration add openspec; commit it
└── templates/
.claude/, .github/, .agents/     # optional, only with --ai: generated AI integrations
openspec/config.yaml             # after integration add openspec: PDaC guidance merged additively
```

Your source code, build configuration, CI and existing documentation are untouched. Your `.gitignore` is touched only if you ask for it, with `--gitignore` or by accepting the prompt, and then only by appending the rules below. `.product/generated/` and `.product/cache/` are not created by `init`; they appear when a command writes them.

OpenSpec can be wired in the same run with `prodshape init --sdd openspec`, or separately with `prodshape integration add openspec` after an OpenSpec workspace exists. The merge into `openspec/config.yaml` is additive and reversible with `prodshape integration remove openspec`.

SDD detection, interactive selection and `prodshape init --sdd openspec|kiro|speckit|none` are part of the supported published baseline.

`init` in a repository that already has these paths **preserves** every existing file and reports it as skipped; `--force` overwrites. The exception is generated integration files: if one exists that the installation lock does not own, `init` refuses the whole provider install rather than claiming a file that might be yours.

To see exactly what would happen before anything is written:

```bash
prodshape init --dry-run
```

It reports every path it would create, preserve, regenerate (a managed file it owns, rewritten identically) or overwrite, plus any conflict, and exits non-zero if there are conflicts — so it also works as a CI precheck. The counts it reports are the counts applying it produces.

`--flat` scaffolds the model directory without the per-kind subdirectories. The subdirectories are a recommendation: discovery walks the model directory recursively and keys on the frontmatter `type`, so no layout is enforced.

## Authority rules

Every path has exactly one owner. The full authority model is in the [specification](https://github.com/product-definition-as-code/spec/blob/main/spec/index.md#canonical-authority); the installation-level view:

| Path | Authority | Rules |
| --- | --- | --- |
| `docs/product/**` | Canonical | Authored by humans (AI may assist). The source of truth for product semantics. |
| `.product/config.yaml` | Canonical | Authored configuration; see below. |
| `.product/generated/**` | Generated | Compiled graph, indexes, diagrams. Regenerable from canonical files at any time; never hand-edit. |
| `.product/cache/**` | Disposable | Safe to delete. |
| `.claude/**`, `.github/**` managed files | Generated | Carry a managed-file header. Never hand-edit: `prodshape integration update` regenerates them, and `prodshape doctor` reports hand modification as `PRODUCT051`. |
| `openspec/config.yaml` | Yours, with a PDaC-managed block | The file stays yours; the OpenSpec integration merges its context and rules additively, replaces only what it injected, and `integration remove openspec` takes exactly that back out. |
| Your source code | Yours | Never touched by any `prodshape` command. |

Managed integration files are generated from canonical assets (skills, command definitions, hook descriptors) shipped with the toolkit. If a generated file is wrong, fix the canonical asset or open an issue — a hand edit will be flagged as drift and lost on the next `integration update`.

## Configuration

`.product/config.yaml` follows the PDaC configuration contract: a versioned kernel of `version`, `product-root`, `validation.warnings-as-errors` and `extensions`, with every ProductShape-specific setting under the `extensions.prodshape` namespace:

```yaml
version: v1alpha1
product-root: docs/product # the Product Definition root; model/ and changes/ live beneath it
validation:
  warnings-as-errors: false # make warnings fail the command (their reported severity stays warning)
extensions:
  prodshape:
    generated:
      root: .product/generated # where compiled outputs go
      commit: false # whether generated outputs are committed (see .gitignore below)
    integrations:
      ai: # AI providers with generated integrations
        - claude
      shorthand-commands: false # also generate the /ps:<name> aliases for /product:<name>
    citations:
      consumer-roots: # directories `citations verify` scans when no target is given
        - openspec
```

`product-root` is a repository-relative POSIX path; the layout fixes `model/` and `changes/` beneath it, so they are not configured separately.

An invalid configuration (malformed YAML, a missing or unsupported `version`, an unknown key outside `extensions`, a wrong value type, or a forbidden YAML feature such as anchors, aliases, tags or merge keys) is exactly one `PRODUCT050` and exit code `2`, reported before any other work; commands never fall back to defaults over an invalid file. Extension namespaces ProductShape does not own are ignored. Defaults match the values shown; a minimal config declaring only `version: v1alpha1` is valid.

`extensions.prodshape.citations.consumer-roots` names the directories `prodshape citations verify` scans when you do not pass a target. Where consumer documents live is your repository's decision: the default is `openspec`, and a repository that keeps its consumers under `specs/` sets that instead. A configured root that does not exist is an error rather than an empty result, so a misconfigured gate cannot report success for having verified nothing.

`extensions.prodshape.integrations.shorthand-commands` must be set in configuration rather than passed per command, because `integration update` re-renders from configuration; `init --shorthand` writes it for you. Turning it off removes the aliases the previous setting generated, provided they are unmodified — a hand-edited one is left in place and reported.

## The installation lock

`.product/installation.lock.json` records the SHA-256 digest of every managed integration file that `init` or `integration add` generated, per provider:

```json
{
  "schema": "product-definition-as-code/installation-lock/v1alpha1",
  "version": "0.1.0",
  "providers": { "claude": { "files": { ".claude/commands/product/change.md": "sha256:..." } } }
}
```

- **Commit it.** It is the record of which files the tool owns, and every integrity check depends on it. Without it, a hand-edited managed file is indistinguishable from a file you wrote, so `integration update` will refuse to touch it and `doctor` cannot report drift.
- Digests are computed over UTF-8 content with line endings normalized to LF, so the file is stable across platforms.
- `version` is the framework version whose managed-file headers are in the tracked files; `doctor` reports a mismatch against the installed CLI.
- It is written only by provider installation, so `init` with no `--ai` produces none — that is healthy, not broken, and `doctor` says so.
- Never edit it by hand. `integration update` rewrites it; `integration update --check` verifies it (`PRODUCT051` for a hand-edited file, `PRODUCT052` for a missing one) and is the right CI gate.
- If it is deleted, validation and graph compilation still work — they do not read it — but the tool no longer knows which files it owns. Recover with `integration add <provider> --force`.

## What to commit, and what to ignore

Only two things under `.product/` are regenerable. Everything else in it is how each clone verifies the installation, so it belongs in version control:

| Path |  |
| --- | --- |
| `.product/config.yaml` | **Commit.** Declares the roots, the integrations and the validation policy every clone and CI run reads. |
| `.product/installation.lock.json` | **Commit.** The record of which files the tool owns; every integrity check depends on it. |
| `.product/templates/` | **Commit.** Not covered by the lock, so nothing restores a deleted template except re-running `init`, and the AI skills author from them. |
| `.product/integrations/` | **Commit.** The record of an installed SDD integration, read by `integration update` and by citation verification. |
| `.product/generated/` | **Ignore.** Regenerable and never canonical. |
| `.product/cache/` | **Ignore.** Regenerable and never canonical. |

Managed files under `.claude/` and `.github/` are committed too: the integrations need them present, and `doctor` guards their integrity.

**Do not ignore `.product/` as a whole.** It is the tempting shortcut when the directory shows up untracked, and it takes the configuration and the lock out of history with it. Every other clone then has an installation `doctor` cannot verify and `integration update` refuses to reconcile.

### The ignore rules

`init` prints the rules it recommends and, when you ask it to, writes them:

```bash
prodshape init --gitignore
```

Run interactively without the option and it asks first. It only ever appends: existing content is preserved exactly, a rule you already have in an equivalent form is not repeated, and a second run adds nothing. Without the option and without a terminal, in CI or a script, it writes nothing. What it adds is:

```gitignore
.product/generated/
.product/cache/
```

The first line follows `generated.root`, so a repository that relocates its generated output gets the rule for where the output actually goes. If your workflow needs generated files in the repository (for example, rendering Mermaid diagrams on a docs site), set `generated.commit: true` and drop that line. Generated files remain non-canonical either way: tooling can always rebuild them and never requires them to exist.
