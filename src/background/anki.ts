// Minimal AnkiConnect client. Only the actions listed here can ever be sent,
// and every request has a timeout so the UI never waits forever.
import { log } from './log.ts';

const ANKI_URL = 'http://127.0.0.1:8765';
const DEFAULT_TIMEOUT_MS = 15_000;
const PERMISSION_TIMEOUT_MS = 60_000; // the user has to click "Yes" in Anki

type Action =
  | 'version'
  | 'modelFieldNames'
  | 'requestPermission'
  | 'deckNames'
  | 'modelNames'
  | 'createDeck'
  | 'canAddNotesWithErrorDetail'
  | 'addNote'
  | 'storeMediaFile'
  | 'createModel'
  | 'updateModelTemplates'
  | 'updateModelStyling';

export class AnkiError extends Error {}

/** AnkiConnect's raw errors, rewritten as something the user can act on. */
function friendly(error: string): string {
  if (/close the affected editor/i.test(error)) {
    return 'Anki has an editing window open (Browse, Add, Edit or Cards). Close it in Anki, then save again.';
  }
  return error;
}

export async function anki<T>(action: Action, params: Record<string, unknown> = {}, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<T> {
  const started = Date.now();
  let res: Response;
  try {
    res = await fetch(ANKI_URL, {
      method: 'POST',
      body: JSON.stringify({ action, version: 6, params }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (e) {
    const timedOut = e instanceof DOMException && e.name === 'TimeoutError';
    log('error', `anki.${action} failed`, timedOut ? `timeout after ${timeoutMs} ms` : e);
    throw new AnkiError(timedOut
      ? (action === 'requestPermission'
        ? 'Anki is waiting for you: click "Yes" in the AnkiConnect pop-up in Anki, then save again.'
        : `Anki did not answer within ${Math.round(timeoutMs / 1000)} s.`)
      : 'Anki is not open (or the AnkiConnect add-on is missing).');
  }
  const body = (await res.json()) as { result: T; error: string | null };
  log(body.error ? 'error' : 'debug', `anki.${action}`, { ms: Date.now() - started, error: body.error });
  if (body.error) throw new AnkiError(friendly(body.error));
  return body.result;
}

let permitted = false;
/** AnkiConnect shows a one-time "allow this extension?" dialog in Anki. */
export async function ensurePermission(): Promise<void> {
  if (permitted) return;
  const p = await anki<{ permission: string }>('requestPermission', {}, PERMISSION_TIMEOUT_MS);
  if (p.permission !== 'granted') throw new AnkiError('Anki refused access. Click "Yes" in the Anki pop-up and try again.');
  permitted = true;
}
