/**
 * Shared fixture helpers for the OpenSpec product workflow suites: a greenfield repository
 * covering all ten artifact kinds, hosted-change writers for both containers, byte snapshots and
 * the price-floor scenario content. Not a test file.
 */
import { spawnSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { repoRoot } from '../helpers.js';

export const fixtureDir = join(repoRoot, 'tests', 'fixtures', 'openspec-product');

export function git(cwd: string, ...args: string[]): string {
  const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(' ')} failed: ${result.stderr}${result.stdout}`);
  }
  return result.stdout.trim();
}

export async function createRepo(): Promise<{ root: string; base: string }> {
  const root = await mkdtemp(join(tmpdir(), 'prodshape-openspec-product-'));
  await cp(fixtureDir, root, { recursive: true });
  git(root, 'init', '--initial-branch=main');
  git(root, 'config', 'user.email', 'fixture@example.com');
  git(root, 'config', 'user.name', 'Fixture');
  git(root, 'config', 'commit.gpgsign', 'false');
  git(root, 'add', '-A');
  git(root, 'commit', '-m', 'baseline');
  return { root, base: git(root, 'rev-parse', '--short', 'HEAD') };
}

export interface HostedChangeSpec {
  name: string;
  chgId: string;
  title: string;
  status: string;
  baseRevision: string;
  operations: { add: string[]; modify: string[]; remove: string[] };
  /** Relative path under product/proposed/ to file content. */
  proposed: Record<string, string>;
  openQuestions?: string;
}

export function changeMd(spec: HostedChangeSpec): string {
  const list = (ids: string[]): string =>
    ids.length === 0 ? ' []' : `\n${ids.map((id) => `    - ${id}`).join('\n')}`;
  return `---
id: ${spec.chgId}
type: product-change
title: ${spec.title}
status: ${spec.status}
base-revision: '${spec.baseRevision}'
operations:
  add:${list(spec.operations.add)}
  modify:${list(spec.operations.modify)}
  remove:${list(spec.operations.remove)}
---

## Problem

The accepted definition does not express the requested behaviour yet.

## Intended Product Outcome

The accepted definition expresses it after this change is applied.

## Rationale

Requested product intent for the fixture scenario.

## Affected Product Areas

Pricing rules in the sales context.

## Open Questions

${spec.openQuestions ?? 'None.'}

## Product Acceptance

The affected artifacts carry the intended wording and the model validates.

## Out of Scope

Delivery, technical design and implementation.
`;
}

export async function writeHostedChange(root: string, spec: HostedChangeSpec): Promise<void> {
  const dir = join(root, 'openspec', 'changes', spec.name);
  await mkdir(join(dir, 'product'), { recursive: true });
  await writeFile(join(dir, '.openspec.yaml'), 'schema: product\nskip_specs: true\n', 'utf8');
  await writeFile(
    join(dir, 'proposal.md'),
    `<!-- pdac-scope: none reason="library-rail fixture, no product text embedded" -->\n\n# ${spec.title}\n\nRequested intent for the fixture scenario.\n`,
    'utf8',
  );
  await writeFile(join(dir, 'product', 'change.md'), changeMd(spec), 'utf8');
  for (const [relative, content] of Object.entries(spec.proposed)) {
    const target = join(dir, 'product', 'proposed', ...relative.split('/'));
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, content, 'utf8');
  }
}

export async function writeNativeChange(root: string, spec: HostedChangeSpec): Promise<void> {
  const dir = join(root, 'docs', 'product', 'changes', 'active', spec.chgId.toLowerCase());
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, 'change.md'), changeMd(spec), 'utf8');
  for (const [relative, content] of Object.entries(spec.proposed)) {
    const target = join(dir, 'proposed', ...relative.split('/'));
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, content, 'utf8');
  }
}

export async function snapshotTree(root: string, subdir: string): Promise<Map<string, string>> {
  const base = join(root, ...subdir.split('/'));
  const entries = await readdir(base, { withFileTypes: true, recursive: true });
  const map = new Map<string, string>();
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    const absolute = join(entry.parentPath, entry.name);
    const relative = absolute.slice(base.length + 1).replaceAll('\\', '/');
    map.set(relative, await readFile(absolute, 'utf8'));
  }
  return map;
}

