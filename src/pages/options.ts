// Options page (chrome://extensions → Details → Extension options):
// all settings plus Inspect mode and the log viewer.
import { el } from '../content/ui/dom.ts';
import { loadSettings, saveSettings } from '../shared/settings.ts';
import type { LogEntry } from '../shared/types.ts';
import { renderSettings } from './settings-form.ts';

const app = document.getElementById('app');

function time(t: number): string {
  const d = new Date(t);
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
}

async function renderLogs(container: HTMLElement): Promise<void> {
  const logs = (await chrome.runtime.sendMessage<object, LogEntry[] | undefined>({ type: 'getLogs' })) ?? [];
  container.replaceChildren(logs.length
    ? el('table', { class: 'logs' }, ...logs.slice().reverse().map((l) => el('tr', {},
      el('td', { class: 'time' }, time(l.t)),
      el('td', {}, el('span', { class: `lvl ${l.level}` }, l.level)),
      el('td', {}, l.event),
      el('td', { class: 'detail' }, l.detail))))
    : el('div', { class: 'empty' }, 'No log entries.'));
}

async function main(root: HTMLElement): Promise<void> {
  root.append(el('div', { class: 'title' }, el('h1', {}, 'Anki Quick Add'), el('span', { class: 'version' }, `v${chrome.runtime.getManifest().version}`)));
  root.append(el('h2', {}, 'Settings'));
  const settingsBox = el('div');
  root.append(settingsBox);
  await renderSettings(settingsBox, 'options');

  root.append(el('h2', {}, 'Inspect mode'));
  const s = await loadSettings();
  const inspect = el('input', { type: 'checkbox' });
  inspect.checked = s.inspect;
  inspect.addEventListener('change', () => { void saveSettings({ inspect: inspect.checked }); });
  root.append(el('div', { class: 'row' },
    el('div', { class: 'label' }, 'Record detailed logs',
      el('span', { class: 'hint' }, 'Errors are always recorded. Turn this on to also record every lookup and Anki request while you reproduce a problem.')),
    el('label', { class: 'switch' }, inspect, el('span'))));

  const list = el('div');
  const copyStatus = el('span', { class: 'version' });
  const refresh = (): void => { void renderLogs(list); };
  const copy = el('button', { class: 'btn', type: 'button' }, 'Copy');
  copy.addEventListener('click', () => {
    void chrome.runtime.sendMessage<object, LogEntry[]>({ type: 'getLogs' }).then(async (logs) => {
      await navigator.clipboard.writeText(logs.map((l) => `${new Date(l.t).toISOString()} ${l.level} ${l.event} ${l.detail}`).join('\n'));
      copyStatus.textContent = 'Copied.';
    });
  });
  const clear = el('button', { class: 'btn', type: 'button' }, 'Clear');
  clear.addEventListener('click', () => { void chrome.runtime.sendMessage({ type: 'clearLogs' }).then(refresh); });
  const reload = el('button', { class: 'btn', type: 'button' }, 'Refresh');
  reload.addEventListener('click', refresh);
  root.append(el('h2', {}, 'Logs'), el('div', { class: 'toolbar' }, reload, copy, clear, copyStatus), list);
  refresh();
  chrome.storage.onChanged.addListener((changes, area) => { if (area === 'local' && 'logs' in changes) refresh(); });
}

if (app) void main(app);
