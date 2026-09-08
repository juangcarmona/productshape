import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { aiProviderById, aiProviders, detectAiProviders } from '@prodshape/distribution';

/**
 * Detection is a passive filesystem inspection: a marker directory per provider, no provider
 * tooling executed. These tests pin the markers and the registry facts the installer routes on.
 */
describe('AI provider detection', () => {
  async function scratchWith(...markers: string[]): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), 'prodshape-ai-detect-'));
    for (const marker of markers) {
      await mkdir(join(dir, marker), { recursive: true });
    }
    return dir;
  }

  it('detects nothing in an empty repository', async () => {
    const dir = await scratchWith();
    try {
      expect(await detectAiProviders(dir)).toEqual([]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('detects each provider by its marker directory', async () => {
    for (const [marker, id] of [
      ['.claude', 'claude'],
      ['.github/prompts', 'copilot'],
      ['.agents', 'codex'],
      ['.opencode', 'opencode'],
    ] as const) {
      const dir = await scratchWith(marker);
      try {
        const detected = await detectAiProviders(dir);
        expect(detected.map((p) => p.id)).toEqual([id]);
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    }
  });

  it('reports every present provider', async () => {
    const dir = await scratchWith('.claude', '.github/prompts', '.agents', '.opencode');
    try {
      const detected = await detectAiProviders(dir);
      expect(detected.map((p) => p.id)).toEqual(['claude', 'copilot', 'codex', 'opencode']);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('detects nothing from .github alone, which nearly every repository has', async () => {
    const dir = await scratchWith('.github');
    try {
      expect(await detectAiProviders(dir)).toEqual([]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('names the .agents entry for the standard, not for one of its clients', () => {
    const codex = aiProviderById('codex');
    expect(codex?.name).toBe('Agent Skills');
    expect(codex?.notes).toContain('Agent Skills');
    expect(codex?.notes).toContain('OpenCode');
    expect(codex?.notes).not.toMatch(/^Codex\b/);
    expect(aiProviderById('bogus')).toBeUndefined();
    expect(aiProviders).toHaveLength(4);
  });
});
