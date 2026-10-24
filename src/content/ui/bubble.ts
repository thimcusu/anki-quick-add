// The popup shown after a double-click. Views:
//   word view (EN→VI, with word-form tabs) · Vietnamese view (VI→EN chips)
//   collocations view (ozdic.com) · card editor (edit, then save to Anki)
import type { CardDraft, DictSection, EnEntry, MeaningGroup, PartOfSpeech, ViEntry } from '../../shared/types.ts';
import type { Settings } from '../../shared/settings.ts';
import { exampleContaining, POS_SHORT, uniqueLemmas } from '../../shared/forms.ts';
import { api, logRemote, playWord } from '../messaging.ts';
import { lookupWord } from '../lookup.ts';
import { collocationPhrase, highlightTerms, parseOzdic, sectionPos } from '../collocations.ts';
import type { ClickContext } from '../context.ts';
import { button, el } from './dom.ts';
import { SentenceEditor } from './editor.ts';
import { CSS } from './styles.ts';

type Word = EnEntry & { head: string };
// Closed in production so page scripts can't reach the bubble; the e2e test build defines it as 'open'.
declare const __SHADOW_MODE__: ShadowRootMode | undefined;
const SHADOW_MODE: ShadowRootMode = typeof __SHADOW_MODE__ === 'string' ? __SHADOW_MODE__ : 'closed';
const SHOWN_MEANINGS = 3;
const MAX_HEIGHT = 560;
const MIN_HEIGHT = 220;

interface Origin {
  ctx: ClickContext;
  surface: string; // the text that was double-clicked
  vi?: { phrase: string; entry: ViEntry }; // set when coming from a Vietnamese page
}

export class Bubble {
  private readonly host: HTMLElement;
  private readonly shadow: ShadowRoot;
  private readonly box: HTMLDivElement;
  private family: [string, PartOfSpeech][] = [];
  private word: Word | null = null;
  private clickedHead = ''; // dictionary form of the double-clicked English word

  private side: 'below' | 'above' | null = null;

  /** `anchor` is the word's Range: its position is re-read on scroll and resize. */
  private scriptSections: DictSection[] = []; // results of the user's scripts for the current word

  constructor(private readonly origin: Origin, private readonly anchor: Range, private readonly opts: { settings: Settings; css: string }) {
    this.host = el('div');
    this.shadow = this.host.attachShadow({ mode: SHADOW_MODE });
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(CSS);
    this.shadow.adoptedStyleSheets = [sheet];
    if (opts.css) {
      // The user's own CSS (options page), after ours so it wins. CSS can't run scripts.
      try { const user = new CSSStyleSheet(); user.replaceSync(opts.css); this.shadow.adoptedStyleSheets = [sheet, user]; } catch { /* invalid CSS: ignore */ }
    }
    this.box = el('div', { class: 'bubble' });
    this.shadow.append(this.box);
    document.documentElement.append(this.host);
    window.addEventListener('scroll', this.reposition, { passive: true, capture: true });
    window.addEventListener('resize', this.reposition, { passive: true });
  }

  /**
   * Fixed-position bubble next to the word: below it, or above it when the word
   * is in the lower part of the screen (the side is chosen once, so the bubble
   * doesn't jump between views). The height is capped to the free space on that
   * side, so the header and buttons always stay on screen and only the middle
   * scrolls. Content that loads later grows away from the word, never over it.
   */
  private position(): void {
    const a = this.anchor.getBoundingClientRect();
    const margin = 8;
    const vh = window.innerHeight;
    const spaceBelow = vh - a.bottom - margin * 2;
    const spaceAbove = a.top - margin * 2;
    if (!this.side) {
      this.box.style.maxHeight = `${MAX_HEIGHT}px`;
      const natural = Math.min(this.box.scrollHeight, MAX_HEIGHT);
      this.side = natural <= spaceBelow || spaceBelow >= spaceAbove ? 'below' : 'above';
    }
    const space = this.side === 'below' ? spaceBelow : spaceAbove;
    const s = this.box.style;
    if (space < MIN_HEIGHT) {
      // Tiny window or word at the very edge: use the whole viewport height.
      s.top = `${margin}px`; s.bottom = 'auto';
      s.maxHeight = `${Math.min(vh - margin * 2, MAX_HEIGHT)}px`;
    } else if (this.side === 'below') {
      s.top = `${a.bottom + margin}px`; s.bottom = 'auto';
      s.maxHeight = `${Math.min(space, MAX_HEIGHT)}px`;
    } else {
      s.bottom = `${vh - a.top + margin}px`; s.top = 'auto';
      s.maxHeight = `${Math.min(space, MAX_HEIGHT)}px`;
    }
    const width = this.box.offsetWidth;
    s.left = `${Math.max(margin, Math.min(a.left, document.documentElement.clientWidth - width - margin))}px`;
  }

