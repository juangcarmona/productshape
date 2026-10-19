import { cp, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import mdx from '@astrojs/mdx';
import { defineConfig } from 'astro/config';

const legacyOutput = process.env.LEGACY_SITE_DIR;
const configuredOutput = process.env.SITE_OUT_DIR;

async function copyStaticOutput(source, destination) {
  if (!source) return;
  for (const entry of await readdir(source, { withFileTypes: true })) {
    const from = join(source, entry.name);
    const to = join(destination, entry.name);
    if (entry.isDirectory()) {
      await cp(from, to, { recursive: true, force: true });
    } else if (!entry.name.endsWith('.html')) {
      await cp(from, to, { force: true });
    }
  }
}

export default defineConfig({
  output: 'static',
  base: process.env.SITE_BASE_PATH || '/',
  root: fileURLToPath(new URL('./', import.meta.url)),
  srcDir: fileURLToPath(new URL('./src/', import.meta.url)),
  ...(configuredOutput ? { outDir: configuredOutput } : {}),
  integrations: [
    mdx(),
    {
      name: 'productshape-legacy-static-assets',
      hooks: {
        'astro:build:done': async ({ dir }) => {
          await copyStaticOutput(legacyOutput, fileURLToPath(dir));
        },
      },
    },
  ],
});
