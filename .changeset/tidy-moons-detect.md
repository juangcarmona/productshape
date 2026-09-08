---
'@prodshape/distribution': minor
'@prodshape/cli': minor
---

`init` detects AI providers and offers them. UC-INIT-001 step 4 requires the AI provider choice to be made through options or, in an interactive terminal, prompts informed by the detection; initialization implemented that for SDD frameworks only and never asked about AI providers.

`detectAiProviders` inspects the repository for a marker directory per provider (`.claude`, `.github/prompts`, `.agents`, `.opencode`), executing no provider tooling, and `init` reports what it found before the SDD block. An explicit `--ai` flag still wins; an interactive run is asked and informed by the detection; `--dry-run` prompts nothing and decides nothing.

The `.agents` entry is named for the Agent Skills open standard rather than for one of its clients, because that path is read by OpenAI Codex, OpenCode, Gemini CLI, VS Code, Cursor and others. The `codex` provider id is unchanged.
