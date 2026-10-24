// Extension tab: general options, the dictionary list (built-in, imported files,
// user scripts — checked ones are used, top to bottom) and dictionary import.
import { el } from '../../content/ui/dom.ts';
import { type Accent, type Hotkey, HOTKEYS, hotkeyLabels, loadSettings, saveSettings, type Settings } from '../../shared/settings.ts';
import { BUILTIN, type DictRef, type Direction, loadLocal, orderedDicts, saveLocal } from '../../shared/local-settings.ts';
import { addDict, deleteDict, listDicts } from '../../shared/dictdb.ts';
import { type Candidate, scanFiles } from '../../shared/formats/importer.ts';
import { blocklistEditor, row, toggle } from '../settings-form.ts';
import { btn, hint, select, status } from './ui.ts';

const words = (n: number): string => `${n.toLocaleString()} ${n === 1 ? 'word' : 'words'}`;
const DIRECTIONS: [Direction, string][] = [['en-vi', 'English → Vietnamese'], ['vi-en', 'Vietnamese → English']];
const ACCEPT = '.ld2,.zip,.tsv,.txt,.ifo,.idx,.gz,.dict,.dz';

interface Item { id: string; name: string; kind: string; detail: string; removable: boolean }

export async function renderExtensionTab(root: HTMLElement): Promise<void> {
  const s = await loadSettings();
  const st = status();
  const save = (patch: Partial<Settings>): void => {
    saveSettings(patch).then(() => { st.ok('Saved.'); }, () => { st.err('Could not save settings.'); });
  };

  // ---------- general ----------
  const labels = hotkeyLabels();
  const hotkeys = HOTKEYS.filter((h) => labels[h]).map((h): [Hotkey, string] => [h, h === 'off' || h === 'alt+a' ? labels[h] : `${labels[h]} (press alone)`]);
  root.append(
    el('h2', {}, 'General'),
    row('Enabled', null, toggle(s.enabled, (v) => { save({ enabled: v }); })),
    row('Mouse selection', 'Double-click a word, or drag-select 2–8 words.', toggle(s.mouse, (v) => { save({ mouse: v }); })),
    row('Hotkey', 'Looks up the selection, or the word under the mouse. A single key works when pressed on its own.',
      select(hotkeys, s.hotkey, (v) => { save({ hotkey: v }); })),
    row('Pronunciation', 'Google voice and Oxford recordings.',
      select<Accent>([['us', 'American (US)'], ['uk', 'British (UK)']], s.accent, (v) => { save({ accent: v }); })),
  );

  // ---------- dictionaries ----------
  const list = el('div', { class: 'dict-list' });
  root.append(
    el('h2', {}, 'Dictionaries'),
    hint('Checked dictionaries are used from top to bottom; each one gets its own section in the bubble. The built-in dictionary can\'t be removed. Scripts are added on the Scripts tab.'),
    list,
  );
  const refresh = async (): Promise<void> => { list.replaceChildren(...await dictRows(refresh)); };
  await refresh();

  // ---------- import ----------
  const input = el('input', { type: 'file', attrs: { multiple: '', accept: ACCEPT } });
  const found = el('div', { class: 'import-list' });
  const importSt = status();
  input.addEventListener('change', () => {
    const files = [...(input.files ?? [])];
    input.value = '';
    if (!files.length) return;
    importSt.ok(`Reading ${files.length === 1 ? files[0]?.name ?? '' : `${files.length} files`}…`);
    found.replaceChildren();
    void (async () => {
      try {
        const loaded = await Promise.all(files.map(async (f) => ({ name: f.name, bytes: new Uint8Array(await f.arrayBuffer()) })));
        const { candidates, skipped } = await scanFiles(loaded);
        found.replaceChildren(...candidates.map((c) => candidateRow(c, refresh)));
        if (!candidates.length) importSt.err(`No dictionary found. ${skipped.join(' · ')}`);
        else importSt.ok(`Found ${candidates.length} ${candidates.length === 1 ? 'dictionary' : 'dictionaries'}.${skipped.length ? ` Skipped: ${skipped.join(' · ')}` : ''}`);
      } catch (e) {
        importSt.err(`Could not read the file: ${e instanceof Error ? e.message : String(e)}`);
      }
    })();
  });
  root.append(
    el('div', { class: 'import' },
      el('label', { class: 'btn primary file' }, 'Add dictionary files…', input),
      el('span', { class: 'hint' }, 'Lingoes .ld2 · StarDict (.ifo + .idx + .dict/.dz) · Yomitan .zip · TSV/TXT (word⇥meaning) · or a .zip with several of them.')),
    importSt.node, found,
  );

  // ---------- sites ----------
  root.append(el('h2', {}, 'Disabled sites'), blocklistEditor(s, save), st.node);
}

