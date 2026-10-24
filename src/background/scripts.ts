// User dictionary scripts. They run in a sandboxed iframe inside an offscreen
// document (no extension APIs, no network); their only network access is
// scriptFetch below, limited to the sites the script declares with "// @host"
// and the user granted.
import type { DictSection } from '../shared/types.ts';
import { loadLocal, orderedDicts, type UserScript } from '../shared/local-settings.ts';
import { scriptEntry } from '../shared/script-result.ts';
import { log } from './log.ts';

const RUN_TIMEOUT_MS = 10_000;
const FETCH_TIMEOUT_MS = 10_000;
const MAX_RESPONSE = 2_000_000;

let creating: Promise<void> | null = null;
async function ensureOffscreen(): Promise<void> {
  if (await chrome.offscreen.hasDocument()) return;
  creating ??= chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: [chrome.offscreen.Reason.IFRAME_SCRIPTING],
    justification: 'Run the user\'s dictionary scripts in a sandboxed iframe.',
  }).finally(() => { creating = null; });
  await creating;
}

function withTimeout<T>(p: Promise<T>, ms: number, what: string): Promise<T> {
  return Promise.race([p, new Promise<T>((_, reject) => setTimeout(() => { reject(new Error(`${what} took longer than ${ms / 1000} s`)); }, ms))]);
}

/** Enabled scripts in the user's dictionary order. */
export async function enabledScripts(): Promise<UserScript[]> {
  const local = await loadLocal();
  const ids = local.scripts.map((s) => `script:${s.id}`);
  return orderedDicts(local.dicts.filter((d) => d.id.startsWith('script:')), ids)
    .filter((d) => d.enabled)
    .map((d) => local.scripts.find((s) => `script:${s.id}` === d.id))
    .filter((s): s is UserScript => !!s);
}

export async function runScript(script: UserScript, word: string): Promise<{ ok: true; section: DictSection | null } | { ok: false; error: string }> {
  try {
    await ensureOffscreen();
    const reply = await withTimeout(chrome.runtime.sendMessage<object, { ok: boolean; result?: unknown; error?: string } | undefined>(
      { target: 'offscreen', type: 'runScript', scriptId: script.id, code: script.code, word }), RUN_TIMEOUT_MS, script.name);
    if (!reply?.ok) return { ok: false, error: reply?.error ?? 'No answer from the script.' };
    const entry = scriptEntry(reply.result);
    return { ok: true, section: entry ? { id: `script:${script.id}`, name: script.name, entry: { ...entry, head: word.toLowerCase() } } : null };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** All enabled scripts for one word, in parallel; failures are logged and skipped. */
export async function lookupScripts(word: string): Promise<DictSection[]> {
  const scripts = await enabledScripts();
  const results = await Promise.all(scripts.map(async (s) => {
    const r = await runScript(s, word);
    if (!r.ok) { log('error', `script "${s.name}" failed`, r.error); return null; }
    return r.section;
  }));
  return results.filter((r): r is DictSection => r !== null);
}

/** Does `url` fall under one of the script's "https://host/*" patterns? */
export function hostAllowed(url: string, patterns: string[]): string | null {
  let u: URL;
  try { u = new URL(url); } catch { return null; }
  for (const p of patterns) {
    const m = /^(https?):\/\/(\*\.)?([^/:]+)(:\d+)?\/\*$/.exec(p);
    if (!m || u.protocol !== `${m[1] ?? ''}:`) continue;
    const host = m[3] ?? '';
    const hostOk = m[2] ? u.hostname.endsWith(`.${host}`) || u.hostname === host : u.hostname === host;
    const portOk = (m[4] ?? '') === (u.port ? `:${u.port}` : '');
    if (hostOk && portOk) return p;
  }
  return null;
}

/** api.fetch from a script: only its declared and granted hosts, no cookies, size and time limits. */
export async function scriptFetch(scriptId: string, url: string): Promise<{ ok: boolean; status: number; text: string; error?: string }> {
  const script = (await loadLocal()).scripts.find((s) => s.id === scriptId);
  if (!script) return { ok: false, status: 0, text: '', error: 'Unknown script.' };
  const pattern = hostAllowed(url, script.hosts);
  if (!pattern) return { ok: false, status: 0, text: '', error: `${url} is not in the script's // @host list.` };
  if (!(await chrome.permissions.contains({ origins: [pattern] }))) {
    return { ok: false, status: 0, text: '', error: `Access to ${pattern} was not granted (save the script again to allow it).` };
  }
  try {
    const res = await fetch(url, { credentials: 'omit', signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!hostAllowed(res.url, script.hosts)) return { ok: false, status: 0, text: '', error: 'Redirected to a site outside the // @host list.' };
    const text = await res.text();
    if (text.length > MAX_RESPONSE) return { ok: false, status: res.status, text: '', error: 'Response too large.' };
    return { ok: res.ok, status: res.status, text };
  } catch (e) {
    return { ok: false, status: 0, text: '', error: e instanceof Error ? e.message : String(e) };
  }
}
