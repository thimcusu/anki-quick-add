// Service worker: routes validated messages. Content scripts (inside web pages)
// and the extension's own pages (popup, options) get different, separate APIs.
import { isContentRequest, isPageRequest } from '../shared/validate.ts';
import type { ContentRequest, PageRequest } from '../shared/types.ts';
import { lookupEn, lookupVi } from './dictionary.ts';
import { fetchCollocations } from './collocations.ts';
import { fetchOxford, translateToVi } from './online.ts';
import { addCard } from './card.ts';
import { anki, AnkiError } from './anki.ts';
import { clearLogs, getLogs, log } from './log.ts';

function handleContent(msg: ContentRequest): Promise<unknown> | undefined {
  switch (msg.type) {
    case 'lookupEn': return lookupEn(msg.word);
    case 'lookupVi': return lookupVi(msg.phrases);
    case 'collocations': return fetchCollocations(msg.word);
    case 'oxford': return fetchOxford(msg.word);
    case 'translate': return translateToVi(msg.texts);
    case 'addCard': return addCard(msg.card);
    case 'speak':
      void chrome.tts.speak(msg.text, { lang: 'en-US' });
      return undefined;
    case 'log':
      log(msg.level, `content: ${msg.event}`, msg.detail);
      return undefined;
  }
}

async function deckNames(): Promise<{ ok: true; decks: string[] } | { ok: false; msg: string }> {
  try {
    return { ok: true, decks: (await anki<string[]>('deckNames')).sort((a, b) => a.localeCompare(b)) };
  } catch (e) {
    return { ok: false, msg: e instanceof AnkiError ? e.message : 'Could not load decks.' };
  }
}

function handlePage(msg: PageRequest): Promise<unknown> {
  switch (msg.type) {
    case 'deckNames': return deckNames();
    case 'getLogs': return getLogs();
    case 'clearLogs': return clearLogs().then(() => true);
  }
}

const EXTENSION_ORIGIN = `chrome-extension://${chrome.runtime.id}/`;

chrome.runtime.onMessage.addListener((msg: unknown, sender, reply) => {
  if (sender.id !== chrome.runtime.id) return false;
  // Extension pages (popup, options — the options page runs in a tab) have our own origin;
  // content scripts report the URL of the web page they run in.
  const fromExtensionPage = sender.url?.startsWith(EXTENSION_ORIGIN) === true;
  let pending: Promise<unknown> | undefined;
  if (fromExtensionPage && isPageRequest(msg)) {
    pending = handlePage(msg);
  } else if (!fromExtensionPage && sender.tab && isContentRequest(msg)) {
    pending = handleContent(msg);
  } else {
    log('error', 'rejected message', { from: sender.tab ? 'tab' : sender.url, type: (msg as { type?: unknown } | null)?.type });
    reply({ ok: false, msg: 'Invalid request.' });
    return false;
  }
  if (!pending) { reply(undefined); return false; }
  pending.then(reply, (e: unknown) => {
    log('error', 'handler crashed', e);
    reply({ ok: false, msg: 'Internal error — see logs in the extension options.' });
  });
  return true; // async reply
});
