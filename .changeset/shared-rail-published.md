---
'@prodshape/core': minor
'@prodshape/integration-copilot': minor
---

Publish the core additions the adapters already import: `validateHostedProductChange` and `planHostedProductChange` (the shared hosted Product Change rail), the optional `recoveryRoot` a host can set on the repository, and the optional `changeDir` for a hosted `CHG-INITIAL` recovery container. The published `@prodshape/integration-speckit` and `@prodshape/integration-openspec` resolve against this core. `@prodshape/integration-copilot` ships the skill layout it already renders through the CLI: `.github/skills/<name>/SKILL.md` with the references inside the skill directory.
