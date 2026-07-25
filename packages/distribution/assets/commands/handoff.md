# /product:handoff

Prepare an approved delivery slice for the configured SDD workflow.

Use the `prepare-sdd-handoff` skill.

- Verify the slice is approved and `product-definition change validate <CHG-ID>` is clean.
- Generate with `product-definition handoff create --change <CHG> --slice <SLI>
--work-item <provider:owner/repo#id> --adapter openspec --sdd-change <name>` (or `--out <dir>`).
- Verify with `product-definition handoff status <path>`; report the change's open questions to
  the SDD side.
- Stop if the handoff is structurally invalid. Never edit generated files by hand.
