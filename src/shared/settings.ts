// User settings, stored in chrome.storage.sync (synced across the user's Chrome profiles).
// Bigger, device-specific data (dictionary order, user scripts, custom CSS) lives in
// chrome.storage.local — see local-settings.ts.
import { DEFAULT_BLOCKLIST, parseBlocklist } from './blocklist.ts';
import { DEFAULTS } from './defaults.ts';

/** How the keyboard opens the bubble on the word under the mouse (or the selection). */
export const HOTKEYS = ['alt+a', 'shift', 'ctrl', 'alt', 'meta', 'off'] as const;
export type Hotkey = (typeof HOTKEYS)[number];

export type Accent = 'us' | 'uk';

/** Parts of the built-in "EN-VI Vocab" card that can be switched off. */
export const CARD_SECTIONS = ['ipa', 'pos', 'audio', 'answer', 'sentence', 'sentenceAudio', 'forms', 'meanings', 'technical', 'explanation', 'source'] as const;
export type CardSection = (typeof CARD_SECTIONS)[number];

/** Data the extension can put into a field of the user's own note type. */
export const DATA_KEYS = [
  '', 'word', 'answer', 'ipa', 'pos', 'audio', 'sentence', 'sentenceAudio', 'meanings', 'meaningsText',
  'forms', 'technical', 'explanation', 'level', 'source', 'url', 'pageTitle',
] as const;
export type DataKey = (typeof DATA_KEYS)[number];

/** Built-in online helpers ("system scripts"). */
export interface SystemScripts {
  oxford: boolean; // Oxford Learner's Dictionaries for words missing offline
  translate: boolean; // Google Translate for phrases and Oxford definitions
  collocations: boolean; // ozdic.com collocations button
}

export interface Settings {
  enabled: boolean; // master switch
  mouse: boolean; // double-click / drag-select opens the bubble
  hotkey: Hotkey;
  accent: Accent; // pronunciation audio
  deck: string; // Anki deck for new cards
  tags: string[]; // tags added to every new card
  noteType: string; // '' = the built-in "EN-VI Vocab"; otherwise the user's note type
  sections: Record<CardSection, boolean>; // built-in note type only
  fieldMap: Record<string, DataKey>; // user's note type: Anki field → data
  allowDuplicate: boolean;
  system: SystemScripts;
  inspect: boolean; // record detailed logs (viewable on the options page)
  blocklist: string[]; // sites where the extension does nothing (see blocklist.ts)
}

export const DEFAULT_SETTINGS: Settings = {
  enabled: true,
  mouse: true,
  hotkey: 'alt+a',
  accent: 'us',
  deck: DEFAULTS.deck,
  tags: DEFAULTS.tags,
  noteType: '',
  sections: Object.fromEntries(CARD_SECTIONS.map((k) => [k, true])) as Record<CardSection, boolean>,
  fieldMap: {},
  allowDuplicate: false,
  system: { oxford: true, translate: true, collocations: true },
  inspect: false,
  blocklist: DEFAULT_BLOCKLIST,
};

const MAX_TAGS = 20;
const MAX_FIELDS = 40;

/** Anki tags can't contain spaces; keep them short and printable. */
export function parseTags(input: string): string[] {
  const tags = input.split(',')
    .map((t) => t.trim().replace(/\s+/g, '_').replace(/[^\p{L}\p{N}_:\-.]/gu, ''))
    .filter((t) => t.length > 0 && t.length <= 60);
  return [...new Set(tags)].slice(0, MAX_TAGS);
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const oneOf = <T extends string>(v: unknown, list: readonly T[], d: T): T => (list.includes(v as T) ? (v as T) : d);
const bool = (v: unknown, d: boolean): boolean => (typeof v === 'boolean' ? v : d);
const name = (v: unknown, d: string, max = 200): string => (typeof v === 'string' && v.trim().length <= max ? v.trim() : d);

/** Coerce anything read from storage into valid settings. */
export function normalizeSettings(raw: unknown): Settings {
  const r = isObj(raw) ? raw : {};
  const D = DEFAULT_SETTINGS;
  const sections = isObj(r.sections) ? r.sections : {};
  const system = isObj(r.system) ? r.system : {};
  const fieldMap: Record<string, DataKey> = {};
  if (isObj(r.fieldMap)) {
    for (const [field, key] of Object.entries(r.fieldMap).slice(0, MAX_FIELDS)) {
      if (field.length <= 100 && DATA_KEYS.includes(key as DataKey)) fieldMap[field] = key as DataKey;
    }
  }
  return {
    enabled: bool(r.enabled, D.enabled),
    mouse: bool(r.mouse, D.mouse),
    hotkey: oneOf(r.hotkey, HOTKEYS, D.hotkey),
    accent: oneOf(r.accent, ['us', 'uk'] as const, D.accent),
    deck: name(r.deck, D.deck) || D.deck,
    tags: Array.isArray(r.tags) ? parseTags(r.tags.filter((t): t is string => typeof t === 'string').join(',')) : D.tags,
    noteType: name(r.noteType, D.noteType),
    sections: Object.fromEntries(CARD_SECTIONS.map((k) => [k, bool(sections[k], true)])) as Record<CardSection, boolean>,
    fieldMap,
    allowDuplicate: bool(r.allowDuplicate, D.allowDuplicate),
    system: { oxford: bool(system.oxford, true), translate: bool(system.translate, true), collocations: bool(system.collocations, true) },
    inspect: bool(r.inspect, D.inspect),
    blocklist: Array.isArray(r.blocklist) ? parseBlocklist(r.blocklist.filter((t): t is string => typeof t === 'string')) : D.blocklist,
  };
}

export async function loadSettings(): Promise<Settings> {
  const raw = await chrome.storage.sync.get(Object.keys(DEFAULT_SETTINGS));
  return normalizeSettings(raw);
}

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  const next = normalizeSettings({ ...(await loadSettings()), ...patch });
  await chrome.storage.sync.set(next);
  return next;
}

/** Call `fn` with the current settings now and whenever they change. */
export function watchSettings(fn: (s: Settings) => void): void {
  void loadSettings().then(fn);
  chrome.storage.onChanged.addListener((_changes, area) => {
    if (area === 'sync') void loadSettings().then(fn);
  });
}

export const isMac = (): boolean => /Mac|iPhone|iPad/.test(navigator.userAgent);

/** Display names of the hotkeys on this OS. The Windows key is left out: releasing it opens the Start menu. */
export function hotkeyLabels(): Record<Hotkey, string> {
  const mac = isMac();
  return {
    'alt+a': mac ? '⌥ Option + A' : 'Alt + A',
    shift: mac ? '⇧ Shift' : 'Shift',
    ctrl: mac ? '⌃ Control' : 'Ctrl',
    alt: mac ? '⌥ Option' : 'Alt',
    meta: mac ? '⌘ Command' : '',
    off: 'Off',
  };
}

export const hotkeyLabel = (h: Hotkey = 'alt+a'): string => hotkeyLabels()[h] || 'Off';

/** Google's text-to-speech voice for the chosen accent. */
export const ttsUrl = (text: string, accent: Accent): string =>
  `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${accent === 'uk' ? 'en-GB' : 'en-US'}&q=${encodeURIComponent(text)}`;
