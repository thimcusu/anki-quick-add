// Typed wrappers around chrome.runtime.sendMessage, with timeouts so the UI
// never hangs, and a remote logger that writes to the extension's log.
import type { CardDraft, CollocationResponse, EnLookup, LogLevel, Result, ViLookup } from '../shared/types.ts';

const SAVE_TIMEOUT_MS = 90_000; // includes waiting for the one-time permission click in Anki
const LOOKUP_TIMEOUT_MS = 20_000;

function send<T>(msg: object, timeoutMs = LOOKUP_TIMEOUT_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => { reject(new Error(`no answer from the extension after ${timeoutMs / 1000} s`)); }, timeoutMs);
    chrome.runtime.sendMessage(msg).then((r: T) => { clearTimeout(timer); resolve(r); }, (e: unknown) => { clearTimeout(timer); reject(e instanceof Error ? e : new Error(String(e))); });
  });
}

export function logRemote(level: LogLevel, event: string, detail: unknown = ''): void {
  const text = detail instanceof Error ? `${detail.name}: ${detail.message}` : typeof detail === 'string' ? detail : JSON.stringify(detail);
  send({ type: 'log', level, event: event.slice(0, 200), detail: text.slice(0, 2000) }).catch(() => { /* ignore */ });
}

/** Never rejects: always resolves to a Result the UI can show. */
async function addCard(card: CardDraft): Promise<Result> {
  try {
    const r = await send<Result | undefined>({ type: 'addCard', card }, SAVE_TIMEOUT_MS);
    if (r && typeof r.ok === 'boolean' && typeof r.msg === 'string') return r;
    logRemote('error', 'addCard: empty response');
    return { ok: false, msg: 'The extension rejected the card (see logs).' };
  } catch (e) {
    logRemote('error', 'addCard: no response', e);
    return { ok: false, msg: 'No answer from the extension. Reload the page and try again.' };
  }
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

/** Lookups: a missing or malformed answer becomes "not found" instead of a crash. */
async function lookupEn(word: string): Promise<EnLookup> {
  const r = await send<unknown>({ type: 'lookupEn', word });
  return isObject(r) && typeof r.found === 'boolean' ? (r as EnLookup) : { found: false, head: word.toLowerCase() };
}

async function lookupVi(phrases: string[]): Promise<ViLookup> {
  const r = await send<unknown>({ type: 'lookupVi', phrases });
  return isObject(r) && typeof r.found === 'boolean' ? (r as ViLookup) : { found: false, head: phrases.at(-1) ?? '' };
}

async function collocations(word: string): Promise<CollocationResponse> {
  const r = await send<unknown>({ type: 'collocations', word });
  return isObject(r) && typeof r.ok === 'boolean' ? (r as CollocationResponse) : { ok: false, msg: 'No answer from the extension.' };
}

async function oxford(word: string): Promise<{ ok: true; html: string; url: string } | { ok: false; msg: string }> {
  const r = await send<unknown>({ type: 'oxford', word });
  return isObject(r) && typeof r.ok === 'boolean' ? (r as { ok: true; html: string; url: string }) : { ok: false, msg: 'No answer from the extension.' };
}

async function translate(texts: string[]): Promise<string[]> {
  const r = await send<unknown>({ type: 'translate', texts });
  return Array.isArray(r) ? r.map((x) => (typeof x === 'string' ? x : '')) : texts.map(() => '');
}

export const api = {
  lookupEn,
  oxford,
  translate,
  lookupVi,
  collocations,
  addCard,
  speak: (text: string) => send<undefined>({ type: 'speak', text }),
};

const TTS_URL = 'https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en&q=';

/** Play Google's voice; fall back to the system voice if the page blocks media. */
export function playWord(text: string): void {
  new Audio(TTS_URL + encodeURIComponent(text)).play().catch(() => { void api.speak(text).catch(() => undefined); });
}
