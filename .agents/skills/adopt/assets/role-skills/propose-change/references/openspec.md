# propose-change: OpenSpec

Where OpenSpec is present, `openspec init` generates its own skills and commands, version-matched to the installed CLI. **Adoption does not install the plan-artifact templates in that case**: it runs the init and lets the CLI own artifact generation. A vendored copy would drift from what the CLI produces and collide with it under the same names.

This reference records the wiring, not the CLI's behaviour. The lifecycle stages call this role by contract name; the configuration's **Provided roles** section records which OpenSpec-generated skill satisfies it here, with the name resolved from live tooling in the adoption session — never transcribed from memory.

**Delegation rules**

- The stage delegates artifact generation to that skill and never re-implements it. Gate logic (readiness, draft pull request, pickup) stays in the stage; artifact mechanics stay in OpenSpec.
- Seed the work-item identifier into the change's Why, and derive the change name from the item, so plan and item stay correlated.
- Loop `openspec status` → `openspec instructions` until the change is apply-ready, rather than hand-authoring artifacts the CLI scaffolds.
- Run `openspec validate` on the change before the pull request is raised: an invalid change discovered at review is a round trip a validation would have caught.

*Done when:* the change exists, validates, carries the work-item identifier, and the stage holds nothing but gate decisions.
