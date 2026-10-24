// Build: bundles TypeScript with esbuild into dist/ and copies the manifest
// and dictionary data. Load `dist/` as the unpacked extension in Chrome.
//   node scripts/build.mjs           build code (+ data if dist/dict is missing)
//   node scripts/build.mjs --data    force re-copy of data/dict (built by `npm run dict`)
//   node scripts/build.mjs --watch   rebuild code on change
//   node scripts/build.mjs --test    test build into dist-test/
//   --out=<dir> --dict=<dir>         other output / dictionary folders (release builds)
import * as esbuild from 'esbuild';
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const args = new Set(argv);
const option = (name) => argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const testBuild = args.has('--test'); // e2e build: open shadow root so tests can inspect the bubble
const dist = option('out') ?? join(root, testBuild ? 'dist-test' : 'dist'); // --out=<dir> (used by package.mjs)

mkdirSync(dist, { recursive: true });
for (const file of ['manifest.json', 'popup.html', 'options.html', 'sandbox.html', 'offscreen.html', 'page.css', 'icons']) {
  cpSync(join(root, 'static', file), join(dist, file), { recursive: true });
}

const distDict = join(dist, 'dict');
const dataDict = option('dict') ?? join(root, 'data', 'dict'); // --dict=<dir>
if (!existsSync(dataDict)) {
  if (!existsSync(distDict)) console.warn('⚠ data/dict is missing: run `npm run dict` to build the offline dictionary.');
} else if (args.has('--data') || !existsSync(distDict)) {
  rmSync(distDict, { recursive: true, force: true });
  cpSync(dataDict, distDict, { recursive: true });
  console.log('copied dictionary data → dist/dict');
}

const options = {
  entryPoints: {
    background: join(root, 'src', 'background', 'index.ts'),
    content: join(root, 'src', 'content', 'index.ts'),
    popup: join(root, 'src', 'pages', 'popup.ts'),
    options: join(root, 'src', 'pages', 'options.ts'),
    sandbox: join(root, 'src', 'sandbox', 'index.ts'),
    offscreen: join(root, 'src', 'offscreen', 'index.ts'),
  },
  outdir: dist,
  bundle: true,
  format: 'iife',
  target: 'chrome120',
  sourcemap: !args.has('--release'), // error stack traces point at the TypeScript source (not in store packages)
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
