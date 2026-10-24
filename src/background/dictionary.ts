// Offline dictionary lookups. Data lives in dist/dict/{en,vi}/<xx>.json,
// sharded by the first two (unaccented) letters so a lookup loads one file.
import type { EnEntry, EnLookup, ViEntry, ViLookup } from '../shared/types.ts';

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

export async function lookupEn(word: string): Promise<EnLookup> {
  for (const candidate of lemmaCandidates(word)) {
    const entry = await get<EnEntry>('en', candidate);
    if (entry) return { found: true, head: candidate, ...entry };
  }
  return { found: false, head: word.toLowerCase() };
}

/** `phrases` are Vietnamese phrases around the click, longest first. */
export async function lookupVi(phrases: string[]): Promise<ViLookup> {
  for (const phrase of phrases) {
    const entry = await get<ViEntry>('vi', phrase.toLowerCase());
    if (entry) return { found: true, head: phrase, ...entry };
  }
  return { found: false, head: phrases.at(-1) ?? '' };
}
