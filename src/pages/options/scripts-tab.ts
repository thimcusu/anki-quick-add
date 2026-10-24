// Scripts tab: built-in online helpers ("system scripts"), the user's own
// dictionary scripts (JavaScript or TypeScript, run in a sandbox) and custom CSS.
import { transform } from 'sucrase';
import { el } from '../../content/ui/dom.ts';
import { loadSettings, saveSettings, type SystemScripts } from '../../shared/settings.ts';
import { loadLocal, MAX_CSS, MAX_SCRIPT, saveLocal, scriptMeta, type UserScript } from '../../shared/local-settings.ts';
import { row, toggle } from '../settings-form.ts';
import { btn, hint, select, status } from './ui.ts';

const SYSTEM: [keyof SystemScripts, string, string][] = [
  ['oxford', 'Oxford Learner\'s Dictionaries', 'For English words that aren\'t in your offline dictionaries: definitions, IPA, real-voice audio, CEFR level.'],
  ['translate', 'Google Translate', 'Vietnamese for phrases (2–8 words) and for Oxford definitions.'],
  ['collocations', 'Collocations (ozdic.com)', 'The "Collocations" button in the bubble.'],
];

export const TEMPLATE = `// @name My dictionary
// @host https://example.com
// lookup(word, api) returns { ipa?, groups: [{ pos?, meanings: [...], examples?: [...] }] } or null.
// api.fetch(url) → text · api.json(url) → parsed JSON · api.html(text) → Document (querySelector…)
// Only the sites listed with "// @host" can be fetched.

async function lookup(word, api) {
  const doc = api.html(await api.fetch(\`https://example.com/search?q=\${encodeURIComponent(word)}\`));
  const meanings = [...doc.querySelectorAll('.meaning')].map((e) => e.textContent.trim());
  return meanings.length ? { groups: [{ meanings }] } : null;
}
`;

export const EXAMPLE = `// @name Free Dictionary (English definitions)
// @host https://api.dictionaryapi.dev
// Example script (TypeScript): English definitions from dictionaryapi.dev (Wiktionary data, CC BY-SA).

interface Definition { definition: string; example?: string }
interface Meaning { partOfSpeech: string; definitions: Definition[] }
interface Entry { phonetic?: string; meanings: Meaning[] }

async function lookup(word: string, api: { json(url: string): Promise<unknown> }) {
  const data = await api.json(\`https://api.dictionaryapi.dev/api/v2/entries/en/\${encodeURIComponent(word)}\`);
  if (!Array.isArray(data) || !data.length) return null;
  const entry = data[0] as Entry;
  return {
    ipa: entry.phonetic ?? '',
    groups: entry.meanings.map((m) => ({
      pos: m.partOfSpeech,
      meanings: m.definitions.slice(0, 4).map((d) => d.definition),
      examples: m.definitions.map((d) => d.example ?? '').filter(Boolean).slice(0, 2),
    })),
  };
}
`;

/** TypeScript → JavaScript (types removed); throws with the line number on syntax errors. */
export function compileScript(source: string, lang: 'js' | 'ts'): string {
  return transform(source, { transforms: lang === 'ts' ? ['typescript'] : [], disableESTransforms: true }).code;
}

