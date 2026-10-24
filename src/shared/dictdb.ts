// Imported dictionaries, stored in the extension's IndexedDB (shared by the
// options page, which imports, and the service worker, which looks words up).
import type { EnEntry, ViEntry } from './types.ts';
import type { Direction } from './local-settings.ts';

export interface ImportedDict {
  id: string; // "file:<n>"
  name: string;
  direction: Direction;
  format: string; // e.g. "Lingoes", "StarDict", "Yomitan", "TSV"
  count: number;
  created: number;
}

const DB = 'aqa-dicts';
const VERSION = 1;
let opening: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  opening ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      db.createObjectStore('dicts', { keyPath: 'id' });
      db.createObjectStore('entries'); // key: [dictId, word]
    };
    req.onsuccess = () => { resolve(req.result); };
    req.onerror = () => { opening = null; reject(req.error ?? new Error('IndexedDB open failed')); };
  });
  return opening;
}

const done = (tx: IDBTransaction): Promise<void> => new Promise((resolve, reject) => {
  tx.oncomplete = () => { resolve(); };
  tx.onerror = () => { reject(tx.error ?? new Error('IndexedDB write failed')); };
  tx.onabort = () => { reject(tx.error ?? new Error('IndexedDB write aborted')); };
});

const result = <T>(req: IDBRequest<T>): Promise<T> => new Promise((resolve, reject) => {
  req.onsuccess = () => { resolve(req.result); };
  req.onerror = () => { reject(req.error ?? new Error('IndexedDB read failed')); };
});

export async function listDicts(): Promise<ImportedDict[]> {
  const db = await open();
  return (await result(db.transaction('dicts').objectStore('dicts').getAll())) as ImportedDict[];
}

export async function getEntry<T extends EnEntry | ViEntry>(dictId: string, word: string): Promise<T | undefined> {
  const db = await open();
  return (await result(db.transaction('entries').objectStore('entries').get([dictId, word]))) as T | undefined;
}

/** Write a new dictionary in chunks (big files have 100,000+ entries). */
export async function addDict(meta: Omit<ImportedDict, 'id' | 'count' | 'created'>, entries: Map<string, EnEntry | ViEntry>,
  onProgress: (done: number, total: number) => void = () => undefined): Promise<ImportedDict> {
  const db = await open();
  const existing = await listDicts();
  const n = existing.reduce((max, d) => Math.max(max, Number(d.id.split(':')[1]) || 0), 0) + 1;
  const dict: ImportedDict = { ...meta, id: `file:${n}`, count: entries.size, created: Date.now() };
  const all = [...entries];
  const CHUNK = 5000;
  for (let i = 0; i < all.length; i += CHUNK) {
    const tx = db.transaction('entries', 'readwrite');
    const store = tx.objectStore('entries');
    for (const [word, entry] of all.slice(i, i + CHUNK)) store.put(entry, [dict.id, word]);
    await done(tx);
    onProgress(Math.min(i + CHUNK, all.length), all.length);
  }
  const tx = db.transaction('dicts', 'readwrite');
  tx.objectStore('dicts').put(dict);
  await done(tx);
  return dict;
}

export async function renameDict(id: string, name: string, direction: Direction): Promise<void> {
  const db = await open();
  const tx = db.transaction('dicts', 'readwrite');
  const store = tx.objectStore('dicts');
  const dict = (await result(store.get(id))) as ImportedDict | undefined;
  if (dict) store.put({ ...dict, name: name.slice(0, 80) || dict.name, direction });
  await done(tx);
}

export async function deleteDict(id: string): Promise<void> {
  const db = await open();
  const tx = db.transaction(['dicts', 'entries'], 'readwrite');
  tx.objectStore('dicts').delete(id);
  tx.objectStore('entries').delete(IDBKeyRange.bound([id, ''], [id, '￿']));
  await done(tx);
}