  private readonly reposition = (): void => { this.position(); };

  contains(ev: Event): boolean { return ev.composedPath().includes(this.host); }
  close(): void {
    window.removeEventListener('scroll', this.reposition, true);
    window.removeEventListener('resize', this.reposition);
    this.host.remove();
  }

  /** Render a view: fixed header, scrollable body, footer pinned to the bottom. */
  private show(view: { header: Node; body: (Node | false | null | undefined)[]; footer?: Node | null }): void {
    const body = el('div', { class: 'body' }, ...view.body.filter((c): c is Node => !!c));
    this.box.replaceChildren(el('div', { class: 'header' }, view.header), body, view.footer ? el('div', { class: 'footer' }, view.footer) : '');
    this.position();
  }

  /** Header actions: "turn off on this site" and close. */
  private closeButton(): HTMLElement {
    return el('span', { class: 'actions' },
      button('⊘', () => { this.confirmBlock(); }, 'icon', `Turn off on ${location.hostname}`),
      button('✕', () => { this.close(); }, 'icon', 'Close (Esc)'));
  }

  /** Ask before adding this site to the blocklist (undo: toolbar icon → "Unblock", or the options page). */
  private confirmBlock(): void {
    const msg = el('span', { class: 'msg' });
    const back = (): void => { if (this.word) this.showWord(this.word, this.family); else this.showVietnamese(); };
    const block = button('Turn off', () => {
      block.disabled = true;
      api.blockSite().then((res) => {
        if (res.ok) { this.close(); return; }
        msg.className = 'msg err'; msg.textContent = res.msg; block.disabled = false;
      }, () => { msg.className = 'msg err'; msg.textContent = 'No answer from the extension.'; block.disabled = false; });
    }, 'btn primary');
    this.show({
      header: el('div', { class: 'row head' }, el('span', { class: 'word' }, location.hostname), el('span', { class: 'spacer' }),
        button('✕', () => { this.close(); }, 'icon', 'Close (Esc)')),
      body: [
        el('div', { class: 'section' }, 'Turn Anki Quick Add off on this site? Double-click and the hotkey will do nothing here.'),
        el('div', { class: 'section muted' }, 'To turn it back on: click the extension icon on this site → Unblock, or edit the list in the extension options.'),
      ],
      footer: el('div', { class: 'row' }, msg, el('span', { class: 'spacer' }), button('Cancel', back, 'btn'), block),
    });
  }


  // ---------- English word view ----------

  showWord(word: Word & { sections?: DictSection[] }, family = word.f ?? []): void {
    const sameWord = this.word?.head === word.head;
    this.word = word;
    if (!sameWord) this.scriptSections = [];
    const scriptBox = el('div');
    const fillScripts = (sections: DictSection[]): void => {
      scriptBox.replaceChildren(...sections.flatMap((sec) => this.section(sec.name, sec.entry, true)));
      this.position();
    };
    if (sameWord) fillScripts(this.scriptSections);
    else {
      void api.lookupScripts(word.head).then((sections) => {
        if (this.word !== word || !sections.length) return;
        this.scriptSections = sections;
        fillScripts(sections);
      });
    }
    if (!this.clickedHead && !this.origin.vi) this.clickedHead = word.head;
    this.family = family.length ? family : (word.f ?? []);
    const back = this.origin.vi && button(`← ${this.origin.vi.phrase}`, () => { this.showVietnamese(); }, 'link');
    this.show({
      header: el('div', {},
        back || '',
        el('div', { class: 'row head' },
          el('span', { class: 'word' }, word.head),
          el('span', { class: 'ipa' }, word.i),
          button('🔊', () => { playWord(word.head); }, 'icon', 'Play'),
          el('span', { class: 'spacer' }),
          el('span', { class: 'faint', title: 'Dictionary' }, word.sections?.[0]?.name ?? SOURCE_LABEL[word.s] ?? word.s),
          this.closeButton())),
      body: [
        ...this.dictionarySections(word),
        scriptBox,
        this.wordForms(word.head),
        this.contextLine(),
      ],
      footer: el('div', { class: 'row' },
        word.head.includes(' ') || !this.opts.settings.system.collocations ? '' : button('Collocations', () => { void this.showCollocations(); }, 'btn', 'Common word combinations from ozdic.com'),
        el('span', { class: 'spacer' }),
        button('+ Anki', () => { this.showEditor({}); }, 'btn primary')),
    });
  }

