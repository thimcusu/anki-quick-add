// Finds dictionaries in uploaded files (single files, several files, or ZIPs
// of them — nested ZIPs too) and converts them into entries for IndexedDB.
//   Lingoes .ld2 · StarDict (.ifo + .idx[.gz] + .dict[.dz]) · Yomitan/Yomichan .zip · TSV / TXT
import type { EnEntry, ViEntry } from '../types.ts';
import type { Direction } from '../local-settings.ts';
import { decodeUtf8 } from './binary.ts';
import { enEntry, genericEntry, parseLingoesHtml, parseStructuredText, parseTechnical, posName, stripMarkup, VI_CHARS, viEntry } from './convert.ts';
import { readLd2 } from './ld2.ts';
import { readStarDict } from './stardict.ts';
import { isZip, readZip } from './zip.ts';
import { isYomitan, readYomitan } from './yomitan.ts';

export interface InputFile { name: string; bytes: Uint8Array }

export interface Candidate {
  name: string; // suggested dictionary name
  format: string; // shown to the user
  direction: Direction; // guessed from the headwords; the user can change it
  headwords: number;
  build: (direction: Direction) => Promise<Map<string, EnEntry | ViEntry>>;
}

const MAX_DEPTH = 3;
const baseName = (path: string): string => (path.split('/').pop() ?? path);
const stem = (path: string): string => baseName(path).replace(/\.(ld2|tsv|txt|zip|ifo|idx|idx\.gz|dict|dict\.dz|syn)$/i, '');

function guessDirection(words: Iterable<string>): Direction {
  let n = 0; let vi = 0;
  for (const w of words) { if (n++ >= 500) break; if (VI_CHARS.test(w)) vi++; }
  return n && vi / n > 0.3 ? 'vi-en' : 'en-vi';
}

/** Add an entry; headwords that differ only in case ("Access", "access") are merged, the exact-case one first. */
function put(out: Map<string, EnEntry | ViEntry>, word: string, entry: EnEntry | ViEntry | null): void {
  const key = word.trim().toLowerCase();
  if (!key || key.length > 80 || !entry) return;
  const prev = out.get(key);
  if (!prev) { out.set(key, entry); return; }
  const [first, second] = word.trim() === key ? [entry, prev] : [prev, entry];
  if ('c' in first && 'c' in second) {
    out.set(key, { ...first, c: [...new Set([...first.c, ...second.c])].slice(0, 10), g: [...(first.g ?? []), ...(second.g ?? [])].slice(0, 4) });
  } else if ('i' in first && 'i' in second) {
    out.set(key, { ...first, i: first.i || second.i, g: [...first.g, ...second.g].slice(0, 6), ...(first.t ?? second.t ? { t: first.t ?? second.t } : {}) });
  }
}

function ld2Candidate(name: string, raw: Map<string, string>): Candidate {
  const sample = [...raw.values()].slice(0, 300).join('\n');
  const flavor = /<FONT face="Tahoma"/.test(sample) ? 'technical' : /<ul>/.test(sample) && /<b><i>/.test(sample) ? 'html' : 'text';
  return {
    name, format: `Lingoes${flavor === 'technical' ? ' (technical)' : ''}`, direction: guessDirection(raw.keys()), headwords: raw.size,
    build: (direction) => {
      const out = new Map<string, EnEntry | ViEntry>();
      for (const [w, v] of raw) {
        if (direction === 'vi-en') { put(out, w, viEntry([stripMarkup(v)])); continue; }
        if (flavor === 'technical') {
          const t = parseTechnical(v);
          put(out, w, t ? { i: '', g: [], t, s: 'pd' } : null);
        } else {
          const p = flavor === 'html' ? parseLingoesHtml(v) : parseStructuredText(stripMarkup(v)) ?? genericEntry(stripMarkup(v));
          put(out, w, p ? { ...p, s: 'im' } : null);
        }
      }
      return Promise.resolve(out);
    },
  };
}

