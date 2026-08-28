/**
 * RFC 6901 JSON Pointer helpers for schema-instance diagnostic locations.
 *
 * Where a diagnostic `field` is an instance path (`PRODUCT002`, parsed-configuration
 * `PRODUCT050`), the validation contract requires an RFC 6901 JSON Pointer: array indexes are
 * ordinary segments, a missing or additional property is identified as though it were present,
 * and the empty string is the pointer to the document root.
 */

/** Escape one reference token: `~` becomes `~0`, then `/` becomes `~1`. */
export function escapePointerToken(token: string): string {
  return token.replaceAll('~', '~0').replaceAll('/', '~1');
}

/** Append one reference token to a pointer. The root pointer is the empty string. */
export function appendPointerToken(pointer: string, token: string): string {
  return `${pointer}/${escapePointerToken(token)}`;
}

/**
 * Compare strings by Unicode code point, the order the configuration contract mandates for
 * choosing the first invalid instance path. Plain `<` compares UTF-16 code units, which disagrees
 * with code-point order for astral characters.
 */
export function compareCodePoints(left: string, right: string): number {
  const leftPoints = [...left];
  const rightPoints = [...right];
  const length = Math.min(leftPoints.length, rightPoints.length);
  for (let i = 0; i < length; i += 1) {
    const l = leftPoints[i]?.codePointAt(0) as number;
    const r = rightPoints[i]?.codePointAt(0) as number;
    if (l !== r) return l < r ? -1 : 1;
  }
  return leftPoints.length - rightPoints.length;
}
