import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

/** Repository-relative path of the ignore file, POSIX separators. */
export const gitignoreRelativePath = '.gitignore';

/**
 * The cache directory is fixed, unlike the generated root. Nothing reads a configured location for
 * it, so deriving its rule from configuration would promise a flexibility the product does not have.
 */
export const cacheIgnoreRule = '.product/cache/';

/** Written above the added rules, so a reader can tell what put them there and why they are safe. */
export const ignoreSectionHeading =
  '# Product Definition as Code: regenerable outputs, never canonical.';

// Reduce a pattern to the path it ignores, so an existing rule is recognised whatever equivalent
// form it was written in: anchored (/x), recursive (**/x), directory (x/) or contents (x/**).
// Deliberately conservative rather than a reimplementation of git's matcher: a wrong "already
// covered" verdict silently leaves generated files tracked, which is the failure this whole
// feature exists to prevent.
function ignoredPath(line: string): string | undefined {
  const rule = line.trim();
  // A comment ignores nothing, and a negation re-includes rather than ignores.
  if (rule === '' || rule.startsWith('#') || rule.startsWith('!')) return undefined;
  let path = rule;
  if (path.startsWith('**/')) path = path.slice(3);
  else if (path.startsWith('/')) path = path.slice(1);
  if (path.endsWith('/**')) path = path.slice(0, -3);
  if (path.endsWith('/')) path = path.slice(0, -1);
  return path === '' ? undefined : path;
}

/**
 * The rules an initialized repository needs, in the order they are written. The generated root is
 * whatever `generated.root` configures; the two collapse to one rule if a repository points the
 * generated root at the cache directory.
 */
export function requiredIgnoreRules(generatedRoot: string): string[] {
  const generated = ignoredPath(generatedRoot);
  const cache = ignoredPath(cacheIgnoreRule);
  const rules: string[] = [];
  if (generated !== undefined) rules.push(`${generated}/`);
  if (cache !== undefined && cache !== generated) rules.push(`${cache}/`);
  return rules;
}

/** The required rules an existing ignore file does not already cover, in write order. */
export function missingIgnoreRules(existing: string | undefined, generatedRoot: string): string[] {
  const covered = new Set(
    (existing ?? '')
      .split('\n')
      .map((line) => ignoredPath(line))
      .filter((path): path is string => path !== undefined),
  );
  return requiredIgnoreRules(generatedRoot).filter((rule) => {
    const path = ignoredPath(rule);
    return path !== undefined && !covered.has(path);
  });
}

/**
 * The complete contents the ignore file should have once the missing rules are added.
 *
 * Everything already present is preserved byte for byte: this only ever appends. That is what makes
 * writing to a file the user owns defensible at all, and why the result is returned whole rather
 * than applied as an edit, so the plan can carry exactly the bytes that will be written.
 */
export function mergeIgnoreRules(existing: string | undefined, missing: string[]): string {
  // Match the file's own line endings rather than imposing POSIX ones on a repository that has
  // been using CRLF: a whole-file ending change would show up as every line rewritten.
  const newline = existing?.includes('\r\n') ? '\r\n' : '\n';
  const block = `${[ignoreSectionHeading, ...missing].join(newline)}${newline}`;
  if (existing === undefined || existing === '') return block;
  const terminator = existing.endsWith('\n') ? '' : newline;
  return `${existing}${terminator}${newline}${block}`;
}

/** The ignore file's contents, or undefined when the repository has none. */
export async function readIgnoreFile(root: string): Promise<string | undefined> {
  try {
    return await readFile(join(root, gitignoreRelativePath), 'utf8');
  } catch {
    return undefined;
  }
}

/**
 * What is missing on disk. Callers need this before planning, because whether there is anything to
 * ask the user about decides whether they are asked at all.
 */
export async function missingIgnoreRulesIn(root: string, generatedRoot: string): Promise<string[]> {
  return missingIgnoreRules(await readIgnoreFile(root), generatedRoot);
}
