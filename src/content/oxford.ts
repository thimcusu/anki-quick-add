// Parses an Oxford Learner's Dictionaries entry page. DOMParser builds an inert
// document (no scripts run, nothing is attached to the page); only text and a
// few attributes (audio URL, CEFR level) are read.
import type { EnEntry, MeaningGroup, OxfordInfo, PartOfSpeech } from '../shared/types.ts';

export interface OxfordEntry {
  head: string;
  pos: PartOfSpeech;
  ipa: string; // US if present, else UK
  audio: string; // mp3 URL (US preferred)
  level: string; // CEFR, e.g. "B2" ('' if not in the Oxford 3000/5000)
  senses: { def: string; example: string }[];
  nearby: [string, PartOfSpeech][]; // neighbouring headwords, for the word family
}

const AUDIO = /^https:\/\/www\.oxfordlearnersdictionaries\.com\/media\/english\/[a-z_]+\/[\w/.-]+\.mp3$/;
const text = (el: Element | null | undefined): string => el?.textContent.replace(/\s+/g, ' ').trim() ?? '';

export function parseOxford(html: string): OxfordEntry | null {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const entry = doc.querySelector('#entryContent .entry');
  if (!entry) return null;
  const head = text(entry.querySelector('.webtop .headword') ?? entry.querySelector('.headword'));
  if (!head) return null;

  const phonetics = entry.querySelector('.webtop .phonetics');
  const us = phonetics?.querySelector('.phons_n_am') ?? null;
  const uk = phonetics?.querySelector('.phons_br') ?? null;
  const ipa = text(us?.querySelector('.phon')) || text(uk?.querySelector('.phon'));
  const audioUrl = us?.querySelector('.sound')?.getAttribute('data-src-mp3') ?? uk?.querySelector('.sound')?.getAttribute('data-src-mp3') ?? '';

  const levelLink = [...entry.querySelectorAll('.webtop .symbols a')].map((a) => a.getAttribute('href') ?? '').find((h) => /level=[abc][12]\b/i.test(h));
  const level = /level=([abc][12])\b/i.exec(levelLink ?? '')?.[1]?.toUpperCase() ?? '';

  const senses = [...entry.querySelectorAll('li.sense')].slice(0, 6).map((s) => ({
    def: text(s.querySelector('.def')),
    example: text(s.querySelector('.examples .x')),
  })).filter((s) => s.def);

  const nearby = [...doc.querySelectorAll('.nearby a, #relatedentries a')].map((a): [string, PartOfSpeech] => {
    const pos = text(a.querySelector('pos, .pos'));
    const word = text(a).replace(new RegExp(`\\s*${pos}$`), '').trim();
    return [word.toLowerCase(), pos];
  }).filter(([w]) => /^[a-z]+$/.test(w));

  return { head: head.toLowerCase(), pos: text(entry.querySelector('.webtop .pos')), ipa, audio: AUDIO.test(audioUrl) ? audioUrl : '', level, senses, nearby };
}

/** Same-stem neighbours ("serendipity" → "serendipitous") form the word family. */
export function oxfordFamily(e: OxfordEntry): [string, PartOfSpeech][] {
  const stem = e.head.slice(0, Math.max(5, e.head.length - 3));
  const family: [string, PartOfSpeech][] = [[e.head, e.pos]];
  for (const [w, p] of e.nearby) {
    if (w.startsWith(stem) && !family.some(([fw, fp]) => fw === w && fp === p) && ['noun', 'verb', 'adjective', 'adverb'].includes(p)) family.push([w, p]);
  }
  return family.slice(0, 8);
}

/**
 * Build a dictionary-shaped entry from Oxford data plus Vietnamese translations:
 * vi[0] translates the headword, vi[1..] the definitions.
 */
export function oxfordToEntry(e: OxfordEntry, vi: string[]): EnEntry & { head: string } {
  const meanings = e.senses.map((s, i) => vi[i + 1] || s.def);
  const group: MeaningGroup = { p: e.pos, m: [vi[0], ...meanings].filter((m): m is string => !!m), x: e.senses.map((s) => s.example).filter(Boolean) };
  const ox: OxfordInfo = { audio: e.audio, level: e.level, defs: e.senses.map((s) => s.def) };
  return { head: e.head, i: e.ipa, g: group.m.length ? [group] : [], f: oxfordFamily(e), s: 'ox', ox };
}
