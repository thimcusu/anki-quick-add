// User settings, stored in chrome.storage.sync (synced across the user's Chrome profiles).
import { DEFAULT_BLOCKLIST, parseBlocklist } from './blocklist.ts';

export interface Settings {
  enabled: boolean; // master switch
  mouse: boolean; // double-click opens the bubble; when off, only the hotkey works
  deck: string; // Anki deck for new cards
  tags: string[]; // tags added to every new card
  inspect: boolean; // record detailed logs (viewable on the options page)
  blocklist: string[]; // sites where the extension does nothing (see blocklist.ts)
}

export const DEFAULT_SETTINGS: Settings = {
  enabled: true,
  mouse: true,
  deck: 'Web',
  tags: ['anki-web'],
  inspect: false,
  blocklist: DEFAULT_BLOCKLIST,
};

const MAX_TAGS = 20;

/** Anki tags can't contain spaces; keep them short and printable. */
export function parseTags(input: string): string[] {
  const tags = input.split(',')
    .map((t) => t.trim().replace(/\s+/g, '_').replace(/[^\p{L}\p{N}_:\-.]/gu, ''))
    .filter((t) => t.length > 0 && t.length <= 60);
  return [...new Set(tags)].slice(0, MAX_TAGS);
}

/** Coerce anything read from storage into valid settings. */
export function normalizeSettings(raw: unknown): Settings {
  const r = (typeof raw === 'object' && raw !== null ? raw : {}) as Partial<Record<keyof Settings, unknown>>;
  const bool = (v: unknown, d: boolean): boolean => (typeof v === 'boolean' ? v : d);
  const deck = typeof r.deck === 'string' && r.deck.trim() && r.deck.length <= 200 ? r.deck.trim() : DEFAULT_SETTINGS.deck;
  const tags = Array.isArray(r.tags) ? parseTags(r.tags.filter((t): t is string => typeof t === 'string').join(',')) : DEFAULT_SETTINGS.tags;
  return {
    enabled: bool(r.enabled, DEFAULT_SETTINGS.enabled),
    mouse: bool(r.mouse, DEFAULT_SETTINGS.mouse),
    deck,
    tags,
    inspect: bool(r.inspect, DEFAULT_SETTINGS.inspect),
    blocklist: Array.isArray(r.blocklist) ? parseBlocklist(r.blocklist.filter((t): t is string => typeof t === 'string')) : DEFAULT_SETTINGS.blocklist,
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
/** Option+A on macOS, Alt+A elsewhere (Ctrl+A is "select all"). */
export const hotkeyLabel = (): string => (isMac() ? '⌥ Option + A' : 'Alt + A');
