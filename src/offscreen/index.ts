// Offscreen document: hosts the sandboxed iframe that runs user scripts and
// relays messages between it and the service worker.
interface Result { kind: 'result'; reqId: number; ok: boolean; result?: unknown; error?: string }
interface FetchRequest { kind: 'fetch'; reqId: number; scriptId: string; url: string }

const frame = document.createElement('iframe');
frame.src = 'sandbox.html';
document.body.append(frame);

let ready: () => void = () => undefined;
const loaded = new Promise<void>((resolve) => { ready = resolve; });
const waiting = new Map<number, (r: Result) => void>();
let nextId = 1;

window.addEventListener('message', (ev: MessageEvent<Result | FetchRequest | { kind: 'ready' }>) => {
  if (ev.source !== frame.contentWindow) return; // only our sandbox
  const msg = ev.data;
  if (msg.kind === 'ready') { ready(); return; }
  if (msg.kind === 'result') { waiting.get(msg.reqId)?.(msg); waiting.delete(msg.reqId); return; }
  {
    void chrome.runtime.sendMessage<object, { ok: boolean; status: number; text: string; error?: string } | undefined>({ type: 'scriptFetch', scriptId: msg.scriptId, url: msg.url })
      .then((r) => r ?? { ok: false, status: 0, text: '', error: 'No answer.' }, (e: unknown) => ({ ok: false, status: 0, text: '', error: String(e) }))
      .then((r) => { frame.contentWindow?.postMessage({ kind: 'fetched', reqId: msg.reqId, ...r }, '*'); });
  }
});

chrome.runtime.onMessage.addListener((msg: unknown, sender, reply) => {
  const m = msg as { target?: unknown; type?: unknown; scriptId?: unknown; code?: unknown; word?: unknown };
  if (sender.id !== chrome.runtime.id || m.target !== 'offscreen' || m.type !== 'runScript') return false;
  void loaded.then(() => {
    const reqId = nextId++;
    waiting.set(reqId, (r) => { reply(r); });
    frame.contentWindow?.postMessage({ kind: 'run', reqId, scriptId: String(m.scriptId), code: String(m.code), word: String(m.word) }, '*');
  });
  return true;
});
export {}; // module scope