  /** One block per dictionary (with its name when there are several); one dictionary keeps the plain layout. */
  private dictionarySections(word: Word & { sections?: DictSection[] }): HTMLElement[] {
    const sections = word.sections ?? [];
    if (sections.length > 1) return sections.flatMap((sec) => this.section(sec.name, sec.entry, true));
    return this.section('', word, false);
  }

  private section(name: string, entry: Word, titled: boolean): HTMLElement[] {
    const body = [
      ...entry.g.slice(0, 4).map((g) => this.meaningGroup(g, entry.head)),
      !entry.g.length ? el('div', { class: 'section muted' }, entry.t ? 'Only technical meanings:' : 'No translation found (offline?).') : null,
      this.technical(entry, !entry.g.length),
    ].filter((x): x is HTMLElement => x !== null);
    return titled ? [el('div', { class: 'dict' }, el('div', { class: 'dict-name' }, name), ...body)] : body;
  }

  /** English word family: the current word on top, the other forms below, each with IPA, audio and an example. */
  private wordForms(current: string): HTMLElement | null {
    const lemmas = uniqueLemmas(this.family);
    if (lemmas.length < 2) return null;
    const ordered = [current, ...lemmas.filter((l) => l !== current)];
    return el('div', { class: 'section' }, el('div', { class: 'label' }, 'Word forms'),
      ...ordered.map((lemma) => this.formItem(lemma, lemma === current)));
  }

  private formItem(lemma: string, isCurrent: boolean): HTMLElement {
    const ipa = el('span', { class: 'ipa' });
    const example = el('div', { class: 'form-ex' });
    const pos = this.family.filter(([w]) => w === lemma).map(([, p]) => POS_SHORT[p] ?? p).join(' / ');
    const name = isCurrent
      ? el('b', {}, lemma)
      : button(lemma, () => { lookupWord(lemma, this.opts.settings).then((r) => { if (r.found) this.showWord(r, this.family); }, (e: unknown) => { logRemote('error', 'lookup failed', e); }); }, 'link form-link', `Show “${lemma}”`);
    api.lookupEn(lemma).then((r) => {
      if (!r.found || r.head !== lemma) return;
      ipa.textContent = r.i;
      example.textContent = dictionaryExample(r, lemma);
    }, () => undefined);
    return el('div', { class: isCurrent ? 'form-item main' : 'form-item' },
      el('div', { class: 'row' }, name, el('span', { class: 'form-pos' }, pos), ipa, button('🔊', () => { playWord(lemma); }, 'icon', 'Play')),
      example);
  }

  private meaningGroup(g: MeaningGroup, head: string): HTMLElement {
    const items = g.m.map((m, i) => el('li', { hidden: i >= SHOWN_MEANINGS }, m));
    const list = el('ul', {}, ...items);
    const more = g.m.length > SHOWN_MEANINGS && button(`+${g.m.length - SHOWN_MEANINGS} more`, () => {
      for (const li of items) li.hidden = false;
      if (more) more.remove();
    }, 'link');
    const example = head ? exampleContaining([g], head) : '';
    return el('div', { class: 'section' },
      g.p && el('div', { class: 'label' }, g.p),
      list, more || null,
      example ? el('div', { class: 'example' }, example) : null);
  }

  private technical(word: Word, open: boolean): HTMLElement | null {
    const t = word.t;
    if (!t || (!t.m.length && !t.ph.length)) return null;
    const details = el('details', {},
      el('summary', {}, `Technical (${t.m.length + t.ph.length})`),
      t.m.length ? el('div', {}, t.m.join('; ')) : null,
      t.ph.length ? el('ul', {}, ...t.ph.map(([en, vi]) => el('li', {}, el('b', {}, en), `: ${vi}`))) : null);
    details.open = open;
    return details;
  }

