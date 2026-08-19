// Minimal store-only (no compression) ZIP writer for the Export feature. Kept
// dependency-free on purpose: adding an npm package here would mean
// regenerating the ewp_validator lockfile on Linux for CI (see the project's
// cross-platform lock note), and the YAML scripts we pack are small enough
// that DEFLATE would buy little. Emits a spec-compliant archive (local file
// headers + central directory + EOCD) that any unzip tool accepts.
//
// Writes directly into one pre-sized Uint8Array via DataView, rather than
// accumulating bytes with `array.push(...bytes)` — a `push(...largeArray)`
// argument-spread copies the whole array again on every call and can throw
// "Maximum call stack size exceeded" past a few tens of thousands of bytes,
// which is exactly what caused a real "Export all" freeze on a large batch
// (ui-functionality-fixes ticket 03). Two passes: first compute every
// entry's encoded name/content bytes, CRC, and byte offset (cheap, and lets
// the exact output size be known up front); second write everything at its
// known offset with `DataView`/`Uint8Array.set` — both O(n) with native
// copies, no unbounded argument lists.

export interface ZipEntry {
  /** Forward-slash path inside the archive, e.g. "expand_world/rules.yaml". */
  path: string;
  content: string;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

const utf8 = new TextEncoder();

const LOCAL_HEADER_SIZE = 30;
const CENTRAL_HEADER_SIZE = 46;
const EOCD_SIZE = 22;
const FLAG_UTF8 = 0x0800; // filename/comment are UTF-8
const METHOD_STORE = 0; // no compression

interface PreparedEntry {
  nameBytes: Uint8Array;
  dataBytes: Uint8Array;
  crc: number;
  /** Byte offset of this entry's local file header within the local section. */
  localOffset: number;
}

// Called after each entry is encoded in pass 1, with the count done so far
// (never more often than that — the caller decides whether/how to throttle,
// e.g. before relaying it across a Worker's postMessage boundary).
export type ZipProgress = (done: number, total: number) => void;

export function buildZip(entries: ZipEntry[], onProgress?: ZipProgress): Uint8Array {
  // Pass 1: encode + checksum each entry once, and lay out the local section's offsets.
  const prepared: PreparedEntry[] = [];
  let localOffset = 0;
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const nameBytes = utf8.encode(entry.path);
    const dataBytes = utf8.encode(entry.content);
    prepared.push({ nameBytes, dataBytes, crc: crc32(dataBytes), localOffset });
    localOffset += LOCAL_HEADER_SIZE + nameBytes.length + dataBytes.length;
    onProgress?.(i + 1, entries.length);
  }
  const localTotal = localOffset;
  const centralTotal = prepared.reduce((sum, p) => sum + CENTRAL_HEADER_SIZE + p.nameBytes.length, 0);
  const centralStart = localTotal;

  // Pass 2: write local headers/data and central directory records directly
  // into one pre-sized buffer, at the offsets pass 1 already computed.
  const out = new Uint8Array(localTotal + centralTotal + EOCD_SIZE);
  const view = new DataView(out.buffer);

  let centralCursor = centralStart;
  for (const p of prepared) {
    let o = p.localOffset;
    view.setUint32(o, 0x04034b50, true); o += 4;
    view.setUint16(o, 20, true); o += 2; // version needed
    view.setUint16(o, FLAG_UTF8, true); o += 2;
    view.setUint16(o, METHOD_STORE, true); o += 2;
    view.setUint16(o, 0, true); o += 2; // mod time
    view.setUint16(o, 0, true); o += 2; // mod date
    view.setUint32(o, p.crc, true); o += 4;
    view.setUint32(o, p.dataBytes.length, true); o += 4; // compressed size
    view.setUint32(o, p.dataBytes.length, true); o += 4; // uncompressed size
    view.setUint16(o, p.nameBytes.length, true); o += 2;
    view.setUint16(o, 0, true); o += 2; // extra length
    out.set(p.nameBytes, o); o += p.nameBytes.length;
    out.set(p.dataBytes, o);

    let c = centralCursor;
    view.setUint32(c, 0x02014b50, true); c += 4;
    view.setUint16(c, 20, true); c += 2; // version made by
    view.setUint16(c, 20, true); c += 2; // version needed
    view.setUint16(c, FLAG_UTF8, true); c += 2;
    view.setUint16(c, METHOD_STORE, true); c += 2;
    view.setUint16(c, 0, true); c += 2; // mod time
    view.setUint16(c, 0, true); c += 2; // mod date
    view.setUint32(c, p.crc, true); c += 4;
    view.setUint32(c, p.dataBytes.length, true); c += 4;
    view.setUint32(c, p.dataBytes.length, true); c += 4;
    view.setUint16(c, p.nameBytes.length, true); c += 2;
    view.setUint16(c, 0, true); c += 2; // extra
    view.setUint16(c, 0, true); c += 2; // comment
    view.setUint16(c, 0, true); c += 2; // disk number
    view.setUint16(c, 0, true); c += 2; // internal attrs
    view.setUint32(c, 0, true); c += 4; // external attrs
    view.setUint32(c, p.localOffset, true); c += 4;
    out.set(p.nameBytes, c);
    centralCursor += CENTRAL_HEADER_SIZE + p.nameBytes.length;
  }

  let e = centralStart + centralTotal;
  view.setUint32(e, 0x06054b50, true); e += 4;
  view.setUint16(e, 0, true); e += 2; // this disk
  view.setUint16(e, 0, true); e += 2; // disk with central dir
  view.setUint16(e, entries.length, true); e += 2; // entries on this disk
  view.setUint16(e, entries.length, true); e += 2; // total entries
  view.setUint32(e, centralTotal, true); e += 4;
  view.setUint32(e, centralStart, true); e += 4;
  view.setUint16(e, 0, true); // comment length

  return out;
}
