// Logs tab: Inspect mode and the log viewer.
import { el } from '../../content/ui/dom.ts';
import { loadSettings, saveSettings } from '../../shared/settings.ts';
import type { LogEntry } from '../../shared/types.ts';
import { row, toggle } from '../settings-form.ts';
import { btn } from './ui.ts';

const time = (t: number): string => { const d = new Date(t); return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`; };

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

export async function renderLogsTab(root: HTMLElement): Promise<void> {
  const s = await loadSettings();
  root.append(row('Record detailed logs', 'Errors are always recorded. Turn this on to also record every lookup and Anki request while you reproduce a problem.',
    toggle(s.inspect, (v) => { void saveSettings({ inspect: v }); })));
  const list = el('div');
  const copied = el('span', { class: 'version' });
  const refresh = (): void => { void renderLogs(list); };
  const copy = btn('Copy', () => {
    void chrome.runtime.sendMessage<object, LogEntry[]>({ type: 'getLogs' }).then(async (logs) => {
      await navigator.clipboard.writeText(logs.map((l) => `${new Date(l.t).toISOString()} ${l.level} ${l.event} ${l.detail}`).join('\n'));
      copied.textContent = 'Copied.';
    });
  });
  const clear = btn('Clear', () => { void chrome.runtime.sendMessage({ type: 'clearLogs' }).then(refresh); });
  root.append(el('div', { class: 'toolbar' }, btn('Refresh', refresh), copy, clear, copied), list);
  refresh();
  chrome.storage.onChanged.addListener((changes, area) => { if (area === 'local' && 'logs' in changes) refresh(); });
}
