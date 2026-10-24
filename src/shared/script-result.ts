// What a user script may return, checked in the service worker before use.
import type { EnEntry } from './types.ts';

export interface ScriptResult {
  ipa?: string;
  groups: { pos?: string; meanings: string[]; examples?: string[] }[];
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const strs = (v: unknown, max: number, len: number): string[] =>
  Array.isArray(v) ? v.filter((s): s is string => typeof s === 'string').map((s) => s.trim().slice(0, len)).filter(Boolean).slice(0, max) : [];

/** Plain text only, small caps; anything else is dropped. Returns null when nothing usable is left. */
export function scriptEntry(v: unknown): EnEntry | null {
  if (!isObj(v) || !Array.isArray(v.groups)) return null;
  const g = v.groups.filter(isObj).slice(0, 6).map((x) => {
    const examples = strs(x.examples, 3, 300);
    return { p: typeof x.pos === 'string' ? x.pos.trim().slice(0, 40) : '', m: strs(x.meanings, 10, 500), ...(examples.length ? { x: examples } : {}) };
  }).filter((x) => x.m.length);
  if (!g.length) return null;
  return { i: typeof v.ipa === 'string' ? v.ipa.trim().slice(0, 100) : '', g, s: 'sc' };
}
