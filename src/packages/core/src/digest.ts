import { createHash } from 'node:crypto';

/**
 * Normalize CRLF and lone CR to LF. Digests must be identical across operating
 * systems and Git line-ending configurations (docs/specification/validation.md).
 */
export function normalizeToLf(content: string): string {
  return content.replace(/\r\n?/g, '\n');
}

/**
 * SHA-256 over the LF-normalized bytes, rendered as `sha256:<lowercase hex>`.
 *
 * This is the only hash in the implementation; `contentDigest` is defined in terms of it, so a
 * string and its UTF-8 encoding cannot produce different digests.
 *
 * `latin1` round-trips arbitrary bytes one to one, so the line-ending normalization runs without
 * decoding the content as text. Decoding first replaces every invalid UTF-8 sequence with U+FFFD
 * and then hashes bytes the file does not contain, which is how this diverged from pdac-lint
 * (spec issue #32). Prefer this function wherever the original bytes are still available.
 */
export function contentDigestBytes(data: Buffer): string {
  const normalized = Buffer.from(normalizeToLf(data.toString('latin1')), 'latin1');
  return `sha256:${createHash('sha256').update(normalized).digest('hex')}`;
}

/**
 * SHA-256 over LF-normalized UTF-8 content, rendered as `sha256:<lowercase hex>`.
 *
 * For content that came from a file or from Git, use `contentDigestBytes` on the bytes instead:
 * by the time the content is a string, an invalid UTF-8 sequence has already been lost.
 */
export function contentDigest(content: string): string {
  return contentDigestBytes(Buffer.from(content, 'utf8'));
}
