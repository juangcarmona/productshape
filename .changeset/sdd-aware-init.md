---
'@prodshape/cli': minor
'@prodshape/distribution': minor
'@prodshape/integration-openspec': minor
---

SDD-aware initialization. `prodshape init` detects SDD frameworks present in the repository (OpenSpec via `openspec/`, Kiro via `.kiro/`, Spec Kit via `.specify/`) and reports them; `--sdd openspec` wires the OpenSpec integration in the same run, bootstrapping the workspace first (`openspec init --tools none`, through `npx -y @fission-ai/openspec@1` when the CLI is not installed) when none exists. Kiro and Spec Kit receive printed setup guidance because they install through their own tooling. In an interactive terminal a bare `init` asks, informed by the detection; with an explicit `--sdd` value, `--sdd none`, or no terminal it never prompts, and `--dry-run` describes the SDD actions without executing anything. `doctor` now points at `prodshape integration add openspec` when a workspace exists without the integration. The OpenSpec integration records the exact strings it injects into `openspec/config.yaml`, so a later update replaces outdated PDaC entries instead of accumulating duplicates, `detectOpenSpecVersion` consults the repository's `node_modules/.bin` so a devDependency install counts, and the CLI-not-found message names the real package (`@fission-ai/openspec`).
