/**
 * The layout `init` scaffolds and the layout `change apply` writes into must be the same one.
 * Nothing linked them before: distribution hardcoded a directory list and core hardcoded a
 * type-to-subdirectory map, so a change to either would have silently split the two.
 */
import { describe, expect, it } from 'vitest';
import { modelSubdirByType, productArtifactTypes } from '@prodshape/core';
import { modelScaffoldDirs } from '@prodshape/distribution';

describe('recommended model layout', () => {
  it('scaffolds exactly the directories the model uses', () => {
    const modelDirs = productArtifactTypes.map(
      (type) => `docs/product/model/${modelSubdirByType[type]}`,
    );
    expect([...modelScaffoldDirs].sort()).toEqual([...new Set(modelDirs)].sort());
  });

  it('covers every artifact type', () => {
    for (const type of productArtifactTypes) {
      expect.soft(modelSubdirByType[type], type).toBeDefined();
    }
  });
});
