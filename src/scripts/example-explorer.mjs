// Generates the public site's example Product Explorer from the authored model in examples/shop.
//
// The public build never reads ProductShape's own product model: the only inputs are the example
// directory and a ProductShape CLI. The CLI is the workspace build (src/packages/cli/dist/bin.js)
// unless PRODUCTSHAPE_CLI names another one. Generation runs inside the example, so the Explorer's
// revision stamp is the commit of the checkout that produced it.
import { spawnSync } from 'node:child_process';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

export const exampleExplorerRoute = 'en/explore/';
export const exampleProductName = 'Example shop';

export function exampleCliPath(root) {
  return process.env.PRODUCTSHAPE_CLI
    ? resolve(root, process.env.PRODUCTSHAPE_CLI)
    : join(root, 'src', 'packages', 'cli', 'dist', 'bin.js');
}

/** Builds the workspace CLI when no explicit CLI was named, so a clean checkout can generate. */
export function buildWorkspaceCli(root) {
  if (process.env.PRODUCTSHAPE_CLI) return;
  const execPath = process.env.npm_execpath;
  const viaNode = execPath && /\.c?js$/u.test(execPath);
  const command = viaNode ? process.execPath : execPath || 'pnpm';
  const result = spawnSync(
    command,
    [...(viaNode ? [execPath] : []), '--filter', '@prodshape/cli', 'run', 'build'],
    {
      cwd: root,
      encoding: 'utf8',
      stdio: 'inherit',
      shell: process.platform === 'win32' && !viaNode,
    },
  );
  if (result.status !== 0) {
    throw new Error('Could not build the workspace ProductShape CLI for the example Explorer.');
  }
}

export async function generateExampleExplorer({ root, destination, productUrl }) {
  const example = join(root, 'examples', 'shop');
  const cli = exampleCliPath(root);
  try {
    await access(cli);
  } catch {
    throw new Error(
      `The example Explorer needs a built ProductShape CLI at ${cli}. Run \`pnpm --filter @prodshape/cli run build\` or set PRODUCTSHAPE_CLI.`,
    );
  }
  const args = [cli, 'graph', '--format', 'html', '--product-name', exampleProductName];
  if (productUrl) args.push('--product-url', productUrl);
  const result = spawnSync(process.execPath, args, { cwd: example, encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(
      `Generating the example Explorer from examples/shop failed:\n${result.stdout}${result.stderr}`,
    );
  }
  const html = await readFile(join(example, '.product', 'generated', 'explorer.html'));
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, html);
}
