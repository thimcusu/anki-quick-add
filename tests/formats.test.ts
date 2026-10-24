import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { scanFiles } from '../src/shared/formats/importer.ts';
import { parseStructuredText, stripMarkup, viEntry, chipsFrom } from '../src/shared/formats/convert.ts';
import { readLd2 } from '../src/shared/formats/ld2.ts';
import { normalizeHost, scriptMeta, orderedDicts } from '../src/shared/local-settings.ts';

const fixture = (name: string): { name: string; bytes: Uint8Array } => ({ name, bytes: new Uint8Array(readFileSync(new URL(`fixtures/${name}`, import.meta.url))) });

test('structured text and markup', () => {
  assert.deepEqual(parseStructuredText('@book /buk/\n*  danh từ\n- quyển sách\n- sổ sách'), { i: '/buk/', g: [{ p: 'noun', m: ['quyển sách', 'sổ sách'] }] });
  assert.equal(stripMarkup('a<br>b &amp; <b>c</b>&#39;'), "a\nb & c'");
  assert.deepEqual(chipsFrom('to eat; to have (a meal), ăn cơm'), ['to eat', 'to have']);
});

test('Yomitan zip (Vietnamese → English)', async () => {
  const { candidates, skipped } = await scanFiles([fixture('yomitan-vi-en.zip')]);
  assert.equal(skipped.length, 0);
  const [c] = candidates;
  assert.ok(c);
  assert.equal(c.name, 'Mini Việt-Anh');
  assert.equal(c.format, 'Yomitan');
  assert.equal(c.direction, 'vi-en');
  const out = await c.build('vi-en');
  assert.deepEqual(out.get('nhà'), { c: ['house', 'home'], g: [{ p: 'noun', m: ['house', 'home'] }], x: [['nhà tôi', 'my house']] });
  assert.deepEqual((out.get('ăn') as { c: string[] }).c, ['to eat', 'to have']);
});

test('ZIP bundle with StarDict (.dict.dz) and TSV', async () => {
  const { candidates, skipped } = await scanFiles([fixture('bundle.zip')]);
  assert.deepEqual(skipped, []);
  const names = candidates.map((c) => `${c.format}:${c.name}:${c.direction}:${c.headwords}`).sort();
  assert.deepEqual(names, ['StarDict:Mini Anh-Việt:en-vi:2', 'TSV:words:en-vi:1']);
  const star = candidates.find((c) => c.format === 'StarDict');
  const sd = await star?.build('en-vi');
  assert.deepEqual(sd?.get('book'), { i: '', g: [{ p: 'noun', m: ['quyển sách', 'sổ sách'] }], s: 'im' });
  assert.deepEqual(sd?.get('apple'), { i: '/ˈæpl/', g: [{ p: '', m: ['quả táo'] }], s: 'im' });
  const tsv = await candidates.find((c) => c.format === 'TSV')?.build('en-vi');
  assert.deepEqual(tsv?.get('serendipity'), { i: '/ˌserənˈdɪpəti/', g: [{ p: 'noun', m: ['sự tình cờ may mắn', 'vận may'] }], s: 'im' });
});

test('Vietnamese entry from plain text', () => {
  assert.deepEqual(viEntry(['house, home']), { c: ['house', 'home'], g: [{ p: '', m: ['house, home'] }] });
});

const LD2 = new URL('../dictionaries/ev.ld2', import.meta.url);
test('Lingoes .ld2 (local file, skipped if absent)', { skip: !existsSync(LD2) }, async () => {
  const raw = await readLd2(new Uint8Array(readFileSync(LD2)));
  assert.equal(raw.size, 103871);
  const { candidates } = await scanFiles([{ name: 'ev.ld2', bytes: new Uint8Array(readFileSync(LD2)) }]);
  const out = await candidates[0]?.build('en-vi');
  const e = out?.get('necessarily') as { g: { m: string[] }[] } | undefined;
  assert.ok(e && e.g[0]?.m.length);
});

test('script metadata and dictionary order', () => {
  assert.equal(normalizeHost('https://API.dictionaryapi.dev/api/'), 'https://api.dictionaryapi.dev/*');
  assert.equal(normalizeHost('javascript:alert(1)'), null);
  assert.deepEqual(scriptMeta('// @name  Free Dictionary\n// @host https://api.dictionaryapi.dev\n// @host bad\n// @direction en-vi\nasync function lookup() {}'),
    { name: 'Free Dictionary', hosts: ['https://api.dictionaryapi.dev/*'], direction: 'en-vi' });
  assert.deepEqual(orderedDicts([{ id: 'file:2', enabled: false }, { id: 'builtin', enabled: true }, { id: 'gone', enabled: true }], ['builtin', 'file:2', 'script:a']),
    [{ id: 'file:2', enabled: false }, { id: 'builtin', enabled: true }, { id: 'script:a', enabled: true }]);
});
