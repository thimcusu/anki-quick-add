// Lingoes .ld2 reader → { headword: raw definition }.
import { decodeText, inflate, view } from './binary.ts';

export async function readLd2(bytes: Uint8Array): Promise<Map<string, string>> {
  const v = view(bytes);
  const I = (p: number): number => v.getInt32(p, true);
  if (bytes.length < 0x100 || String.fromCharCode(...bytes.subarray(0, 3)) !== '?LD') throw new Error('Not a Lingoes .ld2 file.');
  let off = I(0x5c) + 0x60;
  if (I(off) !== 3) off = I(off + 4) + off + 8; // skip the header section
  const limit = I(off + 4) + off + 8;
  const oidx = off + 0x1c;
  const ocdh = I(off + 8) + oidx;
  const wil = I(off + 12);
  const wl = I(off + 16);
  const ndef = Math.floor((ocdh - oidx) / 4);
  let pos = ocdh + 8;
  const streams: number[] = [];
  let o = I(pos);
  while (o + pos < limit) { o = I(pos); streams.push(o); pos += 4; }
  const parts: Uint8Array[] = [];
  let start = pos;
  for (const e of streams) {
    try { parts.push(await inflate(bytes.subarray(start, pos + e), 'deflate')); } catch { /* skip damaged block */ }
    start = pos + e;
  }
  const raw = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let k = 0;
  for (const p of parts) { raw.set(p, k); k += p.length; }
  const r = view(raw);
  const R = (p: number): number => r.getInt32(p, true);
  const idx = (p: number): [number, number, number, number, number] => [R(p), R(p + 4), raw[p + 9] ?? 0, R(p + 10), R(p + 14)];
  const ow = wil;
  const ox = wil + wl;
  const out = new Map<string, string>();
  for (let i = 0; i < ndef; i++) {
    const [lw0, lx, refs0, cw, cx] = idx(10 * i);
    let lw = lw0;
    let refs = refs0;
    let xml = decodeText(raw.subarray(ox + lx, ox + cx)).trim();
    while (refs > 0) {
      const b = idx(10 * R(ow + lw));
      const x2 = decodeText(raw.subarray(ox + b[1], ox + b[4])).trim();
      xml = xml ? `${x2}, ${xml}` : x2;
      lw += 4; refs--;
    }
    const word = decodeText(raw.subarray(ow + lw, ow + cw)).trim();
    if (word) out.set(word, xml);
  }
  return out;
}
