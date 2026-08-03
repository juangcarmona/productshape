import { contentDigest, emitCitation, type CiteOptions } from '@prodshape/core';
import { exitCodes, type CliIo } from '../context.js';

export interface CiteCommandOptions {
  id: string;
  digest?: string;
  anchor?: string;
  form: 'inline' | 'marker-block' | 'sidecar-ledger';
  file?: string;
}

/**
 * `prodshape cite` — emit a citation record in the requested form.
 *
 * The citation record carries the target artifact `id`, a content `digest`, and an optional
 * scenario `anchor`. When `--file` is given, the digest is computed from that file; otherwise
 * `--digest` must be supplied.
 */
export async function runCite(io: CliIo, options: CiteCommandOptions): Promise<number> {
  let digest = options.digest;

  if (!digest) {
    if (!options.file) {
      io.err('error: either --digest or --file must be provided');
      return exitCodes.invalidInvocation;
    }
    const { readFile } = await import('node:fs/promises');
    const content = await readFile(options.file, 'utf8');
    digest = contentDigest(content);
  }

  const citeOptions: CiteOptions = {
    id: options.id,
    digest,
    anchor: options.anchor,
    form: options.form,
  };

  io.out(emitCitation(citeOptions));
  return exitCodes.success;
}