  private contextLine(): HTMLElement | null {
    const s = this.origin.ctx.sentence;
    return s ? el('div', { class: 'context' }, s) : null;
  }

  // ---------- Vietnamese view ----------

  showVietnamese(): void {
    const vi = this.origin.vi;
    if (!vi) return;
    const { entry } = vi;
    this.show({
      header: el('div', { class: 'row head' },
        el('span', { class: 'word' }, vi.phrase),
        el('span', { class: 'muted' }, 'Vietnamese → English'),
        el('span', { class: 'spacer' }),
        this.closeButton()),
      body: [
        el('div', { class: 'chips' }, ...entry.c.map((c) => button(c, () => { void this.pickEnglish(c); }, 'chip'))),
        el('div', { class: 'muted', attrs: { style: 'margin-top:6px' } }, 'Pick the English word you want to learn.'),
        ...(entry.g ?? []).slice(0, 3).map((g) => this.meaningGroup(g, '')),
        entry.x?.length ? el('div', { class: 'section' }, ...entry.x.slice(0, 2).map(([v, e]) => el('div', { class: 'example' }, `${v} → ${e}`))) : null,
        entry.t?.length ? el('details', {}, el('summary', {}, `Technical (${entry.t.length})`),
          ...entry.t.map(([field, items]) => el('div', {}, el('b', {}, field), `: ${items.join('; ')}`))) : null,
        this.contextLine(),
      ],
    });
  }

  private async pickEnglish(candidate: string): Promise<void> {
    const word = candidate.replace(/^to\s+/i, '');
    const r = await lookupWord(word, this.opts.settings);
    const entry: Word = r.found ? r : { head: word.toLowerCase(), i: '', g: [], s: 'lv' };
    if (!r.found && /^to\s/i.test(candidate)) entry.g = [{ p: 'verb', m: [this.origin.vi?.phrase ?? ''] }];
    this.showWord(entry);
  }

  // ---------- collocations ----------

  private async showCollocations(): Promise<void> {
    const word = this.word;
    if (!word) return;
    const header = (): HTMLElement => el('div', {},
      button('← Back', () => { this.showWord(word, this.family); }, 'link'),
      el('div', { class: 'row head' }, el('span', { class: 'word' }, word.head), el('span', { class: 'muted' }, 'collocations · ozdic.com'),
        el('span', { class: 'spacer' }), this.closeButton()));
    this.show({ header: header(), body: [el('div', { class: 'loading' }, 'Loading from ozdic.com…')] });

    const res = await api.collocations(word.head).catch((e: unknown) => {
      logRemote('error', 'collocations failed', e);
      return { ok: false as const, msg: 'Could not load collocations.' };
    });
    const groups = res.ok ? parseOzdic(res.html) : [];
    const body = groups.length
      ? groups.map((g) => el('div', {},
        el('div', { class: 'group-label' }, `${g.label} ${g.section}`.trim()),
        ...g.rows.map((row) => el('div', { class: 'colloc-row' },
          el('div', { class: 'chips' }, ...row.words.map((w) => {
            const phrase = collocationPhrase(g.label, w, word.head, sectionPos(g.section));
            return button(phrase, () => { this.useCollocation(phrase, row.example); }, 'chip');
          })),
          row.example ? el('div', { class: 'example' }, row.example) : null))))
      : [el('div', { class: 'loading' }, res.ok ? 'No collocations found for this word.' : res.msg)];
    if (this.word === word) this.show({ header: header(), body });
  }

  /** The collocation becomes the front; ozdic's example sentence replaces the page sentence. */
  private useCollocation(phrase: string, example: string): void {
    const head = this.word?.head ?? '';
    this.showEditor({ front: phrase, sentence: example || undefined, highlight: highlightTerms(phrase, head) });
  }

  // ---------- card editor ----------

