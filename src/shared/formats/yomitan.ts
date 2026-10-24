// Yomitan / Yomichan dictionary (.zip with index.json + term_bank_*.json) → { term: [glossary text] }.
import { decodeUtf8 } from './binary.ts';
import type { ZipEntry } from './zip.ts';

export const isYomitan = (entries: ZipEntry[]): boolean =>
  entries.some((e) => /(^|\/)index\.json$/.test(e.name)) && entries.some((e) => /(^|\/)term_bank_\d+\.json$/.test(e.name));

/** Structured content (Yomitan v3) → plain text with line breaks. */
function contentText(c: unknown): string {
  if (typeof c === 'string') return c;
  if (Array.isArray(c)) return c.map(contentText).join('');
  if (typeof c === 'object' && c !== null) {
    const o = c as { type?: unknown; text?: unknown; content?: unknown; tag?: unknown };
    if (o.type === 'text' && typeof o.text === 'string') return o.text;
    if (o.type === 'image') return '';
    const inner = contentText(o.content);
    return typeof o.tag === 'string' && /^(div|li|br|p|tr|ul|ol)$/.test(o.tag) ? `${inner}\n` : inner;
  }
  return '';
}

export async function readYomitan(entries: ZipEntry[]): Promise<{ name: string; terms: Map<string, string[]> }> {
  let name = '';
  const index = entries.find((e) => /(^|\/)index\.json$/.test(e.name));
  if (index) {
    try { const title = (JSON.parse(decodeUtf8(await index.read())) as { title?: unknown }).title; name = typeof title === 'string' ? title : ''; } catch { /* no title */ }
  }
  const terms = new Map<string, string[]>();
  for (const e of entries.filter((x) => /(^|\/)term_bank_\d+\.json$/.test(x.name))) {
    const bank = JSON.parse(decodeUtf8(await e.read())) as unknown[];
    for (const t of bank) {
      if (!Array.isArray(t) || typeof t[0] !== 'string' || !Array.isArray(t[5])) continue;
      const term = t[0].trim();
      if (!term || term.startsWith('00-database')) continue;
      const list = terms.get(term) ?? [];
      for (const g of t[5]) {
        const text = contentText(typeof g === 'object' && g !== null && 'content' in g ? (g as { content: unknown }).content : g).trim();
        if (text) list.push(text);
      }
      if (list.length) terms.set(term, list);
    }
  }
  return { name, terms };
}
