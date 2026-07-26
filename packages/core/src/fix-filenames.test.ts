/**
 * The behaviour that matters most here — that a casing-only rename goes through a temporary name —
 * cannot be observed on a case-sensitive filesystem, and CI runs Linux. So the rename primitive is
 * injectable and the call sequence is asserted directly: that is the substitute for a
 * case-insensitive runner, not a convenience.
 */
import { describe, expect, it } from 'vitest';
import {
  applyFilenameFixes,
  fixTempSuffix,
  planFilenameFixes,
  recoverFilenameFixes,
  type RenameFs,
} from './fix-filenames.js';
import { artifact } from './test-support.js';

function recordingFs(existing: string[] = []) {
  const calls: [string, string][] = [];
  const present = new Set(existing.map((p) => p.split(/[\\/]/).join('/')));
  const fs: RenameFs = {
    rename: async (from, to) => {
      calls.push([from.split(/[\\/]/).join('/'), to.split(/[\\/]/).join('/')]);
    },
    stat: async (path) => {
      if (!present.has(path.split(/[\\/]/).join('/'))) throw new Error('ENOENT');
      return {};
    },
  };
  return { fs, calls };
}

describe('planFilenameFixes', () => {
  it('targets the lowercased ID and leaves aligned files alone', () => {
    const misnamed = artifact('UC-INIT-001', 'use-case', {}, { file: 'model/UC-Init-001.md' });
    const aligned = artifact('UC-OK-001', 'use-case', {}, { file: 'model/uc-ok-001.md' });
    const plan = planFilenameFixes([misnamed, aligned]);
    expect(plan.blocked).toEqual([]);
    expect(plan.fixes).toEqual([
      { from: 'model/UC-Init-001.md', to: 'model/uc-init-001.md', artifact: 'UC-INIT-001' },
    ]);
  });

  it('renames a file whose name is unrelated to its ID, keeping its directory', () => {
    const odd = artifact('ACT-A', 'actor', {}, { file: 'model/actors/renamed-by-hand.md' });
    expect(planFilenameFixes([odd]).fixes[0]).toMatchObject({
      to: 'model/actors/act-a.md',
    });
  });

  it('produces an empty plan for an already-aligned model (idempotence)', () => {
    const aligned = artifact('ACT-A', 'actor', {}, { file: 'model/actors/act-a.md' });
    expect(planFilenameFixes([aligned])).toEqual({ fixes: [], blocked: [] });
  });

  it('refuses both sides when two artifacts resolve to one target', () => {
    const one = artifact('ACT-A', 'actor', {}, { file: 'model/ACT-A.md' });
    const two = artifact('ACT-A', 'actor', {}, { file: 'model/Act-A.md' });
    const plan = planFilenameFixes([one, two]);
    expect(plan.fixes).toEqual([]);
    expect(plan.blocked.map((f) => f.blocked)).toEqual(['duplicate-target', 'duplicate-target']);
  });

  it('refuses a rename that would destroy another artifact', () => {
    // An occupant of a target name is necessarily misnamed itself (a file called act-a.md holding
    // ACT-B), so the plan holds both a block and an otherwise-safe fix. Resolving the two would
    // need ordering analysis; refusing is the conservative answer, and applying honours the veto.
    const misnamed = artifact('ACT-A', 'actor', {}, { file: 'model/WRONG.md' });
    const occupant = artifact('ACT-B', 'actor', {}, { file: 'model/act-a.md' });
    const plan = planFilenameFixes([misnamed, occupant]);
    expect(plan.blocked).toEqual([
      {
        from: 'model/WRONG.md',
        to: 'model/act-a.md',
        artifact: 'ACT-A',
        blocked: 'target-exists',
      },
    ]);
    expect(plan.fixes).toEqual([
      { from: 'model/act-a.md', to: 'model/act-b.md', artifact: 'ACT-B' },
    ]);
  });

  it('skips artifacts with no ID rather than guessing a name', () => {
    const idless = artifact('', 'actor', {}, { file: 'model/mystery.md', id: undefined });
    expect(planFilenameFixes([idless]).fixes).toEqual([]);
  });
});