  private showEditor(opts: { front?: string; sentence?: string; highlight?: string[] }): void {
    const word = this.word;
    if (!word) return;
    const vi = this.origin.vi;
    const sentence = opts.sentence ?? (vi ? '' : this.origin.ctx.sentence);
    // On the page the word may be inflected ("studied"): highlight what was actually clicked.
    const highlight = opts.highlight ?? [word.head === this.clickedHead ? this.origin.surface : word.head];
    const pos = word.g[0]?.p ?? '';

    const front = el('input', { type: 'text', value: opts.front ?? word.head });
    const answer = el('input', { type: 'text', value: defaultAnswer(word, vi?.phrase), placeholder: 'Vietnamese translation' });
    const editor = new SentenceEditor(this.shadow, sentence, highlight);
    const msg = el('span', { class: 'msg' });
    const save = button('Save to Anki', () => { void submit(); }, 'btn primary');

    const submit = async (): Promise<void> => {
      if (!front.value.trim()) { msg.className = 'msg err'; msg.textContent = 'Front text is empty.'; return; }
      save.disabled = true;
      msg.className = 'msg'; msg.textContent = 'Saving…';
      editor.autoHighlight(highlight); // typed sentences get the word highlighted automatically
      // Clamp to the limits the background validates, so long pages never get the card rejected.
      const draft: CardDraft = {
        front: clamp(front.value.trim(), 200),
        word: clamp(word.head, 80),
        ipa: clamp(word.i, 100),
        pos: clamp(pos, 40),
        answer: clamp(answer.value.trim(), 300),
        forms: this.family.slice(0, 20),
        sentenceHtml: editor.html().slice(0, 2000),
        pageUrl: location.href.length <= 2000 ? location.href : location.origin + location.pathname.slice(0, 1500),
        pageTitle: clamp(document.title, 300),
        seenAs: clamp(vi?.phrase ?? '', 200),
        seenIn: vi ? clamp(this.origin.ctx.sentence, 2000) : '',
        ...(word.s === 'ox' || word.s === 'gt' ? { fallback: { head: word.head, i: word.i, g: word.g, s: word.s, ...(word.f ? { f: word.f } : {}), ...(word.ox ? { ox: word.ox } : {}) } } : {}),
        ...(this.scriptSections.length ? { extra: this.scriptSections.slice(0, 5).map((x) => ({ name: x.name, entry: { s: 'sc' as const, head: x.entry.head, i: x.entry.i, g: x.entry.g } })) } : {}),
      };
      const slow = setTimeout(() => { msg.textContent = 'Waiting for Anki… if a pop-up appeared in Anki, click "Yes".'; }, 4000);
      const res = await api.addCard(draft);
      clearTimeout(slow);
      msg.className = res.ok ? 'msg ok' : 'msg err';
      msg.textContent = (res.ok ? '✓ ' : '⚠ ') + res.msg;
      if (res.ok) setTimeout(() => { this.close(); }, 1400);
      else save.disabled = false;
    };

    this.show({
      header: el('div', { class: 'row head' },
        button('← Back', () => { this.showWord(word, this.family); }, 'link'),
        el('span', { class: 'spacer' }),
        el('span', { class: 'muted' }, 'New card'),
        this.closeButton()),
      body: [
        field('Front', front),
        field('Answer (Vietnamese)', answer),
        field('Sentence', editor.root),
        el('div', { class: 'faint', attrs: { style: 'margin-top:6px' } },
          `The card also gets all meanings, word forms with audio and the page link. Pronunciation and audio are those of “${word.head}”.`),
      ],
      footer: el('div', { class: 'row' }, msg, el('span', { class: 'spacer' }), save),
    });
    front.focus();
  }
}

const SOURCE_LABEL: Partial<Record<Word['s'], string>> = { ox: 'Oxford', gt: 'Google Translate' };

// A <div>, not a <label>: a label would forward clicks in the sentence editor to its toolbar buttons.
function field(label: string, control: HTMLElement): HTMLElement {
  if (control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement) control.setAttribute('aria-label', label);
  return el('div', { class: 'field' }, el('span', {}, label), control);
}

const clamp = (s: string, max: number): string => (s.length <= max ? s : s.slice(0, max - 1) + '…');

/** Short translation for the Answer field: the first meaning, without notes in brackets. */
export function defaultAnswer(word: Word, viPhrase?: string): string {
  if (viPhrase) return viPhrase;
  const first = word.g[0]?.m[0] ?? word.t?.m[0] ?? '';
  const short = first.split(';')[0]?.replace(/^\([^)]*\)\s*/, '').trim() ?? '';
  return short.charAt(0).toLocaleLowerCase('vi') + short.slice(1);
}

/** A dictionary example that really contains the word (some generated ones are misspelled). */
function dictionaryExample(entry: EnEntry, lemma: string): string {
  return exampleContaining(entry.g, lemma);
}
