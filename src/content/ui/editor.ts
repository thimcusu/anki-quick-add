// Sentence editor with Anki-style formatting: bold, italic, underline,
// highlight (the learned word or collocation, shown in the accent colour on
// the card) and clear formatting. Shortcuts mirror Anki: Cmd/Ctrl+B/I/U, and
// Cmd/Ctrl+Shift+H for highlight.
import { el } from './dom.ts';

type Tag = 'b' | 'i' | 'u';
const TAG_OF: Record<string, Tag> = { B: 'b', STRONG: 'b', I: 'i', EM: 'i', U: 'u' };

const escapeText = (s: string): string => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escapeRe = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Regex for a word in any inflection: "study" also matches "studying", "studies", "studied". */
export function inflectionPattern(term: string): RegExp {
  const t = term.toLowerCase();
  const stem = t.length > 4 ? t.replace(/(e|y|ies|es|s)$/, '') : t;
  return new RegExp(`\\b${escapeRe(stem)}[a-z]*\\b`, 'i');
}

export class SentenceEditor {
  readonly root: HTMLElement;
  private readonly box: HTMLDivElement;

  constructor(private readonly shadow: ShadowRoot, sentence: string, highlightTerms: string[]) {
    this.box = el('div', { class: 'editor', attrs: { contenteditable: 'true', spellcheck: 'true', 'data-placeholder': 'Type or paste an English sentence…' } });
    this.box.textContent = sentence;
    this.autoHighlight(highlightTerms);
    this.box.addEventListener('keydown', (ev) => { this.onKey(ev); });
    this.box.addEventListener('paste', (ev) => { this.onPaste(ev); });

    const tool = (label: string, title: string, action: () => void, cls = ''): HTMLButtonElement => {
      const b = el('button', { class: `tool ${cls}`, type: 'button', title }, label);
      // mousedown keeps the text selection inside the editor
      b.addEventListener('mousedown', (ev) => { ev.preventDefault(); if (ev.isTrusted) action(); });
      return b;
    };
    const toolbar = el('div', { class: 'toolbar' },
      tool('B', 'Bold (⌘B)', () => { this.wrap('b'); }),
      tool('I', 'Italic (⌘I)', () => { this.wrap('i'); }),
      tool('U', 'Underline (⌘U)', () => { this.wrap('u'); }),
      tool('▌Highlight', 'Highlight the word or collocation (⌘⇧H). Click again inside a highlight to remove it.', () => { this.toggleHighlight(); }, 'cloze'),
      tool('⌫ Clear', 'Remove all formatting and highlights', () => { this.clearFormatting(); }),
    );
    this.root = el('div', {}, toolbar, this.box);
  }

  /** If nothing is highlighted yet, highlight the first match of each term. */
  autoHighlight(terms: string[]): void {
    if (this.hasHighlight) return;
    for (const term of terms) {
      if (!term) continue;
      const re = inflectionPattern(term);
      const walker = document.createTreeWalker(this.box, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (node.parentElement?.closest('[data-cloze]')) continue;
        const m = re.exec(node.textContent ?? '');
        if (!m) continue;
        const range = document.createRange();
        range.setStart(node, m.index);
        range.setEnd(node, m.index + m[0].length);
        const span = el('span', { data: { cloze: '' } });
        span.append(range.extractContents());
        range.insertNode(span);
        break;
      }
    }
    this.box.normalize();
  }

  get isEmpty(): boolean { return !this.box.textContent.trim(); }
  get hasHighlight(): boolean { return !!this.box.querySelector('[data-cloze]'); }

  /** Serialize to the limited inline HTML the background accepts. */
  html(): string {
    const walk = (node: Node): string => {
      if (node.nodeType === Node.TEXT_NODE) return escapeText(node.textContent ?? '').replace(/\u00a0/g, ' ');
      if (!(node instanceof HTMLElement)) return '';
      const inner = [...node.childNodes].map(walk).join('');
      if (node.tagName === 'BR') return '<br>';
      if (node.hasAttribute('data-cloze')) return `<span data-cloze>${inner.replace(/<\/?span[^>]*>/g, '')}</span>`;
      const tag = TAG_OF[node.tagName];
      return tag ? `<${tag}>${inner}</${tag}>` : inner;
    };
    return [...this.box.childNodes].map(walk).join('').trim();
  }

  private selectionRange(): Range | null {
    const range = this.currentRange();
    if (!range || range.collapsed || !this.box.contains(range.commonAncestorContainer)) return null;
    return range;
  }

  /** The selection inside our shadow root (document.getSelection() would only see the host). */
  private currentRange(): Range | null {
    const shadowSel = (this.shadow as ShadowRoot & { getSelection?: () => Selection | null }).getSelection?.();
    if (shadowSel && shadowSel.rangeCount > 0) return shadowSel.getRangeAt(0);
    const sel = document.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    const composed = typeof sel.getComposedRanges === 'function' ? sel.getComposedRanges({ shadowRoots: [this.shadow] }).at(0) : undefined;
    if (!composed) return sel.getRangeAt(0);
    const range = document.createRange();
    range.setStart(composed.startContainer, composed.startOffset);
    range.setEnd(composed.endContainer, composed.endOffset);
    return range;
  }

  private wrap(tag: Tag | 'cloze'): void {
    const range = this.selectionRange();
    if (!range) return;
    const wrapper = tag === 'cloze' ? el('span', { data: { cloze: '' } }) : document.createElement(tag);
    wrapper.append(range.extractContents());
    range.insertNode(wrapper);
    this.box.normalize();
  }

  private unwrap(node: Element): void {
    node.replaceWith(...node.childNodes);
  }

  private toggleHighlight(): void {
    const range = this.currentRange();
    const start = range?.startContainer;
    const inside = (start instanceof Element ? start : start?.parentElement)?.closest('[data-cloze]');
    if (inside && this.box.contains(inside)) { this.unwrap(inside); this.box.normalize(); return; }
    this.wrap('cloze');
  }

  private clearFormatting(): void {
    for (const node of this.box.querySelectorAll('b, strong, i, em, u, font, span')) this.unwrap(node);
    this.box.normalize();
  }

  private onKey(ev: KeyboardEvent): void {
    if (ev.key === 'Enter') { ev.preventDefault(); return; } // one sentence per card
    if (!(ev.metaKey || ev.ctrlKey)) return;
    const key = ev.key.toLowerCase();
    if (ev.shiftKey && key === 'h') { ev.preventDefault(); this.toggleHighlight(); return; }
    const tag = ({ b: 'b', i: 'i', u: 'u' } as Record<string, Tag | undefined>)[key];
    if (tag && !ev.shiftKey) { ev.preventDefault(); this.wrap(tag); }
  }

  /** Paste as plain text only. */
  private onPaste(ev: ClipboardEvent): void {
    ev.preventDefault();
    const text = (ev.clipboardData?.getData('text/plain') ?? '').replace(/\s+/g, ' ');
    const range = this.currentRange();
    if (!range || !this.box.contains(range.commonAncestorContainer)) { this.box.append(text); return; }
    range.deleteContents();
    range.insertNode(document.createTextNode(text));
    range.collapse(false);
  }
}
