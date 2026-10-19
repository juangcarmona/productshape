import matter from 'gray-matter';
import type { ParsedArtifact } from './artifact.js';
import type { Diagnostic } from './diagnostics.js';
import { codes } from './diagnostics.js';

export interface ParseResult {
  artifact?: ParsedArtifact;
  diagnostics: Diagnostic[];
}

/**
 * Parse a Markdown artifact document into YAML frontmatter and body.
 * Malformed input yields a PRODUCT001 diagnostic instead of throwing.
 */
export function parseArtifactDocument(content: string, file: string): ParseResult {
  let parsed: matter.GrayMatterFile<string>;
  try {
    parsed = matter(content);
  } catch (error) {
    return {
      diagnostics: [
        {
          severity: 'error',
          code: codes.invalidFrontmatter,
          message: `Invalid YAML frontmatter: ${error instanceof Error ? error.message : String(error)}`,
          file,
        },
      ],
    };
  }

  const frontmatter = parsed.data as Record<string, unknown>;
  if (Object.keys(frontmatter).length === 0) {
    return {
      diagnostics: [
        {
          severity: 'error',
          code: codes.invalidFrontmatter,
          message: 'Missing or empty YAML frontmatter',
          file,
        },
      ],
    };
  }

  return {
    artifact: { file, frontmatter, body: parsed.content },
    diagnostics: [],
  };
}
