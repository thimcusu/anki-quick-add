// Build: bundles TypeScript with esbuild into dist/ and copies the manifest
// and dictionary data. Load `dist/` as the unpacked extension in Chrome.
//   node scripts/build.mjs           build code (+ data if dist/dict is missing)
//   node scripts/build.mjs --data    force re-copy of data/dict
//   node scripts/build.mjs --watch   rebuild code on change
//   node scripts/build.mjs --test    test build into dist-test/
import * as esbuild from 'esbuild';
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = new Set(process.argv.slice(2));
const testBuild = args.has('--test'); // e2e build: open shadow root so tests can inspect the bubble
const dist = join(root, testBuild ? 'dist-test' : 'dist');

mkdirSync(dist, { recursive: true });
for (const file of ['manifest.json', 'popup.html', 'options.html', 'page.css']) {
  cpSync(join(root, 'static', file), join(dist, file));
}

const distDict = join(dist, 'dict');
if (args.has('--data') || !existsSync(distDict)) {
  rmSync(distDict, { recursive: true, force: true });
  cpSync(join(root, 'data', 'dict'), distDict, { recursive: true });
  console.log('copied dictionary data → dist/dict');
}

const options = {
  entryPoints: {
    background: join(root, 'src', 'background', 'index.ts'),
    content: join(root, 'src', 'content', 'index.ts'),
    popup: join(root, 'src', 'pages', 'popup.ts'),
    options: join(root, 'src', 'pages', 'options.ts'),
  },
  outdir: dist,
  bundle: true,
  format: 'iife',
  target: 'chrome120',
  sourcemap: true, // error stack traces point at the TypeScript source
  minify: false,
  legalComments: 'none',
  define: { __SHADOW_MODE__: testBuild ? '"open"' : 'undefined' },
  logLevel: 'info',
};

if (args.has('--watch')) {
  const ctx = await esbuild.context(options);
  await ctx.watch();
} else {
  await esbuild.build(options);
}
