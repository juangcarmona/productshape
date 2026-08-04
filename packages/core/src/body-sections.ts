import { isMarkdownDocumentType, requiredBodySections } from './artifact.js';
import type { Diagnostic } from './diagnostics.js';
import { codes } from './diagnostics.js';

const headingPattern = /^##\s+(.+?)\s*$/gm;

/**
 * Check that a Markdown body contains the required `##` sections for its type,
 * in the specified order (https://github.com/product-definition-as-code/spec/blob/main/spec/artifacts.md).
 */
export function checkRequiredBodySections(
  kind: string,
  body: string,
  file: string,
  artifact?: string,
): Diagnostic[] {
  if (!isMarkdownDocumentType(kind)) return [];
  const required = requiredBodySections[kind];
  const found = [...body.matchAll(headingPattern)].map((m) => (m[1] ?? '').trim());

  const diagnostics: Diagnostic[] = [];
  let searchFrom = 0;
  for (const section of required) {
    const index = found.indexOf(section, searchFrom);
    if (index === -1) {
      const presentOutOfOrder = found.includes(section);
      diagnostics.push({
        severity: 'error',
        code: codes.missingBodySection,
        message: presentOutOfOrder
          ? `Required section '## ${section}' is out of order`
          : `Required section '## ${section}' is missing`,
        file,
        artifact,
        field: section,
      });
    } else {
      searchFrom = index + 1;
    }
  }
  return diagnostics;
}
