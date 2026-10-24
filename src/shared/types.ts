// Dictionary data shapes (as stored in data/dict/**.json) and message types.

export type PartOfSpeech = string; // "noun", "verb", "adjective", "adverb", "idiom", ...

/** One part-of-speech group of Vietnamese meanings. */
export interface MeaningGroup {
  p: PartOfSpeech;
  m: string[];
  x?: string[]; // English example sentences
}

/** Technical meanings (Prodict). */
export interface TechSection {
  m: string[];
  ph: [string, string][]; // [english phrase, vietnamese]
}

/** English → Vietnamese entry. */
export interface EnEntry {
  i: string; // IPA
  g: MeaningGroup[];
  t?: TechSection;
  f?: [string, PartOfSpeech][]; // word family, first item = the word itself
  s: 'sk' | 'lv' | 'pd' | 'ox' | 'gt'; // source: offline dictionaries, 'ox' = Oxford online fallback, 'gt' = Google Translate (phrases)
  ox?: OxfordInfo;
}

/** Extra data when the entry came from the Oxford online fallback. */
export interface OxfordInfo {
  audio: string; // Oxford mp3 (real voice)
  level: string; // CEFR level
  defs: string[]; // English definitions
}

/** Vietnamese → English entry. */
export interface ViEntry {
  c: string[]; // English candidates ("chips")
  g?: MeaningGroup[];
  x?: [string, string][]; // [vietnamese, english] examples
  t?: [string, string[]][]; // [field, english terms]
}

export type EnLookup = ({ found: true } & EnEntry & { head: string }) | { found: false; head: string };
export type ViLookup = ({ found: true } & ViEntry & { head: string }) | { found: false; head: string };

/** A collocation group parsed from ozdic.com. */
export interface CollocationGroup {
  section: string; // e.g. "(noun.)"
  label: string; // e.g. "ADJ", "VERB + ACCESS", "PREP"
  rows: { words: string[]; example: string }[];
}

/**
 * What the bubble's editor sends to the background. All strings are plain
 * text except `sentenceHtml`. The background looks the word and its forms up
 * again in the dictionary to build the rest of the card (meanings, examples).
 */
export interface CardDraft {
  front: string; // word or collocation shown big on the card
  word: string; // the dictionary word (pronunciation audio, meanings, forms)
  ipa: string;
  pos: PartOfSpeech;
  answer: string; // short Vietnamese translation, editable in the bubble
  forms: [string, PartOfSpeech][]; // word family; the word itself first
  sentenceHtml: string; // limited inline HTML: <b> <i> <u> <br> and one <span data-cloze> (highlight)
  pageUrl: string;
  pageTitle: string;
  seenAs: string; // Vietnamese phrase when the word came from a Vietnamese page
  seenIn: string; // original page sentence (Vietnamese pages)
  /** Entry from the Oxford fallback when the word isn't in the offline dictionary. */
  fallback?: EnEntry & { head: string };
}

export interface Result {
  ok: boolean;
  msg: string;
}

/** Messages from content scripts (running inside web pages). */
export type ContentRequest =
  | { type: 'lookupEn'; word: string }
  | { type: 'lookupVi'; phrases: string[] }
  | { type: 'collocations'; word: string }
  | { type: 'oxford'; word: string }
  | { type: 'translate'; texts: string[] }
  | { type: 'addCard'; card: CardDraft }
  | { type: 'speak'; text: string }
  | { type: 'log'; level: LogLevel; event: string; detail: string };

/** Messages from the extension's own pages (popup, options). */
export type PageRequest =
  | { type: 'deckNames' }
  | { type: 'getLogs' }
  | { type: 'clearLogs' };

export type Request = ContentRequest | PageRequest;

export type LogLevel = 'debug' | 'info' | 'error';
export interface LogEntry {
  t: number;
  level: LogLevel;
  event: string;
  detail: string;
}

export type CollocationResponse = { ok: true; html: string } | { ok: false; msg: string };
