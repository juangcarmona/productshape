# Make the Shorthand Opt-In and Document the Lockfile

## Why

Two small frictions from the first adoption outside this repository, both about generated files.

**The shorthand doubled the namespace for nothing.** `init --ai copilot` generated eight `product-*` prompts and eight `ps-*` prompts with identical content. For a single-assistant repository the aliases add no capability; they just make the prompt list twice as long.

**The lockfile's role was undocumented.** `.product/installation.lock.json` was committed here and mentioned in passing, but no document said whether an adopter should commit it or ignore it, what it records, or what breaks without it. The adoption gitignored it because it looked like generated state, and could not confirm from the docs whether that was right. It was not: two contributors with different lock states would have disagreed about which files the tool owns.

## What Changes

- Add `integrations.shorthand-commands`, default `false`, and generate the `ps:*` aliases only when it is set. A flag alone would not work: `integration update` re-renders from configuration, so the next update would silently undo the choice. `init --shorthand` writes the setting.
- Give existing configuration precedence over the flag unless `--force`, so `init --shorthand` in an already-configured repository cannot render aliases the preserved configuration does not declare.
- Delete files a provider no longer renders, guarded by digest. Without this, turning the setting off strands the aliases forever: `installProvider` replaces the provider's lock entry wholesale, so the paths drop out of the lock and stop being checked, and nothing removes them. A hand-edited file is left in place and reported rather than deleted.
- Document the lockfile: what it records, that it is committed, how digests are computed, that it is produced only by provider installation, what verifies it, and how to recover it.
- Correct three wrong claims in `docs/adoption/existing-repository.md`: that `init` creates `.product/generated/` and `.product/cache/`, that it adds two lines to `.gitignore`, and that `product.model` is relative to `product.root`. Two of them had been copied into the greenfield guide.

### Decisions

- **`init` will not write `.gitignore`.** That file is the adopter's, and appending to it invites merge conflicts — this guide's own authority table puts build configuration in the "never touched" row. The lines are surfaced in `init`'s next steps instead.
- **`install --frozen` is deferred.** `integration update --check` already provides the same guarantee for the only artifact that has one: every lock-listed path exists and matches its digest. Managed files are committed, so there is nothing to install in a fresh checkout, and a version mismatch is already reported by `doctor`.
- **This repository opts in.** It documents `/ps:*` publicly in its README and CHANGELOG. Opting in leaves the rendered paths and content identical, so no committed managed file or lock entry changes, and the new default is still exercised by every temporary-repository test.

## Capabilities

### Modified Capabilities

- `distribution`: the shorthand becomes configuration, and installation removes what it no longer owns.

## Impact

- `packages/core`: one configuration key. Note that unknown _nested_ keys are not rejected, so a misspelling is silently ignored; recorded as a follow-up rather than fixed here.
- Both integration packages gain a render options parameter, duplicated verbatim because ADR 0008 forbids a shared dependency.
- Renderer snapshots split into default and shorthand variants; the default takes the plain names.
