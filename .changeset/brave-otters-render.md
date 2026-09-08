---
'@prodshape/integration-opencode': minor
'@prodshape/distribution': minor
'@prodshape/cli': minor
---

Add the OpenCode provider. `prodshape init --ai opencode` and `prodshape integration add opencode` render the canonical skills and commands where OpenCode looks for them: `.opencode/skills/<name>/SKILL.md` with `references/` inside, and flat `.opencode/commands/product-<name>.md`, since OpenCode has no subdirectory namespacing. `--shorthand` adds `ps-<name>.md` aliases.

Commands carry a synthesized `description` in their frontmatter, taken from the first prose line of the canonical asset, because the OpenCode TUI lists commands by that field and the canonical assets carry no frontmatter of their own.

OpenCode also reads `.agents/skills` and `.claude/skills`, so installing `opencode` alongside `codex` or `claude` renders the same skills twice; the providers differ on commands, which OpenCode reads only from `.opencode/commands`.

Authorized by the roadmap exception recorded on #98 before the work began.
