// Offline dictionary lookups. Data lives in dist/dict/{en,vi}/<xx>.json,
// sharded by the first two (unaccented) letters so a lookup loads one file.
import type { DictSection, EnEntry, EnLookup, ViEntry, ViLookup } from '../shared/types.ts';
import { BUILTIN, type Direction, loadLocal, orderedDicts } from '../shared/local-settings.ts';
import { getEntry, listDicts } from '../shared/dictdb.ts';

type Shard<T> = Record<string, T>;
const MAX_CACHED_SHARDS = 40;
const cache = new Map<string, Promise<Shard<unknown>>>();

export const unaccent = (s: string): string =>
  s.replace(/đ/g, 'd').replace(/Đ/g, 'D').normalize('NFD').replace(/[̀-ͯ]/g, '');

export function shardKey(word: string): string {
  const k = unaccent(word.slice(0, 2)).toLowerCase().replace(/[^a-z]/g, '_');
  return (k + '_').slice(0, 2);
}

function loadShard<T>(lang: 'en' | 'vi', word: string): Promise<Shard<T>> {
  const key = `${lang}/${shardKey(word)}`;
  let shard = cache.get(key);
  if (!shard) {
    if (cache.size >= MAX_CACHED_SHARDS) {
      const oldest = cache.keys().next().value;
      if (oldest !== undefined) cache.delete(oldest);
    }
    shard = fetch(chrome.runtime.getURL(`dict/${key}.json`))
      .then(async (r) => (r.ok ? ((await r.json()) as Shard<unknown>) : {}))
      .catch(() => ({}));
    cache.set(key, shard);
  }
  return shard as Promise<Shard<T>>;
}

async function get<T>(lang: 'en' | 'vi', word: string): Promise<T | undefined> {
  const shard = await loadShard<T>(lang, word);
  return Object.hasOwn(shard, word) ? shard[word] : undefined;
}

/** Possible dictionary forms of an inflected English word ("studied" → "study"). */
export function lemmaCandidates(input: string): string[] {
  const w = input.toLowerCase().replace(/[’']s$/, '').replace(/’/g, "'");
  const out = [w];
  const add = (x: string | null): void => { if (x && x.length > 1 && !out.includes(x)) out.push(x); };
  const undouble = (x: string): string | null => (/([b-df-hj-np-tv-z])\1$/.test(x) ? x.slice(0, -1) : null);
  const strip = (suffix: string, ...endings: (string | null)[]): void => {
    if (!w.endsWith(suffix)) return;
    const base = w.slice(0, -suffix.length);
    for (const e of endings) add(e === null ? undouble(base) : base + e);
  };
  strip('ies', 'y'); strip('ied', 'y'); strip('ier', 'y'); strip('iest', 'y'); strip('ily', 'y');
  strip('es', ''); strip('s', '');
  strip('ed', '', 'e', null); strip('d', '');
  strip('ing', '', 'e', null);
  strip('er', '', 'e', null); strip('est', '', 'e', null);
  strip('ly', '', 'le');
  return out;
}

// ---------- dictionaries chosen by the user (built-in + imported, in order) ----------

interface Source { id: string; name: string }
let sourcesCache: Promise<Record<Direction, Source[]>> | null = null;
let watching = false;

/** Enabled dictionaries per direction, in the user's order (scripts are handled in scripts.ts). */
export function dictionarySources(): Promise<Record<Direction, Source[]>> {
  if (!watching) {
    watching = true;
    chrome.storage.onChanged.addListener((changes, area) => { if (area === 'local' && 'dicts' in changes) sourcesCache = null; });
  }
  sourcesCache ??= (async () => {
    const [local, imported] = await Promise.all([loadLocal(), listDicts().catch(() => [])]);
    const ids = [BUILTIN, ...imported.map((d) => d.id)];
    const out: Record<Direction, Source[]> = { 'en-vi': [], 'vi-en': [] };
    for (const ref of orderedDicts(local.dicts, ids)) {
      if (!ref.enabled) continue;
      if (ref.id === BUILTIN) { out['en-vi'].push({ id: BUILTIN, name: 'Built-in' }); out['vi-en'].push({ id: BUILTIN, name: 'Built-in' }); continue; }
      const d = imported.find((x) => x.id === ref.id);
      if (d) out[d.direction].push({ id: d.id, name: d.name });
    }
    return out;
  })();
  return sourcesCache;
}

async function find<T extends EnEntry | ViEntry>(source: Source, lang: 'en' | 'vi', key: string): Promise<T | undefined> {
  return source.id === BUILTIN ? get<T>(lang, key) : getEntry<T>(source.id, key).catch(() => undefined);
}

/** The built-in entry only (word family, IPA and examples of other forms). */
export async function lookupBuiltin(word: string): Promise<EnLookup> {
  for (const candidate of lemmaCandidates(word)) {
    const entry = await get<EnEntry>('en', candidate);
    if (entry) return { found: true, head: candidate, ...entry };
  }
  return { found: false, head: word.toLowerCase() };
}

/**
 * English → Vietnamese in every enabled dictionary. The first dictionary that
 * knows the word is the main entry; `sections` has one item per dictionary.
 * The word family always comes from the built-in data (WordNet).
 */
export async function lookupEn(word: string): Promise<EnLookup> {
  const sources = (await dictionarySources())['en-vi'];
  const sections: DictSection[] = [];
  for (const source of sources) {
    for (const candidate of lemmaCandidates(word)) {
      const entry = await find<EnEntry>(source, 'en', candidate);
      if (entry) { sections.push({ id: source.id, name: source.name, entry: { ...entry, head: candidate } }); break; }
    }
  }
  const main = sections[0];
  if (!main) return { found: false, head: word.toLowerCase() };
  const family = main.entry.f ?? (await get<EnEntry>('en', main.entry.head))?.f;
  return { found: true, ...main.entry, ...(family ? { f: family } : {}), sections };
}

/** `phrases` are Vietnamese phrases around the click, longest first. Results of all dictionaries are merged. */
export async function lookupVi(phrases: string[]): Promise<ViLookup> {
  const sources = (await dictionarySources())['vi-en'];
  for (const phrase of phrases) {
    const key = phrase.toLowerCase();
    const found = (await Promise.all(sources.map((s) => find<ViEntry>(s, 'vi', key)))).filter((e): e is ViEntry => !!e);
    if (!found.length) continue;
    const merged: ViEntry = { c: [...new Set(found.flatMap((e) => e.c))].slice(0, 12) };
    const g = found.flatMap((e) => e.g ?? []);
    const x = found.flatMap((e) => e.x ?? []);
    const t = found.flatMap((e) => e.t ?? []);
    if (g.length) merged.g = g.slice(0, 5);
    if (x.length) merged.x = x.slice(0, 3);
    if (t.length) merged.t = t.slice(0, 4);
    return { found: true, head: phrase, ...merged };
  }
  return { found: false, head: phrases.at(-1) ?? '' };
}
