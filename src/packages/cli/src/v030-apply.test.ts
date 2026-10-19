import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, it } from 'vitest';
import { contentDigest, scaffoldChangeDocument } from '@prodshape/core';
import { runCli } from './program.js';

const roots: string[] = [];
afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});

it('publishes the same prospective JSON before real writes and dry-run, excluding the applying container and archives', async () => {
  const root = await mkdtemp(join(tmpdir(), 'prodshape-v030-report-'));
  roots.push(root);
  const active = join(root, 'docs/product/changes/active/chg-initial');
  const archived = join(root, 'docs/product/changes/completed/history');
  await mkdir(join(root, '.product'), { recursive: true });
  await mkdir(join(active, 'proposed'), { recursive: true });
  await mkdir(archived, { recursive: true });
  await writeFile(join(root, '.product/config.yaml'), 'version: v1alpha2\n');
  const actor =
    '---\nid: ACT-A\ntype: actor\ntitle: Author\nstatus: active\nactor-kind: human\n---\n\n## Purpose\n\nAuthor products.\n\n## Goals\n\nExplicit intent.\n\n## Responsibilities\n\nReview changes.\n\n## Boundaries\n\nProduct decisions.\n';
  const citation = `<!-- pdac:cite id="ACT-A" digest="${contentDigest(actor)}" -->`;
  await writeFile(join(active, 'proposed/act-a.md'), actor);
  const document = scaffoldChangeDocument('CHG-INITIAL', 'Initial model', '0000000')
    .replace('status: draft', 'status: approved')
    .replace('add: []', 'add: [ACT-A]');
  await writeFile(join(active, 'change.md'), document);
  await writeFile(join(active, 'notes.md'), citation);
  await writeFile(join(archived, 'notes.md'), citation);
  await writeFile(join(root, 'consumer.md'), citation);
  const target = join(root, 'docs/product/model/actors/act-a.md');
  const reports: Record<string, unknown>[] = [];
  const io = {
    cwd: root,
    err: () => {},
    out: (line: string) => {
      expect(existsSync(target)).toBe(false);
      reports.push(JSON.parse(line));
    },
  };
  expect(
    await runCli(['change', 'apply', 'CHG-INITIAL', '--dry-run', '--format', 'json'], io),
  ).toBe(0);
  expect(existsSync(target)).toBe(false);
  expect(await runCli(['change', 'apply', 'CHG-INITIAL', '--format', 'json'], io)).toBe(0);
  expect(reports[0]?.affectedCitations).toEqual(reports[1]?.affectedCitations);
  expect(reports[1]?.affectedCitations).toEqual([
    expect.objectContaining({ source: 'consumer.md', id: 'ACT-A', prospectiveStatus: 'current' }),
  ]);
  expect(await readFile(target, 'utf8')).toBe(actor);
  expect(existsSync(active)).toBe(false);
});
