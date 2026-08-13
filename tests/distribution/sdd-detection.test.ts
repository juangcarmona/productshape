import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { detectSddFrameworks, sddFrameworkById, sddFrameworks } from '@prodshape/distribution';

/**
 * Detection is a passive filesystem inspection: a marker directory per framework, no framework
 * tooling executed. These tests pin the markers and the registry facts the installer routes on.
 */
describe('SDD framework detection', () => {
  async function scratchWith(...markers: string[]): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), 'prodshape-sdd-detect-'));
    for (const marker of markers) {
      await mkdir(join(dir, marker), { recursive: true });
    }
    return dir;
  }

  it('detects nothing in an empty repository', async () => {
    const dir = await scratchWith();
    try {
      expect(await detectSddFrameworks(dir)).toEqual([]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('detects each framework by its marker directory', async () => {
    for (const [marker, id] of [
      ['openspec', 'openspec'],
      ['.kiro', 'kiro'],
      ['.specify', 'speckit'],
    ] as const) {
      const dir = await scratchWith(marker);
      try {
        const detected = await detectSddFrameworks(dir);
        expect(detected.map((f) => f.id)).toEqual([id]);
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    }
  });

  it('reports every present framework', async () => {
    const dir = await scratchWith('openspec', '.kiro', '.specify');
    try {
      const detected = await detectSddFrameworks(dir);
      expect(detected.map((f) => f.id)).toEqual(['openspec', 'kiro', 'speckit']);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('only OpenSpec is installable; the others carry setup guidance', () => {
    expect(sddFrameworkById('openspec')?.installable).toBe(true);
    for (const id of ['kiro', 'speckit']) {
      const framework = sddFrameworkById(id);
      expect(framework?.installable, id).toBe(false);
      expect(framework?.guidance.length, id).toBeGreaterThan(0);
    }
    expect(sddFrameworkById('bogus')).toBeUndefined();
    expect(sddFrameworks).toHaveLength(3);
  });
});
