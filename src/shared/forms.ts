// Word-family helpers shared by the bubble and the card builder.
import type { PartOfSpeech } from './types.ts';

export const FORM_ROWS: { pos: PartOfSpeech; label: string }[] = [
  { pos: 'noun', label: 'noun' },
  { pos: 'verb', label: 'verb' },
  { pos: 'adjective', label: 'adj' },
  { pos: 'adverb', label: 'adverb' },
];

export const POS_SHORT: Record<string, string> = { noun: 'n', verb: 'v', adjective: 'adj', adverb: 'adv' };

/**
 * True if the sentence contains the word or a regular inflection of it
 * ("study" → studies/studied/studying). Filters out the dictionary's generated
 * examples that misspell the word ("intellectualli").
 */
export function containsWord(sentence: string, lemma: string): boolean {
  const w = lemma.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const base = w.replace(/(e|y)$/, '');
  return new RegExp(`\\b(${w}|${base})(s|es|d|ed|ing|ies|ied|er|est|ly|'s)?\\b`, 'i').test(sentence);
}

/** First dictionary example (across meaning groups) that really contains the word. */
export function exampleContaining(groups: { x?: string[] }[], lemma: string): string {
  for (const g of groups) {
    const x = g.x?.find((s) => containsWord(s, lemma));
    if (x) return x;
  }
  return '';
}

/** Unique lemmas in order (a word can appear as noun and verb). */
export function uniqueLemmas(forms: [string, PartOfSpeech][]): string[] {
  return [...new Set(forms.map(([w]) => w))];
}

export function posOf(forms: [string, PartOfSpeech][], lemma: string): PartOfSpeech[] {
  return forms.filter(([w]) => w === lemma).map(([, p]) => p);
}
