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
