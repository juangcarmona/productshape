# structural-validation — delta

## MODIFIED Requirements

### Requirement: Model-quality warnings are reported without failing the run

Validation SHALL report the warnings PRODUCT101 (file-name misalignment), PRODUCT102 (active use
case in no journey, when enabled), PRODUCT103 (requirement unreachable from any actor, when
enabled), PRODUCT104 (active references deprecated), PRODUCT105 (business rule with no consumers),
PRODUCT106 (domain term with no usage) and PRODUCT107 (bounded context owning no terms), and SHALL
exit 0 when only warnings exist unless `validation.warnings-as-errors` is set. The
`validation.warnings-as-errors` escalation SHALL apply uniformly to every validating command —
baseline `validate`, `change validate`, handoff generation, graph generation and promotion — so a
repository that opts in cannot validate strictly at the baseline while promoting or handing off a
change that carries warnings.

#### Scenario: Warnings do not fail the build

- **WHEN** validation finds only warnings
- **THEN** the exit code is 0 and each warning carries its stable code

#### Scenario: Warnings escalated by configuration

- **WHEN** `.product/config.yaml` sets `validation.warnings-as-errors: true` and a warning exists
- **THEN** the exit code is 1

#### Scenario: Escalation applies beyond baseline validate

- **WHEN** `validation.warnings-as-errors: true` is set and a Product Change overlay carries a
  warning
- **THEN** `change validate` exits 1 and promotion refuses the change
