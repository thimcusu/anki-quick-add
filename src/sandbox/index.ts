// Sandboxed page (null origin, no extension APIs, no network — see the
// manifest's sandbox CSP). Runs user dictionary scripts. The only way out is
// api.fetch, which asks the service worker, which only allows the script's
// declared @host sites the user granted.
interface RunMessage { kind: 'run'; reqId: number; scriptId: string; code: string; word: string }
interface FetchReply { kind: 'fetched'; reqId: number; ok: boolean; status: number; text: string; error?: string }

const pending = new Map<number, (r: FetchReply) => void>();
let nextId = 1;
const compiled = new Map<string, (word: string, api: unknown) => unknown>();

function scriptApi(scriptId: string): Record<string, unknown> {
  const fetchText = (url: string): Promise<string> => new Promise((resolve, reject) => {
    const reqId = nextId++;
    pending.set(reqId, (r) => { if (r.ok) resolve(r.text); else reject(new Error(r.error ?? `HTTP ${r.status}`)); });
    window.parent.postMessage({ kind: 'fetch', reqId, scriptId, url }, '*');
  });
  return {
    fetch: fetchText,
    json: async (url: string): Promise<unknown> => JSON.parse(await fetchText(url)) as unknown,
    html: (text: string): Document => new DOMParser().parseFromString(text, 'text/html'),
  };
}

function compile(scriptId: string, code: string): (word: string, api: unknown) => unknown {
  const key = `${scriptId}\n${code}`;
  let fn = compiled.get(key);
  if (!fn) {
    // User code by design: this page is sandboxed (no chrome.* APIs, no network, opaque origin).
    // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
    const factory = new Function(`"use strict";\n${code}\n;return typeof lookup === "function" ? lookup : null;`) as () => unknown;
    const lookup = factory();
    if (typeof lookup !== 'function') throw new Error('The script must define a function named lookup(word, api).');
    fn = lookup as (word: string, api: unknown) => unknown;
    compiled.set(key, fn);
  }
  return fn;
}

window.addEventListener('message', (ev: MessageEvent<RunMessage | FetchReply>) => {
  if (ev.source !== window.parent) return;
  const msg = ev.data;
  if (msg.kind === 'fetched') { pending.get(msg.reqId)?.(msg); pending.delete(msg.reqId); return; }
  void (async () => {
    try {
      const result = await compile(msg.scriptId, msg.code)(msg.word, scriptApi(msg.scriptId));
      window.parent.postMessage({ kind: 'result', reqId: msg.reqId, ok: true, result: JSON.parse(JSON.stringify(result ?? null)) as unknown }, '*');
    } catch (e) {
      window.parent.postMessage({ kind: 'result', reqId: msg.reqId, ok: false, error: e instanceof Error ? e.message : String(e) }, '*');
    }
  })();
});

window.parent.postMessage({ kind: 'ready' }, '*');
export {}; // module scope