export async function approve(root: string, name: string): Promise<void> {
  const file = join(root, 'openspec', 'changes', name, 'product', 'change.md');
  const content = await readFile(file, 'utf8');
  await writeFile(file, content.replace('status: draft', 'status: approved'), 'utf8');
}

export const BR_PRICING_V2 = `---
id: BR-PRICING-001
type: business-rule
title: Discounts apply to the listed price and respect the price floor
status: active
applies-to:
  - UC-CHECKOUT-001
uses-terms:
  - TERM-CART
  - TERM-PRICE-FLOOR
---

## Rule

A discount MUST be computed against an item's listed price, applying several discounts to one item MUST never price it below zero, and a discounted price below the item's price floor MUST be rejected at checkout.

## Rationale

Discount arithmetic against already-discounted prices compounds unpredictably, and selling below the price floor loses money on every unit.

## Examples

- A 10 percent voucher on a 20 euro item prices it at 18 euro, even when a 5 euro promotion also applies.
- A discount pricing an item below its 4 euro price floor is rejected and the shopper keeps the floor price.

## Exceptions

None.
`;

export const TERM_PRICE_FLOOR = `---
id: TERM-PRICE-FLOOR
type: domain-term
title: Price floor
status: active
defined-in: BC-SALES
---

## Definition

The lowest price an item may be sold at, set per item by the business.

## Distinguish From

The listed price, which is where discount arithmetic starts; the floor is where it must stop.

## Usage

Checkout rejects a discounted price below the item's price floor.
`;

export const SB_PRICE_FLOOR_REJECTED = `---
id: SB-PRICE-FLOOR-REJECTED
type: structured-behaviour
title: A discount below the price floor is rejected at checkout
status: active
illustrates:
  - BR-PRICING-001
uses-terms:
  - TERM-PRICE-FLOOR
given:
  - A cart holds an item listed at 20 euro with a price floor of 15 euro
  - A promotion prices that item at 12 euro
when: The shopper checks out the cart
then:
  - The 12 euro price is rejected
  - The item is priced at 15 euro in the total
---

## Intent

Make the price floor observable at the moment it binds: a too-deep discount does not lower the total below the floor.

## Boundaries

This example does not fix how the shopper is told about the rejection.
`;

export const BR_PRICING_V3 = `---
id: BR-PRICING-001
type: business-rule
title: Discounts apply to the listed price and respect the per-item price floor
status: active
applies-to:
  - UC-CHECKOUT-001
uses-terms:
  - TERM-CART
  - TERM-PRICE-FLOOR
---

## Rule

A discount MUST be computed against an item's listed price, applying several discounts to one item MUST never price it below zero, and a discounted price below the item's price floor MUST be rejected at checkout with the floor price charged instead.

## Rationale

Discount arithmetic against already-discounted prices compounds unpredictably, and selling below the price floor loses money on every unit; charging the floor keeps the sale.

## Examples

- A discount pricing an item below its 4 euro price floor charges 4 euro.

## Exceptions

None.
`;

export function priceFloorSpec(
  base: string,
  overrides: Partial<HostedChangeSpec> = {},
): HostedChangeSpec {
  return {
    name: 'chg-price-floor',
    chgId: 'CHG-PRICE-FLOOR-001',
    title: 'Reject discounts below the price floor',
    status: 'draft',
    baseRevision: base,
    operations: {
      add: ['SB-PRICE-FLOOR-REJECTED', 'TERM-PRICE-FLOOR'],
      modify: ['BR-PRICING-001'],
      remove: [],
    },
    proposed: {
      'business-rules/br-pricing-001.md': BR_PRICING_V2,
      'domain/terms/term-price-floor.md': TERM_PRICE_FLOOR,
      'behaviours/sb-price-floor-rejected.md': SB_PRICE_FLOOR_REJECTED,
    },
    ...overrides,
  };
}
