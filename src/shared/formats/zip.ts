// Minimal ZIP reader (stored and deflated entries, no ZIP64, no encryption).
import { decodeUtf8, inflate, view } from './binary.ts';

export interface ZipEntry { name: string; read: () => Promise<Uint8Array> }

export const isZip = (b: Uint8Array): boolean => b.length > 4 && b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04;

export function readZip(bytes: Uint8Array): ZipEntry[] {
  const v = view(bytes);
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65_557); i--) {
    if (v.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('Not a ZIP file (or a damaged one).');
  const count = v.getUint16(eocd + 10, true);
  let p = v.getUint32(eocd + 16, true);
  const entries: ZipEntry[] = [];
  for (let i = 0; i < count; i++) {
    if (v.getUint32(p, true) !== 0x02014b50) throw new Error('Damaged ZIP directory.');
    const method = v.getUint16(p + 10, true);
    const compressed = v.getUint32(p + 20, true);
    const nameLen = v.getUint16(p + 28, true);
    const extraLen = v.getUint16(p + 30, true);
    const commentLen = v.getUint16(p + 32, true);
    const local = v.getUint32(p + 42, true);
    const name = decodeUtf8(bytes.subarray(p + 46, p + 46 + nameLen));
    p += 46 + nameLen + extraLen + commentLen;
    if (name.endsWith('/') || name.startsWith('__MACOSX/') || name.split('/').pop()?.startsWith('.')) continue;
    entries.push({
      name,
      read: async () => {
        if (v.getUint32(local, true) !== 0x04034b50) throw new Error(`Damaged ZIP entry ${name}.`);
        const start = local + 30 + v.getUint16(local + 26, true) + v.getUint16(local + 28, true);
        const data = bytes.subarray(start, start + compressed);
        if (method === 0) return data;
        if (method === 8) return inflate(data, 'deflate-raw');
        throw new Error(`Unsupported compression in ${name}.`);
      },
    });
  }
  return entries;
}
