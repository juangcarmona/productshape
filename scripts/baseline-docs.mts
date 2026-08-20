/**
 * The documents that must name the current published CLI baseline.
 *
 * One list, two consumers: `release-contract-smoke.mts` fails a release whose docs went stale,
 * and `bump-baseline-docs.mts` moves the pins during `pnpm run version` so they cannot. Sharing
 * the list is the point — a doc added to the contract is automatically added to the bump, and
 * the two can never drift apart silently (issue #115).
 */
export const baselineDocs = [
  'packages/cli/README.md',
  'docs/limitations.md',
  'docs/adoption/greenfield.md',
  'docs/adoption/brownfield.md',
  'docs/adoption/existing-repository.md',
  'docs/adoption/existing-openspec-repository.md',
] as const;