function tsvCandidate(name: string, text: string): Candidate | null {
  const rows = text.split(/\r?\n/).filter((l) => l && !l.startsWith('#')).map((l) => l.split('\t')).filter((c) => c.length >= 2 && c[0]?.trim());
  if (!rows.length) return null;
  return {
    name, format: 'TSV', direction: guessDirection(rows.map((r) => r[0] ?? '')), headwords: rows.length,
    build: (direction) => {
      const out = new Map<string, EnEntry | ViEntry>();
      for (const [word = '', def = '', ipa = '', pos = ''] of rows) {
        if (direction === 'vi-en') { put(out, word, viEntry([def])); continue; }
        const m = def.split(';').map((x) => x.trim()).filter(Boolean);
        put(out, word, m.length ? { i: ipa.trim(), g: [{ p: posName(pos), m }], s: 'im' } : null);
      }
      return Promise.resolve(out);
    },
  };
}

/** Scan uploaded files; returns one candidate per dictionary found, plus messages for files that were skipped. */
export async function scanFiles(files: InputFile[]): Promise<{ candidates: Candidate[]; skipped: string[] }> {
  const candidates: Candidate[] = [];
  const skipped: string[] = [];
  const star = new Map<string, Partial<Record<'ifo' | 'idx' | 'dict', { bytes: Uint8Array; gz: boolean }>>>();

  const visit = async (file: InputFile, depth: number): Promise<void> => {
    const lower = file.name.toLowerCase();
    if (isZip(file.bytes)) {
      if (depth >= MAX_DEPTH) { skipped.push(`${file.name}: ZIP nested too deep`); return; }
      const entries = readZip(file.bytes);
      if (isYomitan(entries)) {
        const { name, terms } = await readYomitan(entries);
        candidates.push({
          name: name || stem(file.name), format: 'Yomitan', direction: guessDirection(terms.keys()), headwords: terms.size,
          build: (direction) => {
            const out = new Map<string, EnEntry | ViEntry>();
            for (const [w, texts] of terms) put(out, w, direction === 'vi-en' ? viEntry(texts) : enEntry(texts, false));
            return Promise.resolve(out);
          },
        });
        return;
      }
      for (const e of entries) await visit({ name: e.name, bytes: await e.read() }, depth + 1);
      return;
    }
    const sd = /\.(ifo|idx|idx\.gz|dict|dict\.dz)$/.exec(lower);
    if (sd) {
      const kind = sd[1]?.startsWith('ifo') ? 'ifo' : sd[1]?.startsWith('idx') ? 'idx' : 'dict';
      const group = star.get(stem(file.name).toLowerCase()) ?? {};
      group[kind] = { bytes: file.bytes, gz: /\.(gz|dz)$/.test(lower) };
      star.set(stem(file.name).toLowerCase(), group);
      return;
    }
    if (lower.endsWith('.ld2')) {
      candidates.push(ld2Candidate(stem(file.name), await readLd2(file.bytes)));
      return;
    }
    if (/\.(tsv|txt)$/.test(lower)) {
      const c = tsvCandidate(stem(file.name), decodeUtf8(file.bytes));
      if (c) candidates.push(c); else skipped.push(`${baseName(file.name)}: no "word<TAB>meaning" lines`);
      return;
    }
    if (!/\.(syn|json|md|png|jpg|css|html?)$/.test(lower)) skipped.push(`${baseName(file.name)}: unknown format`);
  };

  for (const f of files) await visit(f, 0);

  for (const [key, g] of star) {
    if (!g.ifo || !g.idx || !g.dict) { skipped.push(`${key}: StarDict needs .ifo, .idx and .dict files`); continue; }
    const { name, entries } = await readStarDict({ ifo: g.ifo.bytes, idx: g.idx.bytes, dict: g.dict.bytes, idxGz: g.idx.gz, dictDz: g.dict.gz });
    candidates.push({
      name: name || key, format: 'StarDict', direction: guessDirection(entries.keys()), headwords: entries.size,
      build: (direction) => {
        const out = new Map<string, EnEntry | ViEntry>();
        for (const [w, { text, markup }] of entries) put(out, w, direction === 'vi-en' ? viEntry([markup ? stripMarkup(text) : text]) : enEntry([text], markup));
        return Promise.resolve(out);
      },
    });
  }
  return { candidates, skipped };
}
