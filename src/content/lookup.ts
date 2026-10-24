// English lookup with an online safety net: the offline dictionary first; if
// the word isn't there (or only has technical meanings), the Oxford Learner's
// Dictionary entry plus Google translations of the word and its definitions.
import type { EnEntry, EnLookup } from '../shared/types.ts';
import { api, logRemote } from './messaging.ts';
import { oxfordToEntry, parseOxford } from './oxford.ts';

export type Word = EnEntry & { head: string };

export async function lookupWord(surface: string): Promise<EnLookup> {
  if (/\s/.test(surface)) return lookupPhrase(surface);
  const local = await api.lookupEn(surface);
  if (local.found && local.g.length) return local;
  try {
    const res = await api.oxford(local.head);
    const ox = res.ok ? parseOxford(res.html) : null;
    if (ox) {
      const vi = await api.translate([ox.head, ...ox.senses.map((s) => s.def)].slice(0, 7));
      return { found: true, ...oxfordToEntry(ox, vi) };
    }
    if (!res.ok) logRemote('info', 'oxford fallback: no entry', `${surface}: ${res.msg}`);
  } catch (e) {
    logRemote('error', 'oxford fallback failed', e);
  }
  return local;
}

/**
 * Several words ("not necessarily", "take into account"): the offline
 * dictionary if it has the phrase, otherwise Google Translate.
 */
async function lookupPhrase(phrase: string): Promise<EnLookup> {
  const head = phrase.toLowerCase();
  const local = await api.lookupEn(head);
  if (local.found && local.head === head && local.g.length) return local;
  const [vi = ''] = await api.translate([phrase]).catch((e: unknown) => {
    logRemote('error', 'phrase translation failed', e);
    return [];
  });
  if (!vi) return { found: false, head };
  return { found: true, head, i: '', g: [{ p: 'phrase', m: [vi] }], s: 'gt' };
}