async function items(): Promise<Item[]> {
  const [local, imported] = await Promise.all([loadLocal(), listDicts().catch(() => [])]);
  return [
    { id: BUILTIN, name: 'Built-in', kind: 'Built-in', detail: 'English ⇄ Vietnamese, offline', removable: false },
    ...imported.map((d) => ({ id: d.id, name: d.name, kind: d.format, detail: `${DIRECTIONS.find(([k]) => k === d.direction)?.[1] ?? ''} · ${words(d.count)}`, removable: true })),
    ...local.scripts.map((sc) => ({ id: `script:${sc.id}`, name: sc.name, kind: 'Script', detail: `${sc.lang.toUpperCase()} · ${sc.hosts.join(', ') || 'no network'}`, removable: false })),
  ];
}

async function dictRows(refresh: () => Promise<void>): Promise<HTMLElement[]> {
  const all = await items();
  const order = orderedDicts((await loadLocal()).dicts, all.map((i) => i.id));
  const store = async (next: DictRef[]): Promise<void> => { await saveLocal({ dicts: next }); await refresh(); };
  return order.map((ref, i) => {
    const item = all.find((x) => x.id === ref.id);
    if (!item) return el('div');
    const move = (d: -1 | 1): void => {
      const next = [...order];
      const j = i + d;
      if (j < 0 || j >= next.length) return;
      [next[i], next[j]] = [next[j] as DictRef, next[i] as DictRef];
      void store(next);
    };
    const remove = item.removable && btn('Delete', () => {
      if (remove && remove.textContent !== 'Delete?') { remove.textContent = 'Delete?'; remove.classList.add('danger'); return; }
      void deleteDict(item.id).then(() => store(order.filter((d) => d.id !== item.id)));
    }, 'btn small');
    return el('div', { class: `dict-row${ref.enabled ? '' : ' off'}` },
      toggle(ref.enabled, (v) => { void store(order.map((d) => (d.id === ref.id ? { ...d, enabled: v } : d))); }),
      el('div', { class: 'dict-info' }, el('span', { class: 'dict-title' }, item.name), el('span', { class: 'badge' }, item.kind), el('span', { class: 'hint' }, item.detail)),
      btn('↑', () => { move(-1); }, 'btn small', 'Move up'),
      btn('↓', () => { move(1); }, 'btn small', 'Move down'),
      remove || '');
  });
}

function candidateRow(c: Candidate, refresh: () => Promise<void>): HTMLElement {
  const name = el('input', { type: 'text', value: c.name });
  let direction = c.direction;
  const progress = el('span', { class: 'hint' }, `${c.format} · ${words(c.headwords)}`);
  const go = btn('Import', () => {
    go.disabled = true;
    progress.textContent = 'Converting…';
    void (async () => {
      try {
        const entries = await c.build(direction);
        const dict = await addDict({ name: name.value.trim().slice(0, 80) || c.name, direction, format: c.format }, entries,
          (done, total) => { progress.textContent = `Saving ${Math.round((done / total) * 100)}%…`; });
        // Keep the current order (built-in first on a fresh install); the new dictionary goes last.
        const local = await loadLocal();
        await saveLocal({ dicts: orderedDicts(local.dicts, (await items()).map((i) => i.id)) });
        progress.textContent = `✓ Imported ${words(dict.count)}.`;
        await refresh();
      } catch (e) {
        progress.textContent = `⚠ ${e instanceof Error ? e.message : String(e)}`;
        go.disabled = false;
      }
    })();
  }, 'btn primary');
  return el('div', { class: 'candidate' },
    name, select(DIRECTIONS, direction, (v) => { direction = v; }), go, progress);
}

