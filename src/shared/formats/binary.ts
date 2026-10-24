// Byte helpers for the dictionary importers (browser and Node 18+).

export async function inflate(bytes: Uint8Array, format: CompressionFormat): Promise<Uint8Array> {
  const stream = new Blob([bytes as Uint8Array<ArrayBuffer>]).stream().pipeThrough(new DecompressionStream(format));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

const utf8 = new TextDecoder('utf-8', { fatal: true });
const utf16 = new TextDecoder('utf-16le');
const loose = new TextDecoder('utf-8');

/** UTF-8, or UTF-16LE when the bytes aren't valid UTF-8 (older Lingoes files). */
export function decodeText(bytes: Uint8Array): string {
  try { return utf8.decode(bytes); } catch { /* not UTF-8 */ }
  try { return utf16.decode(bytes); } catch { return loose.decode(bytes); }
}

export const decodeUtf8 = (bytes: Uint8Array): string => loose.decode(bytes);

export function view(bytes: Uint8Array): DataView {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}
