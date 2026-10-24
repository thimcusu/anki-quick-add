// StarDict reader: .ifo + .idx[.gz] + .dict[.dz] → { headword: definition text }.
import { decodeUtf8, inflate, view } from './binary.ts';

export interface StarDictFiles { ifo: Uint8Array; idx: Uint8Array; dict: Uint8Array; idxGz: boolean; dictDz: boolean }

export function parseIfo(ifo: Uint8Array): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of decodeUtf8(ifo).split(/\r?\n/)) {
    const i = line.indexOf('=');
    if (i > 0) out[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return out;
}

/** Text of one StarDict data block; HTML/XDXF/Pango markup is flagged so it can be stripped. */
function blockText(data: Uint8Array, types: string): { text: string; markup: boolean } {
  if (types.length === 1) return { text: decodeUtf8(data), markup: 'hgx'.includes(types) };
  // No sametypesequence: <type char><null-terminated text>, repeated.
  const parts: string[] = [];
  let markup = false;
  let p = 0;
  while (p < data.length) {
    const t = String.fromCharCode(data[p] ?? 0);
    p++;
    if (/[A-Z]/.test(t)) { // binary (sound, picture…): 4-byte big-endian size + data — skipped
      if (p + 4 > data.length) break;
      p += 4 + view(data).getUint32(p);
      continue;
    }
    let end = data.indexOf(0, p);
    if (end < 0) end = data.length;
    parts.push(decodeUtf8(data.subarray(p, end)));
    if ('hgx'.includes(t)) markup = true;
    p = end + 1;
  }
  return { text: parts.join('\n'), markup };
}

export async function readStarDict(f: StarDictFiles): Promise<{ name: string; entries: Map<string, { text: string; markup: boolean }> }> {
  const ifo = parseIfo(f.ifo);
  const idx = f.idxGz ? await inflate(f.idx, 'gzip') : f.idx;
  const dict = f.dictDz ? await inflate(f.dict, 'gzip') : f.dict;
  const v = view(idx);
  const wide = ifo.idxoffsetbits === '64';
  const types = ifo.sametypesequence ?? '';
  const entries = new Map<string, { text: string; markup: boolean }>();
  let p = 0;
  while (p < idx.length) {
    const end = idx.indexOf(0, p);
    if (end < 0) break;
    const word = decodeUtf8(idx.subarray(p, end)).trim();
    p = end + 1;
    const offset = wide ? Number(v.getBigUint64(p)) : v.getUint32(p);
    p += wide ? 8 : 4;
    const size = v.getUint32(p);
    p += 4;
    if (!word || offset + size > dict.length) continue;
    const block = blockText(dict.subarray(offset, offset + size), types);
    const prev = entries.get(word);
    entries.set(word, prev ? { text: `${prev.text}\n${block.text}`, markup: prev.markup || block.markup } : block);
  }
  return { name: ifo.bookname ?? '', entries };
}
