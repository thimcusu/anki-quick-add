// Parses an ozdic.com word page into collocation groups. DOMParser creates an
// inert document: scripts don't run and nothing is attached to the page.
// Only textContent is read from it.
import type { CollocationGroup } from '../shared/types.ts';

/** Group labels: "ADJ", "VERB + ACCESS", "ACCESS + NOUN", "PREP", "PHRASES", ... */
const LABEL = /^[A-Z][A-Z .+]*$/;
/** Sense headings: "(noun.)", "(verb.) have a conversation". Other <h3>s (idioms, "Random") end the list. */
const SECTION = /^\((noun|verb|adj|adv)[a-z.]*\)/i;

export function parseOzdic(html: string): CollocationGroup[] {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  // Newer pages wrap everything in <section id="collocations">; some (e.g. adverbs
  // like "necessarily") have no "(adv.)" sense heading at all.
  const scope = doc.querySelector('section#collocations') ?? doc;
  const scoped = scope !== doc;
  const groups: CollocationGroup[] = [];
  let section = '';
  for (const node of scope.querySelectorAll('h3, p')) {
    const text = node.textContent.replace(/\s+/g, ' ').trim();
    if (node.tagName === 'H3') {
      if (SECTION.test(text)) section = text;
      else if (section || scoped) break;
      continue;
    }
    const label = text.replace(/\.$/, '');
    if ((!section && !scoped) || !LABEL.test(label) || !node.className.includes('italic')) continue;
    const rows: CollocationGroup['rows'] = [];
    // A row is either <div><p>words</p><p>example</p></div> or just <p>words</p>.
    for (const row of node.nextElementSibling?.children ?? []) {
      const [wordsP, exampleP] = row.tagName === 'P' ? [row] : row.querySelectorAll(':scope > p');
      const words = [...(wordsP?.querySelectorAll('span') ?? [])]
        .filter((s) => s.className.includes('font-bold'))
        .map((s) => s.textContent.trim())
        .filter(Boolean);
      if (words.length) rows.push({ words, example: exampleP?.textContent.replace(/\s+/g, ' ').trim() ?? '' });
    }
    if (rows.length) groups.push({ section, label, rows });
  }
  return groups;
}

/** Part of speech of a sense heading: "(verb.) have a conversation" → "verb". */
export function sectionPos(section: string): string {
  return SECTION.exec(section)?.[1]?.toLowerCase() ?? '';
}

/**
 * Turn a collocate into a full phrase, e.g. for head "access":
 *   ADJ "free" → "free access" · VERB + ACCESS "give (sb)" → "give access" · ACCESS + NOUN "road" → "access road"
 *   PREP "~ to" → "access to" · for verbs, ADV "briefly" → "speak briefly", PREP "about" → "speak about"
 *   PHRASES are already complete.
 */
export function collocationPhrase(label: string, collocate: string, head: string, pos = ''): string {
  const w = collocate.replace(/\s*\([^)]*\)/g, '').replace(/\s+/g, ' ').trim();
  if (label === 'PHRASES') return collocate.trim();
  if (w.includes('~')) return w.replace(/~/g, head);
  if (label.startsWith(head.toUpperCase() + ' +')) return `${head} ${w}`;
  if (label.endsWith('+ ' + head.toUpperCase())) return `${w} ${head}`;
  if (label === 'PREP' || (label === 'ADV' && pos === 'verb')) return `${head} ${w}`;
  return `${w} ${head}`;
}

/** Words to highlight in an example: the head word in any inflection plus the collocate's content words. */
export function highlightTerms(phrase: string, head: string): string[] {
  const stop = new Set(['sb', 'sth', "sb's", 'to', 'of', 'a', 'an', 'the', 'with', 'for', 'be', 'one', "one's", 'oneself']);
  const words = phrase.toLowerCase().split(/\s+/).filter((w) => w && !stop.has(w));
  return [...new Set([head.toLowerCase(), ...words])];
}
