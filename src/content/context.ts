// Reads the text around a double-click: the sentence, and (for Vietnamese)
// the multi-syllable phrases that contain the clicked syllable.

export interface ClickContext {
  text: string; // text of the surrounding block element
  offset: number; // click offset inside `text`
  sentence: string;
}

const BLOCK = /^(P|LI|TD|TH|DD|DT|BLOCKQUOTE|H[1-6]|PRE|FIGCAPTION|ARTICLE|SECTION|DIV|BODY)$/;
export const VI_CHARS = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i;

export function readContext(range: Range): ClickContext {
  const start = range.startContainer;
  let el: Element | null = start instanceof Element ? start : start.parentElement;
  while (el && !BLOCK.test(el.tagName)) el = el.parentElement;
  if (!el) return { text: '', offset: 0, sentence: '' };

  const before = document.createRange();
  before.setStart(el, 0);
  before.setEnd(range.startContainer, range.startOffset);
  const offset = before.toString().length;
  const text = el.textContent;

  const parts = text.match(/[^.!?…]+(?:[.!?…]+["'”’)\]]*|$)/g) ?? [text];
  let pos = 0;
  let sentence = parts.at(-1) ?? '';
  for (const part of parts) {
    if (offset < pos + part.length) { sentence = part; break; }
    pos += part.length;
  }
  return { text, offset, sentence: sentence.replace(/\s+/g, ' ').trim() };
}

/** Vietnamese words are space-separated syllables; try 4→1 syllable phrases around the click. */
export function vietnamesePhrases({ text, offset }: ClickContext): string[] {
  const tokens = [...text.matchAll(/[\p{L}\p{M}]+/gu)].map((m) => ({ w: m[0], s: m.index, e: m.index + m[0].length }));
  let i = tokens.findIndex((t) => offset >= t.s && offset < t.e);
  if (i < 0) i = tokens.findIndex((t) => t.s >= offset);
  if (i < 0) return [];
  const out = new Set<string>();
  for (let n = 4; n >= 1; n--) {
    for (let a = Math.max(0, i - n + 1); a <= i && a + n <= tokens.length; a++) {
      const seg = tokens.slice(a, a + n);
      const onlySpaces = seg.every((t, j) => j === 0 || /^\s+$/.test(text.slice(seg[j - 1]?.e ?? 0, t.s)));
      if (onlySpaces) out.add(seg.map((t) => t.w).join(' '));
    }
  }
  return [...out];
}

export function looksVietnamese(word: string, ctx: ClickContext): boolean {
  if (VI_CHARS.test(word)) return true;
  if (/^vi/i.test(document.documentElement.lang)) return true;
  return (ctx.sentence.match(new RegExp(VI_CHARS.source, 'gi')) ?? []).length >= 3;
}
