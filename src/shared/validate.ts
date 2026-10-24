// Runtime validation for messages crossing the content-script → background
// boundary. Content scripts run inside web pages, so treat their input as
// untrusted: check types and cap lengths before using anything.
import type { CardDraft, ContentRequest, EnEntry, PageRequest } from './types.ts';

const MAX_TEXT = 2000;
const MAX_WORD = 80;

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const str = (v: unknown, max = MAX_TEXT): v is string => typeof v === 'string' && v.length <= max;

function isForms(v: unknown): v is [string, string][] {
  return Array.isArray(v) && v.length <= 20 &&
    v.every((x) => Array.isArray(x) && x.length === 2 && str(x[0], MAX_WORD) && str(x[1], 40));
}

const strList = (v: unknown, maxItems: number, maxLen: number): v is string[] =>
  Array.isArray(v) && v.length <= maxItems && v.every((s) => str(s, maxLen));

/**
 * Online entry sent along with a card (Oxford fallback, or a Google-translated
 * phrase): strict shape, small caps.
 */
export function isFallbackEntry(v: unknown): v is EnEntry & { head: string } {
  if (!isObj(v) || (v.s !== 'ox' && v.s !== 'gt') || !str(v.head, MAX_WORD) || !str(v.i, 100)) return false;
  if (!Array.isArray(v.g) || v.g.length > 2) return false;
  const groupsOk = v.g.every((g) => isObj(g) && str(g.p, 40) && strList(g.m, 8, 500) && (g.x === undefined || strList(g.x, 8, 500)));
  if (v.s === 'gt') return groupsOk && v.f === undefined && v.ox === undefined;
  const familyOk = v.f === undefined || isForms(v.f);
  const ox = v.ox;
  const oxOk = isObj(ox) && str(ox.audio, 300) && str(ox.level, 4) && strList(ox.defs, 8, 500);
  return groupsOk && familyOk && oxOk;
}

export function isCardDraft(v: unknown): v is CardDraft {
  if (!isObj(v)) return false;
  if (v.fallback !== undefined && !isFallbackEntry(v.fallback)) return false;
  return str(v.front, 200) && v.front.trim().length > 0 && str(v.word, MAX_WORD) && v.word.trim().length > 0 &&
    str(v.ipa, 100) && str(v.pos, 40) && str(v.answer, 300) && isForms(v.forms) &&
    str(v.sentenceHtml) && str(v.pageUrl) && str(v.pageTitle, 300) &&
    str(v.seenAs, 200) && str(v.seenIn);
}

export function isPageRequest(v: unknown): v is PageRequest {
  return isObj(v) && (v.type === 'deckNames' || v.type === 'getLogs' || v.type === 'clearLogs');
}

export function isContentRequest(v: unknown): v is ContentRequest {
  if (!isObj(v) || typeof v.type !== 'string') return false;
  switch (v.type) {
    case 'log':
      return (v.level === 'debug' || v.level === 'info' || v.level === 'error') && str(v.event, 200) && str(v.detail);
    case 'translate':
      return strList(v.texts, 10, 500);
    case 'lookupEn':
    case 'oxford':
    case 'collocations':
      return str(v.word, MAX_WORD) && v.word.length > 0;
    case 'blockSite':
      return Object.keys(v).length === 1;
    case 'speak':
      return str(v.text, 300);
    case 'lookupVi':
      return Array.isArray(v.phrases) && v.phrases.length <= 12 && v.phrases.every((p) => str(p, MAX_WORD));
    case 'addCard':
      return isCardDraft(v.card);
    default:
      return false;
  }
}
