import { createHash } from 'node:crypto';

/**
 * Normalize CRLF and lone CR to LF. Digests must be identical across operating
 * systems and Git line-ending configurations (docs/specification/validation.md).
 */
export function normalizeToLf(content: string): string {
  return content.replace(/\r\n?/g, '\n');
}

/** SHA-256 over LF-normalized UTF-8 content, rendered as `sha256:<lowercase hex>`. */
export function contentDigest(content: string): string {
  const hash = createHash('sha256').update(normalizeToLf(content), 'utf8').digest('hex');
  return `sha256:${hash}`;
}
