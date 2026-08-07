---
'@prodshape/core': minor
'@prodshape/cli': patch
---

Digest the bytes, never a decoded string, so ProductShape and pdac-lint cannot disagree (spec issue #32).

`spec/validation.md` defines a content digest as SHA-256 over the artifact's UTF-8 bytes with CRLF and CR normalized to LF. `contentDigest` was applied to a string that had already been decoded by `readFile(path, 'utf8')`, so every invalid UTF-8 sequence became U+FFFD and the digest covered bytes the file does not contain. pdac-lint hashed the bytes and was correct. The two implementations therefore produced different digests for the same file, with nothing detecting it: a citation could be reported `current` by one tool and `stale` by the other.

`contentDigestBytes(data: Buffer)` is now the only hash, and `contentDigest(content: string)` is defined in terms of it, so a string and its UTF-8 encoding cannot diverge. Every site that digests content from disk or from Git now passes the bytes: artifact loading, Product Change loading, `prodshape cite --file`, and the `PRODUCT027` baseline-drift check. `gitShowBytes` is added for that last one, because `gitShow` decodes as UTF-8 and is the same trap.

No digest changes for any valid UTF-8 file, so no existing citation, pin or baseline is affected. Both repositories now assert the same four known-answer vectors, including one invalid UTF-8 case and the lossy digest it must not produce, so a future divergence fails a test instead of passing silently.
