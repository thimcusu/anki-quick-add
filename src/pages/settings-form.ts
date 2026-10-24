// Settings form shared by the popup (click the toolbar icon) and the options page.
import { el } from '../content/ui/dom.ts';
import { type Settings, hotkeyLabel, loadSettings, parseTags, saveSettings } from '../shared/settings.ts';
import { DEFAULT_BLOCKLIST, isBlocked, parseBlocklist, siteOf } from '../shared/blocklist.ts';

type DeckResponse = { ok: true; decks: string[] } | { ok: false; msg: string };

function toggle(checked: boolean, onChange: (v: boolean) => void): HTMLLabelElement {
  const input = el('input', { type: 'checkbox' });
  input.checked = checked;
  input.addEventListener('change', () => { onChange(input.checked); });
  return el('label', { class: 'switch' }, input, el('span'));
}

function row(label: string, hint: string | Node | null, control: HTMLElement): HTMLElement {
  return el('div', { class: 'row' }, el('div', { class: 'label' }, label, hint ? el('span', { class: 'hint' }, hint) : null), control);
}

/** URL of the tab the popup was opened on (activeTab grants it for this click only). */
async function currentTabUrl(): Promise<string> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.url ?? '';
}

/** Popup: one switch for the current site. */
async function siteRow(s: Settings, save: (patch: Partial<Settings>) => void): Promise<HTMLElement | null> {
  const url = await currentTabUrl().catch(() => '');
  const site = siteOf(url);
  if (!site) return null;
  const on = !isBlocked(url, s.blocklist);
  return row(`On ${site}`, null, toggle(on, (enable) => {
    // Turning it off adds the site; turning it on removes every pattern that matches this page.
    const list = enable ? s.blocklist.filter((p) => !isBlocked(url, [p])) : [...s.blocklist, site];
    s.blocklist = list;
    save({ blocklist: list });
  }));
}

/** Options page: the whole blocklist, one pattern per line. */
function blocklistEditor(s: Settings, save: (patch: Partial<Settings>) => void): HTMLElement {
  const area = el('textarea', { attrs: { rows: '6', spellcheck: 'false' }, placeholder: 'example.com\n*.example.com\nexample.com/chat' });
  area.value = s.blocklist.join('\n');
  area.addEventListener('change', () => {
    const list = parseBlocklist(area.value);
    area.value = list.join('\n');
    save({ blocklist: list });
  });
  const reset = el('button', { class: 'btn', type: 'button' }, 'Reset to defaults');
  reset.addEventListener('click', () => { area.value = DEFAULT_BLOCKLIST.join('\n'); save({ blocklist: DEFAULT_BLOCKLIST }); });
  return el('div', { class: 'row stack' },
    el('span', { class: 'label' }, 'Disabled on these sites',
      el('span', { class: 'hint' }, 'One per line: example.com (with subdomains), *.example.com, example.com/path or a full URL.')),
    area, el('div', { class: 'toolbar' }, reset));
}

export async function renderSettings(root: HTMLElement, page: 'popup' | 'options'): Promise<void> {
  const s: Settings = await loadSettings();
  const status = el('div', { class: 'status' });
  const save = (patch: Partial<Settings>): void => {
    saveSettings(patch).then(() => { status.className = 'status'; status.textContent = 'Saved.'; },
      () => { status.className = 'status err'; status.textContent = 'Could not save settings.'; });
  };

  const hotkey = el('span', {}, el('span', { class: 'kbd' }, hotkeyLabel()), ' works on the selected word or the word under the mouse.');

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

  root.append(
    row('Enabled', null, toggle(s.enabled, (v) => { save({ enabled: v }); })),
    ...(page === 'popup' ? [await siteRow(s, save)].filter((x): x is HTMLElement => x !== null) : []),
    row('Mouse (double-click)', hotkey, toggle(s.mouse, (v) => { save({ mouse: v }); })),
    el('div', { class: 'row stack' }, el('span', { class: 'label' }, 'Deck'), deck),
    el('div', { class: 'row stack' }, el('span', { class: 'label' }, 'Tags'), tags),
    ...(page === 'options' ? [blocklistEditor(s, save)] : []),
    status,
  );
}
