import { describe, expect, it } from 'vitest';
import { contentDigest, normalizeToLf } from './digest.js';

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
    expect(contentDigest('a\r\n')).toBe(
      'sha256:87428fc522803d31065e7bce3cf03fe475096631e5e07bbd7a0fde60c4cf25c7',
    );
  });
});
