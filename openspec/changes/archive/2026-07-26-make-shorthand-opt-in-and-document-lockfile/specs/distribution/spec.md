# distribution — delta

## ADDED Requirements

### Requirement: The command shorthand is opt-in and configured, not implied

The canonical `/product:<name>` commands SHALL always be generated. The `/ps:<name>` shorthand
aliases SHALL be generated only when the repository configuration opts in, and the setting SHALL
default to off.

The setting SHALL live in the repository configuration rather than only in an initialization flag,
because regenerating the integrations reads configuration and would otherwise discard a choice made
at initialization time. An initialization flag MAY set it, and SHALL persist it into the generated
configuration.

Where a configuration file already exists and force is not set, the existing setting SHALL take
precedence over the flag, so that rendering never disagrees with the configuration on disk.

When aliases are generated, their content SHALL be identical to the canonical command they alias.

#### Scenario: Default installation has no aliases

- **WHEN** a repository is initialized without opting in
- **THEN** the canonical commands are generated and no alias is

#### Scenario: The choice survives regeneration

- **WHEN** a repository opts in and the integrations are later regenerated
- **THEN** the aliases are still generated

#### Scenario: Existing configuration wins over the flag

- **WHEN** initialization runs with the shorthand flag in a repository whose preserved configuration
  does not declare it, without force
- **THEN** no alias is generated, matching the configuration that remains on disk

### Requirement: Installation removes managed files it no longer generates

Installation SHALL delete a file that the installation lock records for a provider but that the
provider's render no longer produces — and only when its content still matches the digest the lock
records, proving the file is unmodified and owned. A file whose content has diverged SHALL be left in
place and reported instead.

Removed files SHALL be reported to the caller. Without this, a file dropped from the lock would remain
on disk unreferenced and unchecked forever, because drift detection reads the lock.

#### Scenario: Opting out removes the aliases it created

- **WHEN** a repository that generated aliases turns the setting off and regenerates
- **THEN** the aliases are deleted, their removal is reported, and drift detection is clean

#### Scenario: A hand-edited file is preserved

- **WHEN** a file that would be removed has been modified by hand
- **THEN** it is left in place rather than deleted
