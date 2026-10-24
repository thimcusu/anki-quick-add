// Device-specific settings in chrome.storage.local: dictionary order, user
// scripts and custom CSS (too big or too personal for chrome.storage.sync).

export type Direction = 'en-vi' | 'vi-en';

/** One entry of the ordered dictionary list. ids: "builtin", "file:<n>", "script:<id>". */
export interface DictRef { id: string; enabled: boolean }

export interface UserScript {
  id: string;
  name: string;
  lang: 'js' | 'ts';
  source: string; // what the user wrote
  code: string; // compiled JavaScript (same as source for JS)
  hosts: string[]; // match patterns from "// @host" lines; the only sites api.fetch may reach
  direction: Direction;
}

export interface LocalSettings {
  dicts: DictRef[];
  scripts: UserScript[];
  customCss: string;
}

export const BUILTIN = 'builtin';
export const MAX_CSS = 50_000;
export const MAX_SCRIPT = 100_000;
const MAX_SCRIPTS = 20;

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown, max: number): v is string => typeof v === 'string' && v.length <= max;

/** "https://example.com/*" style patterns; anything else is dropped. */
export function normalizeHost(input: string): string | null {
  const p = input.trim();
  const m = /^(https?):\/\/(\*\.)?([a-z0-9-]+(\.[a-z0-9-]+)+)(:\d{1,5})?(\/.*)?$/i.exec(p);
  if (!m) return null;
  return `${m[1]?.toLowerCase() ?? 'https'}://${m[2] ?? ''}${m[3]?.toLowerCase() ?? ''}${m[5] ?? ''}/*`;
}

/** Script metadata from its header comments: // @name, // @host (repeatable), // @direction. */
export function scriptMeta(source: string): { name: string; hosts: string[]; direction: Direction } {
  const tag = (t: string): string[] => [...source.matchAll(new RegExp(`^\\s*//\\s*@${t}\\s+(.+?)\\s*$`, 'gm'))].map((m) => m[1] ?? '');
  const hosts = [...new Set(tag('host').map(normalizeHost).filter((h): h is string => h !== null))].slice(0, 10);
  return {
    name: (tag('name')[0] ?? '').slice(0, 80) || 'Untitled script',
    hosts,
    direction: tag('direction')[0] === 'vi-en' ? 'vi-en' : 'en-vi',
  };
}

function normalizeScript(v: unknown): UserScript | null {
  if (!isObj(v) || !str(v.id, 40) || !/^[\w-]+$/.test(v.id) || !str(v.source, MAX_SCRIPT) || !str(v.code, MAX_SCRIPT * 2)) return null;
  const meta = scriptMeta(v.source);
  return { id: v.id, name: meta.name, lang: v.lang === 'ts' ? 'ts' : 'js', source: v.source, code: v.code, hosts: meta.hosts, direction: meta.direction };
}

export function normalizeLocal(raw: unknown): LocalSettings {
  const r = isObj(raw) ? raw : {};
  const scripts = (Array.isArray(r.scripts) ? r.scripts : []).map(normalizeScript).filter((s): s is UserScript => s !== null).slice(0, MAX_SCRIPTS);
  const dicts = (Array.isArray(r.dicts) ? r.dicts : [])
    .filter((d): d is DictRef => isObj(d) && str(d.id, 60) && typeof d.enabled === 'boolean')
    .map((d) => ({ id: d.id, enabled: d.enabled }));
  return { dicts, scripts, customCss: str(r.customCss, MAX_CSS) ? r.customCss : '' };
}

export async function loadLocal(): Promise<LocalSettings> {
  return normalizeLocal(await chrome.storage.local.get(['dicts', 'scripts', 'customCss']));
}

export async function saveLocal(patch: Partial<LocalSettings>): Promise<LocalSettings> {
  const next = normalizeLocal({ ...(await loadLocal()), ...patch });
  await chrome.storage.local.set(next);
  return next;
}

/**
 * The full ordered list: stored order first, then dictionaries that appeared
 * since (new imports and scripts, enabled), without ones that were removed.
 */
export function orderedDicts(stored: DictRef[], available: string[]): DictRef[] {
  const known = stored.filter((d) => available.includes(d.id));
  const added = available.filter((id) => !known.some((d) => d.id === id)).map((id) => ({ id, enabled: true }));
  return [...known, ...added];
}
