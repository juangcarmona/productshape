import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { contentDigest, contentDigestBytes, normalizeToLf } from './digest.js';

/**
 * Cross-implementation known-answer vectors for the digest defined in
 * `spec/validation.md` ("Digests"): SHA-256 over the UTF-8 bytes with CRLF and CR
 * normalized to LF.
 *
 * pdac-lint asserts these same numbers in `tests/digests.test.ts`. They exist because the two
 * implementations silently disagreed on invalid UTF-8 (spec issue #32): this one decoded the file
 * as UTF-8 before hashing, so an invalid sequence became U+FFFD and it hashed bytes the file did
 * not contain. Any change here that is not mirrored there re-opens that divergence, so treat a
 * failure as a specification question, not a number to update.
 */
const vectors = {
  /** "a" + LF, reached from CRLF by normalization. */
  aLf: 'sha256:87428fc522803d31065e7bce3cf03fe475096631e5e07bbd7a0fde60c4cf25c7',
  /** The bytes 61 80 0A: "a", a lone continuation byte, LF. Not valid UTF-8. */
  invalidUtf8: 'sha256:5182543278186d35b3b98e0db7b6f953d8ab827e006ef369dddcf80df106b463',
  /** The bytes 61 EF BF BD 0A: what decoding 61 80 0A as UTF-8 and re-encoding produces. */
  invalidUtf8Lossy: 'sha256:ac8d6e1e901dac0630c12b995618b09b5711fe14ca07c2cd6dc97e0bb4f92616',
  /** The bytes C3 A9 0A: "é" + LF, valid multi-byte UTF-8. */
  eAcute: 'sha256:edd3a863872a04239eb29ad4bc12fc892b3d4ae57cc7e786a3697816f8e141c2',
} as const;

describe('normalizeToLf', () => {
  it('converts CRLF and lone CR to LF', () => {
    expect(normalizeToLf('a\r\nb\rc\n')).toBe('a\nb\nc\n');
  });
});

describe('contentDigest', () => {
  it('is identical across line-ending conventions', () => {
    expect(contentDigest('a\r\nb\r\n')).toBe(contentDigest('a\nb\n'));
    expect(contentDigest('a\rb\r')).toBe(contentDigest('a\nb\n'));
  });

  it('renders as sha256:<lowercase hex>', () => {
    expect(contentDigest('x')).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  it('is stable for known content', () => {
    // sha256 of the two bytes "a\n"
    expect(contentDigest('a\r\n')).toBe(vectors.aLf);
  });

  it('agrees with the byte path for valid UTF-8', () => {
    expect(contentDigest('é\n')).toBe(vectors.eAcute);
    expect(contentDigest('é\n')).toBe(contentDigestBytes(Buffer.from('é\n', 'utf8')));
  });
});

describe('contentDigestBytes', () => {
  const invalid = Buffer.from([0x61, 0x80, 0x0a]);

  it('normalizes line endings without decoding as text', () => {
    expect(contentDigestBytes(Buffer.from([0x61, 0x0d, 0x0a]))).toBe(vectors.aLf);
    expect(contentDigestBytes(Buffer.from([0x61, 0x0d]))).toBe(vectors.aLf);
  });

  it('hashes the bytes an invalid UTF-8 file actually contains', () => {
    expect(contentDigestBytes(invalid)).toBe(vectors.invalidUtf8);
  });

  it('does not hash the U+FFFD replacement a UTF-8 decode would introduce', () => {
    // This is the divergence spec issue #32 records. Decoding first produces 61 EF BF BD 0A,
    // a digest of content that is in no file, and every citation to that artifact would be
    // reported against it. The two digests must stay distinguishable.
    expect(contentDigest(invalid.toString('utf8'))).toBe(vectors.invalidUtf8Lossy);
    expect(contentDigestBytes(invalid)).not.toBe(vectors.invalidUtf8Lossy);
  });

  it('round-trips every byte value, so no input is silently altered', () => {
    // 0x0d is excluded: it is line-ending input, and normalization is meant to change it.
    const all = Buffer.from(Array.from({ length: 256 }, (_, i) => i).filter((b) => b !== 0x0d));
    expect(contentDigestBytes(all)).toBe(
      `sha256:${createHash('sha256').update(all).digest('hex')}`,
    );
  });
});
