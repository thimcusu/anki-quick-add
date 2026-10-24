// Release zip for the Chrome Web Store / GitHub Releases:
//   npm run package   → release/anki-quick-add-<version>.zip
// Builds a separate copy in release/dist with a dictionary made only from the
// shareable sources of dictionaries.json (never dictionaries.local.json), so
// your own dist/ and data/ are left untouched.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const run = (cmd, args) => execFileSync(cmd, args, { cwd: root, stdio: 'inherit' });
const out = join(root, 'release');
const dist = join(out, 'dist');
const dict = join(root, '.cache', 'public-dict');

run('npm', ['run', 'check']);
run('python3', ['scripts/dict/build_dict.py', '--public', `--out=${dict}`]);
const sources = JSON.parse(readFileSync(join(dict, 'sources.json'), 'utf8'));
const notShareable = sources.filter((s) => !s.shareable);
if (notShareable.length) throw new Error(`not shareable: ${notShareable.map((s) => s.name).join(', ')}`);

rmSync(dist, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
run('node', ['scripts/build.mjs', '--data', '--release', `--out=${dist}`, `--dict=${dict}`]);

const { version } = JSON.parse(readFileSync(join(root, 'static', 'manifest.json'), 'utf8'));
const zip = join(out, `anki-quick-add-${version}.zip`);
rmSync(zip, { force: true });
// Source maps stay out of the store package.
execFileSync('zip', ['-qr', '-X', zip, '.', '-x', '*.map', '-x', '.DS_Store'], { cwd: dist, stdio: 'inherit' });
console.log(`✓ ${zip}`);
