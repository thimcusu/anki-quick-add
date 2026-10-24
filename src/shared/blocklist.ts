// Sites where the extension does nothing. Patterns (one per entry):
//   example.com            the host and all its subdomains (www.example.com, chat.example.com)
//   *.example.com          subdomains only
//   example.com/chat       only URLs under that path
//   https://example.com/   full URLs are accepted and reduced to host (+ path)
//   192.168.1.10:8080      hosts with a port

import { DEFAULTS } from './defaults.ts';

export const DEFAULT_BLOCKLIST: string[] = DEFAULTS.blocklist;

const MAX_PATTERNS = 200;

/** Normalize user input into "host[:port][/path]" or "*.host…"; null if it isn't a usable pattern. */
export function normalizePattern(input: string): string | null {
  let p = input.trim().toLowerCase();
  if (!p) return null;
  p = p.replace(/^[a-z][a-z0-9+.-]*:\/\//, ''); // drop scheme
  p = p.replace(/[?#].*$/, '').replace(/\/+$/, ''); // drop query, hash, trailing slashes
  const wildcard = p.startsWith('*.');
  if (wildcard) p = p.slice(2);
  const [hostPort = '', ...pathParts] = p.split('/');
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)*(:\d{1,5})?$/.test(hostPort)) return null;
  const path = pathParts.length ? '/' + pathParts.join('/') : '';
  if (!/^[\w\-./~%]*$/.test(path)) return null;
  return (wildcard ? '*.' : '') + hostPort + path;
}

export function parseBlocklist(text: string | string[]): string[] {
  const items = Array.isArray(text) ? text : text.split(/[\n,]+/);
  const out = items.map(normalizePattern).filter((p): p is string => p !== null);
  return [...new Set(out)].slice(0, MAX_PATTERNS);
}

/** True if `url` is matched by any pattern. Only http(s) pages are considered. */
export function isBlocked(url: string, patterns: string[]): boolean {
  let u: URL;
  try { u = new URL(url); } catch { return false; }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
  const host = u.hostname.toLowerCase();
  const hostPort = u.port ? `${host}:${u.port}` : host;
  const path = u.pathname.toLowerCase();
  return patterns.some((pattern) => {
    const wildcard = pattern.startsWith('*.');
    const p = wildcard ? pattern.slice(2) : pattern;
    const slash = p.indexOf('/');
    const pHost = slash < 0 ? p : p.slice(0, slash);
    const pPath = slash < 0 ? '' : p.slice(slash);
    const target = pHost.includes(':') ? hostPort : host; // a pattern with a port must match the port too
    const subdomain = target.endsWith('.' + pHost);
    if (!(wildcard ? subdomain : target === pHost || subdomain)) return false;
    return !pPath || path === pPath || path.startsWith(pPath + '/');
  });
}

/** The pattern to add for "disable on this site": the page's host (with port if any). */
export function siteOf(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return normalizePattern(u.host);
  } catch {
    return null;
  }
}
