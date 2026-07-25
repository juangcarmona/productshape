import type { LoadedArtifact } from './model.js';

/** Build an in-memory LoadedArtifact for graph/validation unit tests. */
export function artifact(
  id: string,
  type: string,
  frontmatter: Record<string, unknown> = {},
  overrides: Partial<LoadedArtifact> = {},
): LoadedArtifact {
  const file = overrides.file ?? `model/${id.toLowerCase()}.md`;
  return {
    file,
    absolutePath: `/repo/${file}`,
    frontmatter: { id, type, title: id, status: 'active', ...frontmatter },
    body: '',
    digest: 'sha256:'.padEnd(71, '0'),
    id,
    type,
    title: id,
    status: (frontmatter.status as string | undefined) ?? 'active',
    ...overrides,
  };
}
