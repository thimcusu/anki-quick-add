// Popup settings (click the toolbar icon) and form pieces shared with the options page.
import { el } from '../content/ui/dom.ts';
import { type Settings, hotkeyLabel, loadSettings, parseTags, saveSettings } from '../shared/settings.ts';
import { isBlocked, parseBlocklist, siteOf } from '../shared/blocklist.ts';

type DeckResponse = { ok: true; decks: string[] } | { ok: false; msg: string };

export type Save = (patch: Partial<Settings>) => void;

export function toggle(checked: boolean, onChange: (v: boolean) => void): HTMLLabelElement {
  const input = el('input', { type: 'checkbox' });
  input.checked = checked;
  input.addEventListener('change', () => { onChange(input.checked); });
  return el('label', { class: 'switch' }, input, el('span'));
}

export function row(label: string, hint: string | Node | null, control: HTMLElement): HTMLElement {
  return el('div', { class: 'row' }, el('div', { class: 'label' }, label, hint ? el('span', { class: 'hint' }, hint) : null), control);
}

/** URL of the tab the popup was opened on (activeTab grants it for this click only). */
async function currentTabUrl(): Promise<string> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.url ?? '';
}

/** Popup: a switch for the current site — off adds it to the blocklist, on removes every pattern matching this page. */
async function siteRow(s: Settings, save: (patch: Partial<Settings>) => void): Promise<HTMLElement | null> {
  const url = await currentTabUrl().catch(() => '');
  const site = siteOf(url);
  if (!site) return null;
  return row(`On ${site}`, 'Off: the extension does nothing on this site.', toggle(!isBlocked(url, s.blocklist), (on) => {
    s.blocklist = on ? s.blocklist.filter((p) => !isBlocked(url, [p])) : [...s.blocklist, site];
    save({ blocklist: s.blocklist });
  }));
}

/** Options page: the whole blocklist, one pattern per line. */
export function blocklistEditor(s: Settings, save: (patch: Partial<Settings>) => void): HTMLElement {
  const area = el('textarea', { attrs: { rows: '6', spellcheck: 'false' }, placeholder: 'example.com\n*.example.com\nexample.com/chat' });
  area.value = s.blocklist.join('\n');
  area.addEventListener('change', () => {
    const list = parseBlocklist(area.value);
    area.value = list.join('\n');
    save({ blocklist: list });
  });
  const reset = el('button', { class: 'btn', type: 'button' }, 'Clear list');
  reset.addEventListener('click', () => { area.value = ''; save({ blocklist: [] }); });
  return el('div', { class: 'row stack' },
    el('span', { class: 'label' }, 'Disabled on these sites',
      el('span', { class: 'hint' }, 'One per line: example.com (with subdomains), *.example.com, example.com/path or a full URL.')),
    area, el('div', { class: 'toolbar' }, reset));
}

export async function renderSettings(root: HTMLElement): Promise<void> {
  const s: Settings = await loadSettings();
  const status = el('div', { class: 'status' });
  const save = (patch: Partial<Settings>): void => {
    saveSettings(patch).then(() => { status.className = 'status'; status.textContent = 'Saved.'; },
      () => { status.className = 'status err'; status.textContent = 'Could not save settings.'; });
  };

  const hotkey = s.hotkey === 'off' ? 'Keyboard shortcut: off (Options).'
    : el('span', {}, el('span', { class: 'kbd' }, hotkeyLabel(s.hotkey)), ' works on the selected word or the word under the mouse.');

  // Deck list comes from Anki; keep the saved deck even if Anki is closed.
  const deck = el('select');
  deck.append(el('option', { value: s.deck }, s.deck));
  deck.addEventListener('change', () => { save({ deck: deck.value }); });
  void chrome.runtime.sendMessage<object, DeckResponse | undefined>({ type: 'deckNames' }).then((res) => {
    if (!res?.ok) { status.className = 'status err'; status.textContent = res?.msg ?? 'Could not load decks.'; return; }
    const names = res.decks.includes(s.deck) ? res.decks : [s.deck, ...res.decks];
    deck.replaceChildren(...names.map((n) => el('option', { value: n }, n)));
    deck.value = s.deck;
  }, () => { status.className = 'status err'; status.textContent = 'Could not reach the extension.'; });

  const tags = el('input', { type: 'text', value: s.tags.join(', '), placeholder: 'english, vocabulary' });
  tags.addEventListener('change', () => {
    const list = parseTags(tags.value);
    tags.value = list.join(', ');
    save({ tags: list });
  });

  const site = await siteRow(s, save);
  root.append(
    row('Enabled', null, toggle(s.enabled, (v) => { save({ enabled: v }); })),
    row('Mouse (double-click, select)', hotkey, toggle(s.mouse, (v) => { save({ mouse: v }); })),
    el('div', { class: 'row stack' }, el('span', { class: 'label' }, 'Deck'), deck),
    el('div', { class: 'row stack' }, el('span', { class: 'label' }, 'Tags'), tags),
    ...(site ? [site] : []),
    status,
  );
}
