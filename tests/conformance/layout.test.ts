/**
 * The layout `init` scaffolds and the layout `change promote` writes into must be the same one.
 * Nothing linked them before: distribution hardcoded a directory list and core hardcoded a
 * type-to-subdirectory map, so a change to either would have silently split the two.
 */
import { describe, expect, it } from 'vitest';
import { modelSubdirByType, productArtifactTypes } from '@prodshape/core';
import { changeScaffoldDirs, modelScaffoldDirs } from '@prodshape/distribution';

describe('recommended model layout', () => {
  it('scaffolds exactly the directories promotion writes into', () => {
    const promotionDirs = productArtifactTypes.map(
      (type) => `docs/product/model/${modelSubdirByType[type]}`,
    );
    expect([...modelScaffoldDirs].sort()).toEqual([...new Set(promotionDirs)].sort());
  });

  it('covers every artifact type', () => {
    for (const type of productArtifactTypes) {
      expect.soft(modelSubdirByType[type], type).toBeDefined();
    }
  });

  it('scaffolds the three change lifecycle states', () => {
    expect(changeScaffoldDirs).toEqual([
      'docs/product/changes/active',
      'docs/product/changes/completed',
      'docs/product/changes/rejected',
    ]);
  });
});
