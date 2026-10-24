// Ring-buffer log in chrome.storage.local. Errors are always kept; info/debug
// entries only while Inspect mode is on. Viewed on the extension's options page.
import { loadSettings } from '../shared/settings.ts';
import type { LogEntry, LogLevel } from '../shared/types.ts';

const KEY = 'logs';
const MAX_ENTRIES = 300;
let queue: Promise<void> = Promise.resolve();

export function log(level: LogLevel, event: string, detail?: unknown): void {
  // Serialize writes so concurrent logs don't overwrite each other.
  queue = queue.then(async () => {
    if (level !== 'error' && !(await loadSettings()).inspect) return;
    const entry: LogEntry = { t: Date.now(), level, event, detail: summarize(detail) };
    const { [KEY]: existing } = await chrome.storage.local.get(KEY);
    const logs = Array.isArray(existing) ? (existing as LogEntry[]) : [];
    logs.push(entry);
    await chrome.storage.local.set({ [KEY]: logs.slice(-MAX_ENTRIES) });
  }).catch(() => { /* logging must never break the extension */ });
  if (level === 'error') console.error('[Anki Quick Add]', event, detail);
}

export async function getLogs(): Promise<LogEntry[]> {
  const { [KEY]: logs } = await chrome.storage.local.get(KEY);
  return Array.isArray(logs) ? (logs as LogEntry[]) : [];
}

export async function clearLogs(): Promise<void> {
  await chrome.storage.local.remove(KEY);
}

/** Keep log entries small and JSON-safe. */
function summarize(detail: unknown): string {
  if (detail === undefined) return '';
  if (detail instanceof Error) return `${detail.name}: ${detail.message}`;
  let text: string;
  try {
    text = typeof detail === 'string' ? detail : JSON.stringify(detail);
  } catch {
    text = '[unserializable]';
  }
  return text.length > 2000 ? text.slice(0, 2000) + '…' : text;
}
