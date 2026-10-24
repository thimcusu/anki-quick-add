// Fetches the ozdic.com page for a word. The HTML is returned as a string and
// parsed in the content script with DOMParser (an inert document: no scripts
// run, nothing is inserted into the page).
import type { CollocationResponse } from '../shared/types.ts';

const BASE = 'https://ozdic.com/word/';
const MAX_BYTES = 3_000_000;
const cache = new Map<string, CollocationResponse>();

export async function fetchCollocations(word: string): Promise<CollocationResponse> {
  const key = word.toLowerCase().trim();
  if (!/^[a-z][a-z' -]{0,40}$/.test(key)) return { ok: false, msg: 'Not a valid word.' };
  const hit = cache.get(key);
  if (hit) return hit;
  try {
    const res = await fetch(BASE + encodeURIComponent(key), { credentials: 'omit', redirect: 'follow' });
    const type = res.headers.get('content-type') ?? '';
    if (!res.ok || !type.includes('text/html')) return { ok: false, msg: `ozdic.com answered ${res.status}.` };
    const html = await res.text();
    if (html.length > MAX_BYTES) return { ok: false, msg: 'Response too large.' };
    const result: CollocationResponse = { ok: true, html };
    if (cache.size > 50) cache.clear();
    cache.set(key, result);
    return result;
  } catch {
    return { ok: false, msg: 'Could not reach ozdic.com (offline?).' };
  }
}
