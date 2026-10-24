// Services tab: AnkiConnect status, deck, note type (built-in card sections or
// the user's own note type with a field mapping), tags, duplicates.
import { el } from '../../content/ui/dom.ts';
import { CARD_SECTIONS, type CardSection, DATA_KEYS, type DataKey, loadSettings, parseTags, saveSettings, type Settings } from '../../shared/settings.ts';
import { MODEL_NAME } from '../../shared/note-model.ts';
import { row, toggle } from '../settings-form.ts';
import { btn, hint, select, status } from './ui.ts';

type AnkiInfo = { ok: true; version: number; decks: string[]; models: string[] } | { ok: false; msg: string };

const SECTION_LABELS: Record<CardSection, string> = {
  ipa: 'IPA', pos: 'Part of speech', audio: 'Word audio', answer: 'Answer (typed on the front)', sentence: 'Sentence',
  sentenceAudio: 'Sentence audio', forms: 'Word forms', meanings: 'Meanings (all dictionaries)', technical: 'Technical meanings',
  explanation: 'Explanation and level (Oxford)', source: 'Article link',
};
const DATA_LABELS: Record<DataKey, string> = {
  '': '— nothing —', word: 'Word / phrase (front)', answer: 'Answer (Vietnamese)', ipa: 'IPA', pos: 'Part of speech',
  audio: 'Word audio [sound:]', sentence: 'Sentence (HTML)', sentenceAudio: 'Sentence audio [sound:]',
  meanings: 'Meanings (HTML, all dictionaries)', meaningsText: 'Meanings (plain text)', forms: 'Word forms (HTML)',
  technical: 'Technical meanings (HTML)', explanation: 'Explanation (Oxford)', level: 'CEFR level', source: 'Article link (HTML)',
  url: 'Page address', pageTitle: 'Page title',
};

/** A reasonable first mapping from field names. */
export function guessFieldMap(fields: string[]): Record<string, DataKey> {
  const rules: [RegExp, DataKey][] = [
    [/^(front|word|expression|term|vocab|english|question)/i, 'word'], [/answer|vietnam|nghĩa/i, 'answer'],
    [/ipa|reading|pronunc|phon/i, 'ipa'], [/audio|sound/i, 'audio'], [/sentence|example|context|câu/i, 'sentence'],
    [/back|meaning|definition|translation|glossary/i, 'meanings'], [/^pos$|part/i, 'pos'], [/form|family/i, 'forms'],
    [/url|source|link/i, 'source'], [/level|cefr/i, 'level'], [/explanation|note/i, 'explanation'],
  ];
  const map: Record<string, DataKey> = {};
  const taken = new Set<DataKey>();
  for (const f of fields) {
    const key = rules.find(([re, k]) => re.test(f) && !taken.has(k))?.[1] ?? '';
    map[f] = key;
    if (key) taken.add(key);
  }
  const first = fields[0];
  if (first && !taken.has('word')) map[first] = 'word';
  return map;
}

export async function renderServicesTab(root: HTMLElement): Promise<void> {
  let s = await loadSettings();
  const st = status();
  const save = async (patch: Partial<Settings>): Promise<void> => {
    try { s = await saveSettings(patch); st.ok('Saved.'); } catch { st.err('Could not save settings.'); }
  };

  const conn = el('span', { class: 'hint' }, 'Connecting to Anki…');
  const deck = el('select', {}, el('option', { value: s.deck }, s.deck));
  deck.addEventListener('change', () => { void save({ deck: deck.value }); });
  const model = el('select');
  const modelBox = el('div');

  const renderModel = async (): Promise<void> => {
    modelBox.replaceChildren();
    if (!s.noteType) {
      modelBox.append(hint(`The built-in "${MODEL_NAME}" note type (created in Anki on the first save). Untick what you don't want on new cards.`),
        el('div', { class: 'checks' }, ...CARD_SECTIONS.map((k) => {
          const box = el('input', { type: 'checkbox' });
          box.checked = s.sections[k];
          box.addEventListener('change', () => { void save({ sections: { ...s.sections, [k]: box.checked } }); });
          return el('label', { class: 'check' }, box, SECTION_LABELS[k]);
        })));
      return;
    }
    const res = await chrome.runtime.sendMessage<object, { ok: true; fields: string[] } | { ok: false; msg: string } | undefined>({ type: 'modelFieldNames', model: s.noteType });
    if (!res?.ok) { modelBox.append(el('div', { class: 'status err' }, res?.msg ?? 'Could not read the note type from Anki.')); return; }
    const known = res.fields.every((f) => f in s.fieldMap);
    if (!known) await save({ fieldMap: guessFieldMap(res.fields) });
    modelBox.append(hint('Choose what goes into each field of this note type.'),
      el('table', { class: 'map' }, ...res.fields.map((f) => el('tr', {},
        el('td', {}, f),
        el('td', {}, select(DATA_KEYS.map((k): [DataKey, string] => [k, DATA_LABELS[k]]), s.fieldMap[f] ?? '', (v) => { void save({ fieldMap: { ...s.fieldMap, [f]: v } }); }))))));
  };

  const connect = async (): Promise<void> => {
    conn.textContent = 'Connecting to Anki…';
    const info = await chrome.runtime.sendMessage<object, AnkiInfo | undefined>({ type: 'ankiInfo' });
    if (!info?.ok) {
      conn.className = 'status err';
      conn.textContent = `Not connected: ${info?.msg ?? 'no answer.'} Open Anki (with AnkiConnect) and click Retry.`;
    } else {
      conn.className = 'hint ok';
      conn.textContent = `Connected · AnkiConnect version ${info.version}`;
      deck.replaceChildren(...[...new Set([s.deck, ...info.decks])].map((d) => el('option', { value: d }, d)));
      deck.value = s.deck;
      const models = info.models.filter((m) => m !== MODEL_NAME);
      model.replaceChildren(el('option', { value: '' }, `${MODEL_NAME} (built-in design)`), ...models.map((m) => el('option', { value: m }, m)));
    }
    if (s.noteType && ![...model.options].some((o) => o.value === s.noteType)) model.append(el('option', { value: s.noteType }, s.noteType));
    model.value = s.noteType;
    await renderModel();
  };
  model.append(el('option', { value: '' }, `${MODEL_NAME} (built-in design)`));
  model.addEventListener('change', () => { void save({ noteType: model.value, fieldMap: {} }).then(renderModel); });

  const tags = el('input', { type: 'text', value: s.tags.join(', '), placeholder: 'english, vocabulary' });
  tags.addEventListener('change', () => { const list = parseTags(tags.value); tags.value = list.join(', '); void save({ tags: list }); });

  root.append(
    el('h2', {}, 'Anki'),
    row('Data export', conn, el('span', { class: 'toolbar' }, el('b', {}, 'AnkiConnect'), btn('Retry', () => { void connect(); }, 'btn small'))),
    el('div', { class: 'row stack' }, el('span', { class: 'label' }, 'Deck'), deck),
    el('div', { class: 'row stack' }, el('span', { class: 'label' }, 'Note type'), model, modelBox),
    el('div', { class: 'row stack' }, el('span', { class: 'label' }, 'Tags', el('span', { class: 'hint' }, 'Added to every card, separated by commas.')), tags),
    row('Allow duplicates', 'Off: a word that is already in your collection is not added again.', toggle(s.allowDuplicate, (v) => { void save({ allowDuplicate: v }); })),
    st.node,
  );
  await connect();
}
