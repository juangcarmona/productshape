# Adapting a role template

How to turn a template from `assets/role-skills/` into a role capability the project owns, and how to author one when no shipped reference matches the tooling.

This is about the capabilities `adopt` installs into the adopting repository. For authoring skills inside this plugin, follow the Agent Skills specification and review new or changed skills against a semantic checklist before shipping them.

## The contract is the fixed part

Adapt **how** the role is performed on this project's tooling. Never change **what** it guarantees to its callers. A capability calling `read-work-item` must get the same shape back whether the tracker is Jira, GitHub Issues or something else, because every lifecycle capability is written against the contract and not against the tool.

The template's `## Contract` section is therefore off limits. Everything below it is the implementation and is expected to change.

## Say when there was no reference

Where no shipped reference matches the tooling, author against the contract and **record in the configuration that the capability was authored rather than adapted**. A fabricated reference is worse than a missing one, because everything downstream trusts it.

## Rules every installed capability must satisfy

- **Do one thing.** If its one-line summary needs an "and", it is two capabilities. `read-work-item` reads, `update-work-item` writes, `transition-work-item` moves state. Splitting them is what lets a project swap one tracker for another a capability at a time.
- **Never tell the agent to run a slash command.** A capability may name another capability it depends on, but a command on any given harness invokes this same file, so a capability that calls a command calls itself.
- **Do not treat a harness directory as the source.** `.agents/skills/<role>/SKILL.md` is the source the project owns; anything under `.claude/skills/` or elsewhere is a copy.
- **Keep the team's answers out.** A project's own definitions live in its `docs/engineering-lifecycle.md`, never hardcoded in a capability.
- **Preserve the human gates.** Where the lifecycle says a person decides, the capability says so too and offers the agent no way around it.
- **No secrets and no credentials.** Confirm before any write to shared state: a work item, a pull request, a merge, a published page.

## Give every step a finish line

A step that does not say when it is done invites the agent to declare it done early. End each one with a condition that can be checked.

Weak: "Review the affected files."

Better: "*Done when:* every file the diff touches has been opened, and anything unexpected is named."

Prefer conditions that are exhaustive where exhaustiveness is the point. "Every required field was sent" is checkable; "the transition was configured" is not.

## Frontmatter of an installed capability

Installed capabilities are Agent Skills and must stay spec-legal, because a harness will silently skip an invalid one rather than complain.

| Field | Rule |
|---|---|
| `name` | Required. 1 to 64 chars, lowercase letters, digits and hyphens. Must match its directory name |
| `description` | Required, non-empty, at most 1024 chars |
| `compatibility` | Optional, at most 500 chars. Only where the capability has real environment requirements |
| `metadata` | Optional. A map of string keys to string values, nothing else |

Nothing else belongs there. A key one harness happens to accept is not portable, and the next may reject the whole file over it.

## Before finishing

1. Does every placeholder carry a value resolved from live tooling this session?
2. Would the description make an agent open this file rather than a different one?
3. Does any step lack a finish line?
4. Is any instruction one the agent would follow anyway? Delete it rather than rewording it.
5. Does it name a harness directory, a slash command, or a tool the lifecycle does not require?