export async function renderScriptsTab(root: HTMLElement): Promise<void> {
  const s = await loadSettings();
  const st = status();

  root.append(el('h2', {}, 'System scripts'), hint('Built-in online helpers. Turn them off to stay fully offline.'));
  for (const [key, label, text] of SYSTEM) {
    root.append(row(label, text, toggle(s.system[key], (v) => {
      void loadSettings().then((cur) => saveSettings({ system: { ...cur.system, [key]: v } })).then(() => { st.ok('Saved.'); });
    })));
  }

  const list = el('div', { class: 'script-list' });
  const editorBox = el('div');
  root.append(
    el('h2', {}, 'User scripts'),
    hint('Your own dictionaries written in JavaScript or TypeScript. They run in an isolated sandbox and can only reach the sites they declare with "// @host" (Chrome asks you to allow them when you save). Turn them on or off and order them on the Extension tab.'),
    list,
    el('div', { class: 'toolbar' },
      btn('New script', () => { openEditor(null, TEMPLATE, 'js'); }, 'btn'),
      btn('Add example (Free Dictionary)', () => { openEditor(null, EXAMPLE, 'ts'); }, 'btn')),
    editorBox,
  );

  const refresh = async (): Promise<void> => {
    const { scripts } = await loadLocal();
    list.replaceChildren(...(scripts.length ? scripts.map((sc) => {
      const del = btn('Delete', () => {
        if (del.textContent !== 'Delete?') { del.textContent = 'Delete?'; del.classList.add('danger'); return; }
        void loadLocal().then((l) => saveLocal({ scripts: l.scripts.filter((x) => x.id !== sc.id), dicts: l.dicts.filter((d) => d.id !== `script:${sc.id}`) })).then(refresh);
      }, 'btn small');
      return el('div', { class: 'dict-row' },
        el('div', { class: 'dict-info' }, el('span', { class: 'dict-title' }, sc.name), el('span', { class: 'badge' }, sc.lang.toUpperCase()),
          el('span', { class: 'hint' }, sc.hosts.join(', ') || 'no network access')),
        btn('Edit', () => { openEditor(sc, sc.source, sc.lang); }, 'btn small'), del);
    }) : [el('div', { class: 'empty' }, 'No scripts yet.')]));
  };

  const openEditor = (script: UserScript | null, source: string, lang: 'js' | 'ts'): void => {
    let current = script;
    let language = lang;
    const area = el('textarea', { class: 'code', attrs: { rows: '18', spellcheck: 'false' } });
    area.value = source;
    const out = el('pre', { class: 'output' });
    const est = status();
    const word = el('input', { type: 'text', value: 'necessarily', placeholder: 'Test word' });
    const saveBtn = btn('Save', () => {
      const src = area.value;
      if (src.length > MAX_SCRIPT) { est.err('Script too long.'); return; }
      let code: string;
      try { code = compileScript(src, language); } catch (e) { est.err(`Syntax error: ${e instanceof Error ? e.message : String(e)}`); return; }
      const meta = scriptMeta(src);
      // Must be called directly from the click: Chrome shows its own "allow access to …" prompt.
      const asked = meta.hosts.length ? chrome.permissions.request({ origins: meta.hosts }) : Promise.resolve(true);
      void asked.then(async (granted) => {
        const id = current?.id ?? crypto.randomUUID().slice(0, 12);
        const next: UserScript = { id, name: meta.name, lang: language, source: src, code, hosts: meta.hosts, direction: meta.direction };
        const l = await loadLocal();
        await saveLocal({ scripts: [...l.scripts.filter((x) => x.id !== id), next] });
        current = next;
        if (granted) est.ok(`Saved “${meta.name}”.`);
        else est.err(`Saved, but access to ${meta.hosts.join(', ')} was not allowed — the script can't fetch until you save again and allow it.`);
        await refresh();
      }, (e: unknown) => { est.err(`Could not save: ${String(e)}`); });
    }, 'btn primary');
    const testBtn = btn('Test', () => {
      if (!current) { est.err('Save the script first.'); return; }
      out.textContent = 'Running…';
      void chrome.runtime.sendMessage<object, { ok: boolean; section?: unknown; error?: string } | undefined>({ type: 'testScript', scriptId: current.id, word: word.value.trim() })
        .then((r) => { out.textContent = r?.ok ? JSON.stringify(r.section ?? 'No result (null) — nothing to show for this word.', null, 2) : `Error: ${r?.error ?? 'no answer'}`; },
          (e: unknown) => { out.textContent = `Error: ${String(e)}`; });
    }, 'btn');
    editorBox.replaceChildren(
      el('h2', {}, script ? `Edit: ${script.name}` : 'New script'),
      el('div', { class: 'toolbar' }, el('span', { class: 'label' }, 'Language'),
        select<'js' | 'ts'>([['js', 'JavaScript'], ['ts', 'TypeScript']], language, (v) => { language = v; })),
      area,
      el('div', { class: 'toolbar' }, saveBtn, word, testBtn, btn('Close', () => { editorBox.replaceChildren(); }, 'btn')),
      est.node, out);
    area.focus();
  };

  // ---------- custom CSS ----------
  const css = el('textarea', { class: 'code', attrs: { rows: '8', spellcheck: 'false' }, placeholder: '.bubble { width: 460px; font-size: 15px; }\n.word { color: #7c3aed; }' });
  css.value = (await loadLocal()).customCss;
  const cssSt = status();
  root.append(
    el('h2', {}, 'Custom CSS'),
    hint('Styles the lookup bubble on web pages (after the built-in styles). Main classes: .bubble .header .body .footer .word .ipa .label .section .example .dict .btn .chip'),
    css,
    el('div', { class: 'toolbar' }, btn('Save CSS', () => {
      if (css.value.length > MAX_CSS) { cssSt.err('Too long (max 50,000 characters).'); return; }
      void saveLocal({ customCss: css.value }).then(() => { cssSt.ok('Saved — applies to bubbles opened from now on.'); });
    }, 'btn primary')),
    cssSt.node, st.node,
  );
  await refresh();
}
