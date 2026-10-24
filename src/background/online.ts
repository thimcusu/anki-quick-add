// Online fallbacks used when a word is not in the offline dictionary:
//   - Oxford Learner's Dictionaries page (parsed in the content script with DOMParser)
//   - Google Translate for Vietnamese translations of the word and its definitions
// Requests carry no cookies, have timeouts and size limits.

const OXFORD = 'https://www.oxfordlearnersdictionaries.com/search/english/?q=';
const TRANSLATE = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=vi&dt=t&q=';
const TIMEOUT_MS = 12_000;
const MAX_HTML = 3_000_000;

export type OxfordResponse = { ok: true; html: string; url: string } | { ok: false; msg: string };

const oxfordCache = new Map<string, OxfordResponse>();

export async function fetchOxford(word: string): Promise<OxfordResponse> {
  const key = word.toLowerCase().trim();
  if (!/^[a-z][a-z' -]{0,40}$/.test(key)) return { ok: false, msg: 'Not a valid word.' };
  const hit = oxfordCache.get(key);
  if (hit) return hit;
  try {
    const res = await fetch(OXFORD + encodeURIComponent(key), { credentials: 'omit', signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok || !(res.headers.get('content-type') ?? '').includes('text/html')) return { ok: false, msg: `Oxford answered ${res.status}.` };
    if (new URL(res.url).pathname.startsWith('/spellcheck/')) return { ok: false, msg: 'Not in the Oxford dictionary either.' };
    const html = await res.text();
    if (html.length > MAX_HTML) return { ok: false, msg: 'Oxford response too large.' };
    const out: OxfordResponse = { ok: true, html, url: res.url };
    if (oxfordCache.size > 50) oxfordCache.clear();
    oxfordCache.set(key, out);
    return out;
  } catch {
    return { ok: false, msg: 'Could not reach the Oxford dictionary (offline?).' };
  }
}

/** Translate short English texts to Vietnamese. Returns '' for any text that failed. */
export async function translateToVi(texts: string[]): Promise<string[]> {
  return Promise.all(texts.map(async (text) => {
    try {
      const res = await fetch(TRANSLATE + encodeURIComponent(text), { credentials: 'omit', signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (!res.ok) return '';
      const body = (await res.json()) as unknown;
      // Shape: [[["dịch", "source", ...], ...], ...]
      const parts = Array.isArray(body) && Array.isArray(body[0]) ? (body[0] as unknown[]) : [];
      return parts.map((p) => (Array.isArray(p) && typeof p[0] === 'string' ? p[0] : '')).join('').slice(0, 500);
    } catch {
      return '';
    }
  }));
}
