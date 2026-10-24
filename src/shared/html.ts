// String-level HTML helpers used to build Anki fields (no DOM needed, so they
// also run in the service worker).

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const ALLOWED_TAG = /^<(\/?)(b|i|u|br|span)(\s+data-cloze(="[^"]*")?)?\s*\/?>/i;
const ENTITY = /^&(amp|lt|gt|quot|#39|nbsp);/;

/**
 * Re-sanitize the editor's inline HTML. Keeps only <b>, <i>, <u>, <br> and
 * <span data-cloze>; anything else (including attributes) is escaped as text.
 */
export function sanitizeInline(html: string): string {
  let out = '';
  let i = 0;
  while (i < html.length) {
    const ch = html.charAt(i);
    const rest = html.slice(i);
    if (ch === '<') {
      const m = ALLOWED_TAG.exec(rest);
      if (m) {
        const [whole, close = '', tag = ''] = m;
        const name = tag.toLowerCase();
        if (name === 'span') out += close ? '</span>' : '<span data-cloze>';
        else if (name === 'br') out += '<br>';
        else out += `<${close}${name}>`;
        i += whole.length;
        continue;
      }
      out += '&lt;';
    } else if (ch === '>') {
      out += '&gt;';
    } else if (ch === '&') {
      const m = ENTITY.exec(rest);
      out += m ? m[0] : '&amp;';
      if (m) { i += m[0].length; continue; }
    } else if (ch === '"') {
      out += '&quot;';
    } else {
      out += ch;
    }
    i += 1;
  }
  return out;
}

/** Split sanitized sentence HTML around the cloze span. */
export function splitCloze(html: string): { before: string; answer: string; after: string } | null {
  const m = /<span data-cloze>([\s\S]*?)<\/span>/.exec(html);
  if (!m) return null;
  return { before: html.slice(0, m.index), answer: m[1] ?? '', after: html.slice(m.index + m[0].length) };
}

export const stripTags = (html: string): string =>
  html.replace(/<br>/g, ' ').replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

/** Only allow http(s) links in the Source field. */
export function safeUrl(url: string): string | null {
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : null;
  } catch {
    return null;
  }
}
