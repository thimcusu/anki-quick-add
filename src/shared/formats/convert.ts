// Raw dictionary definitions → the extension's entry shapes (same rules as
// scripts/dict/build_dict.py, so imported and built-in dictionaries look alike).
import type { EnEntry, MeaningGroup, TechSection, ViEntry } from '../types.ts';

export const VI_CHARS = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i;

const POS_VI: [RegExp, string][] = [
  [/ngoại động từ|nội động từ|động từ/, 'verb'], [/danh từ/, 'noun'], [/tính từ/, 'adjective'],
  [/phó từ|trạng từ/, 'adverb'], [/giới từ/, 'preposition'], [/liên từ/, 'conjunction'],
  [/thán từ/, 'interjection'], [/đại từ/, 'pronoun'], [/mạo từ/, 'article'], [/thành ngữ/, 'idiom'],
];
const POS_EN: Record<string, string> = {
  n: 'noun', noun: 'noun', v: 'verb', verb: 'verb', adj: 'adjective', a: 'adjective', adjective: 'adjective',
  adv: 'adverb', adverb: 'adverb', prep: 'preposition', conj: 'conjunction', pron: 'pronoun', idiom: 'idiom',
};

export function posName(s: string): string {
  for (const [re, p] of POS_VI) if (re.test(s)) return p;
  const t = s.trim();
  return POS_EN[t.toLowerCase().replace(/\.$/, '')] ?? t;
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
export function unescapeHtml(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === '#') {
      const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

/** Markup → text: line-breaking tags become newlines, other tags are dropped. */
export function stripMarkup(s: string): string {
  return unescapeHtml(s.replace(/<n\s*\/>|<br\s*\/?>|<\/(p|div|li|tr|h\d)>/gi, '\n').replace(/<[^>]+>/g, '')).replace(/[ \t]+\n/g, '\n').trim();
}

function mergeGroups(groups: MeaningGroup[]): MeaningGroup[] {
  const out: (MeaningGroup & { x: string[] })[] = [];
  for (const g of groups) {
    const prev = g.p ? out.find((x) => x.p === g.p) : undefined;
    if (prev) { prev.m.push(...g.m); prev.x.push(...(g.x ?? [])); } else out.push({ p: g.p, m: [...g.m], x: [...(g.x ?? [])] });
  }
  return out.map((g) => {
    const seen = new Set<string>();
    const m = g.m.filter((x) => { const k = x.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
    const x = g.x.slice(0, 3);
    return x.length ? { p: g.p, m, x } : { p: g.p, m };
  }).filter((g) => g.m.length);
}

const oldIpa = (s: string): string => s.replace(/'/g, 'ˈ').replace(/,/g, 'ˌ').replace(/:/g, 'ː').replace(' /', '/').replace('/ ', '/');

/** "@word /ipa/  *part of speech  -meaning  =example+translation" (Lingoes, OVDP, Hồ Ngọc Đức). */
export function parseStructuredText(text: string): { i: string; g: MeaningGroup[] } | null {
  const body = /^\s*@/.test(text) ? text : `@\n${text}`;
  const sections = body.split(/\n\s*\n/).filter((x) => x.trim());
  if (!sections.length) return null;
  const score = (s: string): number => (s.match(/^\s*\*/gm)?.length ?? 0) * 1000 + (s.match(/^\s*-/gm)?.length ?? 0);
  const best = sections.reduce((a, b) => (score(b) > score(a) ? b : a));
  const ipa = /^@\S.*?(\/[^/\n]+\/)/m.exec(body)?.[1];
  const groups: MeaningGroup[] = [];
  let cur: MeaningGroup | null = null;
  for (const line of best.split('\n').slice(1)) {
    const s = line.trim();
    if (s.startsWith('*')) { cur = { p: posName(s.slice(1)), m: [], x: [] }; groups.push(cur); } else if (s.startsWith('-')) {
      if (!cur) { cur = { p: '', m: [], x: [] }; groups.push(cur); }
      cur.m.push(s.slice(1).trim());
    }
  }
  const g = mergeGroups(groups);
  return g.length ? { i: ipa ? oldIpa(ipa) : '', g } : null;
}

/** Lingoes "Free English-Vietnamese" style HTML. */
export function parseLingoesHtml(v: string): { i: string; g: MeaningGroup[] } | null {
  let t = v.replace(/<b><i>\s*([^<]+)<\/i><\/b>/g, '\n*$1\n').replace(/<font color='#cc0000'><b>\s*([^<]+)<\/b><\/font>/g, '\n-$1\n');
  const cut = t.indexOf('<ul>');
  const head = cut < 0 ? t : t.slice(0, cut);
  const body = cut < 0 ? '' : t.slice(cut + 4);
  t = `@${stripMarkup(head.replace(/<br\s*\/?>/gi, '\n'))}\n${stripMarkup(body)}`;
  return parseStructuredText(t.replace(/\n\s*\n/g, '\n'));
}

/** Prodict-style technical dictionary. */
export function parseTechnical(v: string): TechSection | null {
  const s = unescapeHtml(v.replace(/&nbsp;/g, ' '));
  const seen = new Set<string>();
  const m = [...s.matchAll(/<IMG[^>]*>\s*<FONT color="#000000">([^<]+)<\/FONT>/g)].map((x) => (x[1] ?? '').trim())
    .filter((x) => x && !seen.has(x) && seen.add(x));
  const ph = [...s.matchAll(/<FONT face="Tahoma" color=#ff3300 >([^<]+)<\/FONT><FONT face="Tahoma" color=#282828>:?\s*([^<]*)<\/FONT>/g)]
    .slice(0, 6).map((x): [string, string] => [(x[1] ?? '').trim(), (x[2] ?? '').trim()]);
  return m.length || ph.length ? { m: m.slice(0, 10), ph } : null;
}

/** Any other definition text: structured if it looks like it, otherwise one meaning per line. */
export function genericEntry(text: string): { i: string; g: MeaningGroup[] } | null {
  const structured = /^\s*[*-]/m.test(text) ? parseStructuredText(text) : null;
  if (structured) return structured;
  const ipa = /(^|\s)(\/[^/\n]{1,60}\/|\[[^\]\n]{1,60}\])/.exec(text)?.[2] ?? '';
  const lines = text.split('\n').map((l) => l.replace(ipa, '').trim()).filter((l) => l && l.length <= 500).slice(0, 8);
  return lines.length ? { i: ipa.startsWith('[') ? `/${ipa.slice(1, -1)}/` : ipa, g: [{ p: '', m: lines }] } : null;
}

/** English words or short phrases ("chips") in a Vietnamese → English definition. */
export function chipsFrom(text: string): string[] {
  const out: string[] = [];
  for (const part of text.split(/[;,]|\n/)) {
    let s = part.replace(/\([^)]*\)|\[[^\]]*\]/g, '').trim().replace(/^[-*.]+|[-*.]+$/g, '').trim().replace(/\s+/g, ' ');
    if (!s || VI_CHARS.test(s) || !/^[A-Za-z][A-Za-z' .-]*$/.test(s) || s.split(' ').length > 4 || s.length > 32) continue;
    if (s.slice(0, 2) !== s.slice(0, 2).toUpperCase()) s = s.charAt(0).toLowerCase() + s.slice(1);
    out.push(s);
  }
  return out;
}

/** Vietnamese → English entry from definition texts. */
export function viEntry(texts: string[]): ViEntry | null {
  const chips: string[] = [];
  const groups = new Map<string, string[]>();
  const x: [string, string][] = [];
  const addChips = (list: string[]): void => {
    for (const c of list) {
      const n = c.toLowerCase().replace(/^to /, '');
      if (!chips.some((y) => y.toLowerCase().replace(/^to /, '') === n)) chips.push(c);
    }
  };
  for (const raw of texts) {
    let pos = '';
    let structured = false;
    for (const line of raw.split('\n').map((l) => l.trim())) {
      if (line.startsWith('*')) { pos = VI_CHARS.test(line) ? posName(line.slice(1)) : line.slice(1).trim(); continue; }
      if (line.startsWith('@Chuyên ngành')) break;
      if (line.startsWith('-')) {
        structured = true;
        const d = line.slice(1).trim();
        const list = groups.get(pos) ?? [];
        if (!list.includes(d)) list.push(d);
        groups.set(pos, list);
        addChips(chipsFrom(d));
      }
      const ex = /^[=→](.+?)\+(.+)$/.exec(line);
      if (ex) x.push([(ex[1] ?? '').trim(), (ex[2] ?? '').trim()]);
    }
    if (!structured) {
      addChips(chipsFrom(raw));
      if (!groups.size) groups.set('', [raw.split('\n')[0]?.slice(0, 300) ?? '']);
    }
  }
  if (!chips.length && !groups.size) return null;
  const e: ViEntry = { c: chips.slice(0, 10) };
  const g = [...groups].filter(([, m]) => m.length && m[0]).map(([p, m]) => ({ p, m: m.slice(0, 6) }));
  if (g.length) e.g = g.slice(0, 4);
  if (x.length) e.x = x.slice(0, 3);
  return e;
}

/** English → Vietnamese entry from definition texts. */
export function enEntry(texts: string[], markup: boolean): EnEntry | null {
  const parsed = texts.map((t) => genericEntry(markup ? stripMarkup(t) : t)).filter((p): p is { i: string; g: MeaningGroup[] } => p !== null);
  if (!parsed.length) return null;
  return { i: parsed.find((p) => p.i)?.i ?? '', g: mergeGroups(parsed.flatMap((p) => p.g)).slice(0, 6), s: 'im' };
}
