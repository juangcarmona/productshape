import { describe, expect, it } from 'vitest';
import { opencodeRenderer, type CanonicalAssets } from '@prodshape/integration-opencode';

/**
 * OpenCode's TUI lists commands by their frontmatter `description`, and the canonical assets
 * carry none. These tests pin the synthesis: where the description comes from, how it is
 * escaped, that an asset with its own frontmatter is merged into rather than duplicated, and
 * that the managed header lands after the frontmatter rather than above it.
 */
describe('opencode command frontmatter', () => {
  function assetsWith(content: string): CanonicalAssets {
    return {
      version: '0.0.0-test',
      skills: [],
      commands: [{ name: 'change', content }],
      hooks: [],
    };
  }

  function render(content: string): string {
    const files = opencodeRenderer.render(assetsWith(content));
    return files.find((f) => f.path === '.opencode/commands/product-change.md')!.content;
  }

  it('takes the first non-empty prose line after the H1', () => {
    const rendered = render('# /product:change\n\nElaborate a Product Change.\n\n- A bullet.\n');
    expect(rendered.startsWith('---\ndescription: "Elaborate a Product Change."\n---\n')).toBe(
      true,
    );
  });

  it('puts the managed header after the frontmatter, never above it', () => {
    const rendered = render('# /product:change\n\nElaborate a Product Change.\n');
    const headerIndex = rendered.indexOf('MANAGED FILE');
    const frontmatterEnd = rendered.indexOf('\n---\n') + '\n---\n'.length;
    expect(headerIndex).toBeGreaterThan(frontmatterEnd);
  });

  it('escapes a summary that would otherwise break the YAML scalar', () => {
    const rendered = render('# /product:change\n\nUse "change": it is a \\ backslash.\n');
    expect(rendered).toContain('description: "Use \\"change\\": it is a \\\\ backslash."');
  });

  it('merges into an asset that already carries frontmatter, emitting one block', () => {
    const rendered = render('---\nagent: build\n---\n\n# /product:change\n\nElaborate it.\n');
    expect(rendered.match(/^---$/gm)).toHaveLength(2);
    expect(rendered).toContain('description: "Elaborate it."');
    expect(rendered).toContain('agent: build');
  });

  it('leaves a description the asset already declares alone', () => {
    const rendered = render('---\ndescription: Authored by hand\n---\n\n# /product:change\n\nX.\n');
    expect(rendered).toContain('description: Authored by hand');
    expect(rendered).not.toContain('description: "X."');
  });

  it('adds no frontmatter to a command with no prose to summarize', () => {
    const rendered = render('# /product:change\n');
    expect(rendered.startsWith('<!-- MANAGED FILE')).toBe(true);
  });
});
