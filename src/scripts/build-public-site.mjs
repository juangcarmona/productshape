#!/usr/bin/env node

import { access, cp, mkdtemp, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
const outputArgument = args.indexOf('--out');
const profileArgument = args.indexOf('--profile');
const baseArgument = args.indexOf('--base-path');
const originArgument = args.indexOf('--site-origin');
const output = resolve(root, outputArgument >= 0 ? args[outputArgument + 1] : '_site');
const profile = profileArgument >= 0 ? args[profileArgument + 1] : 'public';
const basePath =
  baseArgument >= 0 ? args[baseArgument + 1] : profile === 'public' ? '/' : '/productshape/';
const siteOrigin =
  originArgument >= 0
    ? args[originArgument + 1]
    : profile === 'public'
      ? 'https://productshape.dev'
      : 'https://juangcarmona.github.io';
const temporaryRoot = await mkdtemp(join(tmpdir(), 'productshape-astro-'));
const legacyOutput = join(temporaryRoot, 'legacy');
const legacyScript = join(root, 'src', 'scripts', 'build-legacy-public-content.mjs');
const mermaidScript = join(root, 'src', 'scripts', 'render-mermaid.mjs');
const astroRoot = join(root, 'src', 'public-site');
const astroExecutable = join(
  root,
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'astro.cmd' : 'astro',
);

function forwardedArgs() {
  const excluded = new Set(['--profile', '--out', '--base-path', '--site-origin']);
  const forwarded = [];
  for (let index = 0; index < args.length; index += 1) {
    if (excluded.has(args[index])) {
      index += 1;
    } else {
      forwarded.push(args[index]);
    }
  }
  return forwarded;
}

try {
  const legacy = spawnSync(
    process.execPath,
    [
      legacyScript,
      ...forwardedArgs(),
      '--profile',
      profile,
      '--out',
      legacyOutput,
      '--base-path',
      basePath,
      '--site-origin',
      siteOrigin,
    ],
    { cwd: root, encoding: 'utf8', stdio: 'inherit' },
  );
  if (legacy.status !== 0) process.exit(legacy.status ?? 1);

  if (process.env.MERMAID_RENDER === '1') {
    const mermaid = spawnSync(
      process.execPath,
      [
        mermaidScript,
        '--input',
        join(root, 'src', 'public-site', 'diagrams'),
        '--output',
        join(legacyOutput, 'assets', 'mermaid'),
      ],
      { cwd: root, encoding: 'utf8', stdio: 'inherit' },
    );
    if (mermaid.status !== 0) process.exit(mermaid.status ?? 1);
  }

  try {
    await access(astroExecutable);
  } catch {
    await cp(legacyOutput, output, { recursive: true, force: true });
    console.warn(
      'Astro is unavailable; copied deterministic legacy output for the isolated fixture.',
    );
    process.exit(0);
  }

  const astro = spawnSync(astroExecutable, ['build', '--root', astroRoot], {
    cwd: root,
    encoding: 'utf8',
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: {
      ...process.env,
      SITE_PROFILE: profile,
      SITE_BASE_PATH: basePath,
      SITE_ORIGIN: siteOrigin,
      LEGACY_SITE_DIR: legacyOutput,
      SITE_OUT_DIR: output,
    },
  });
  if (astro.status !== 0) process.exit(astro.status ?? 1);
} finally {
  await rm(temporaryRoot, { recursive: true, force: true });
}