describe('applyFilenameFixes', () => {
  it('renames through a temporary name derived from the target', async () => {
    const plan = planFilenameFixes([
      artifact('UC-INIT-001', 'use-case', {}, { file: 'model/UC-Init-001.md' }),
    ]);
    const { fs, calls } = recordingFs();
    const applied = await applyFilenameFixes('/repo', plan, fs);

    expect(applied).toEqual(['model/uc-init-001.md']);
    // Two steps, and the intermediate encodes the destination so a crash is recoverable.
    expect(calls).toEqual([
      ['/repo/model/UC-Init-001.md', `/repo/model/uc-init-001.md${fixTempSuffix}`],
      [`/repo/model/uc-init-001.md${fixTempSuffix}`, '/repo/model/uc-init-001.md'],
    ]);
  });

  it('does not stat the target for a casing-only rename', async () => {
    // On a case-insensitive filesystem the target "exists" — it is the source. Statting it and
    // refusing would make the command a no-op on exactly the platforms that need it.
    const plan = planFilenameFixes([
      artifact('ACT-ADMIN', 'actor', {}, { file: 'model/ACT-ADMIN.md' }),
    ]);
    const { fs, calls } = recordingFs(['/repo/model/act-admin.md']);
    await expect(applyFilenameFixes('/repo', plan, fs)).resolves.toEqual(['model/act-admin.md']);
    expect(calls).toHaveLength(2);
  });

  it('refuses when a non-artifact file occupies the target', async () => {
    // The planner only sees files that parsed; an unparseable .md at the target would otherwise be
    // silently replaced by rename.
    const plan = planFilenameFixes([
      artifact('ACT-A', 'actor', {}, { file: 'model/broken-name.md' }),
    ]);
    const { fs, calls } = recordingFs(['/repo/model/act-a.md']);
    await expect(applyFilenameFixes('/repo', plan, fs)).rejects.toThrow(/already exists/);
    expect(calls).toEqual([]);
  });

  it('refuses the whole plan when any entry is blocked', async () => {
    const plan = planFilenameFixes([
      artifact('ACT-A', 'actor', {}, { file: 'model/ACT-A.md' }),
      artifact('ACT-A', 'actor', {}, { file: 'model/Act-A.md' }),
      artifact('ACT-SAFE', 'actor', {}, { file: 'model/WRONG-SAFE.md' }),
    ]);
    const { fs, calls } = recordingFs();
    await expect(applyFilenameFixes('/repo', plan, fs)).rejects.toThrow(/need attention/);
    // All-or-nothing: partially renaming canonical files is worse than doing nothing.
    expect(calls).toEqual([]);
  });

  it('leaves the first rename recoverable when the second fails', async () => {
    const plan = planFilenameFixes([artifact('UC-A', 'use-case', {}, { file: 'model/UC-A.md' })]);
    let step = 0;
    const fs: RenameFs = {
      rename: async () => {
        step += 1;
        if (step === 2) throw new Error('simulated crash between the two steps');
      },
      stat: async () => ({}),
    };
    await expect(applyFilenameFixes('/repo', plan, fs)).rejects.toThrow(/simulated crash/);
    expect(step).toBe(2);
  });
});

describe('recoverFilenameFixes', () => {
  it('completes an interrupted rename when the destination is free', async () => {
    const { fs, calls } = recordingFs();
    const result = await recoverFilenameFixes('/repo', [`model/uc-a.md${fixTempSuffix}`], fs);
    expect(result.recovered).toEqual(['model/uc-a.md']);
    expect(result.blocked).toEqual([]);
    expect(calls).toEqual([[`/repo/model/uc-a.md${fixTempSuffix}`, '/repo/model/uc-a.md']]);
  });

  it('leaves a leftover for a human when the destination is already taken', async () => {
    const { fs, calls } = recordingFs(['/repo/model/uc-a.md']);
    const result = await recoverFilenameFixes('/repo', [`model/uc-a.md${fixTempSuffix}`], fs);
    expect(result.recovered).toEqual([]);
    expect(result.blocked[0]).toMatchObject({ blocked: 'stale-temp-file' });
    expect(calls).toEqual([]);
  });

  it('is a no-op with no leftovers', async () => {
    const { fs, calls } = recordingFs();
    expect(await recoverFilenameFixes('/repo', [], fs)).toEqual({ recovered: [], blocked: [] });
    expect(calls).toEqual([]);
  });
});
