// Minimal store-only (no compression) ZIP writer for the Save feature. Kept
// dependency-free on purpose: adding an npm package here would mean
// regenerating the ewp_validator lockfile on Linux for CI (see the project's
// cross-platform lock note), and the YAML scripts we pack are small enough
// that DEFLATE would buy little. Emits a spec-compliant archive (local file
// headers + central directory + EOCD) that any unzip tool accepts.

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

function u16(v: number): number[] {
  return [v & 0xff, (v >>> 8) & 0xff];
}
function u32(v: number): number[] {
  return [v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff];
}

export function buildZip(entries: ZipEntry[]): Uint8Array {
  const local: number[] = [];
  const central: number[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = utf8.encode(entry.path);
    const dataBytes = utf8.encode(entry.content);
    const crc = crc32(dataBytes);
    const size = dataBytes.length;
    const FLAG_UTF8 = 0x0800; // filename/comment are UTF-8

    // Local file header + data.
    const localHeaderOffset = offset;
    const header = [
      ...u32(0x04034b50),
      ...u16(20), // version needed
      ...u16(FLAG_UTF8),
      ...u16(0), // method: store
      ...u16(0), // mod time
      ...u16(0), // mod date
      ...u32(crc),
      ...u32(size), // compressed
      ...u32(size), // uncompressed
      ...u16(nameBytes.length),
      ...u16(0), // extra length
      ...nameBytes,
    ];
    local.push(...header, ...dataBytes);
    offset += header.length + dataBytes.length;

    // Central directory record.
    central.push(
      ...u32(0x02014b50),
      ...u16(20), // version made by
      ...u16(20), // version needed
      ...u16(FLAG_UTF8),
      ...u16(0), // method: store
      ...u16(0), // mod time
      ...u16(0), // mod date
      ...u32(crc),
      ...u32(size),
      ...u32(size),
      ...u16(nameBytes.length),
      ...u16(0), // extra
      ...u16(0), // comment
      ...u16(0), // disk number
      ...u16(0), // internal attrs
      ...u32(0), // external attrs
      ...u32(localHeaderOffset),
      ...nameBytes,
    );
  }

  const centralOffset = local.length;
  const eocd = [
    ...u32(0x06054b50),
    ...u16(0), // this disk
    ...u16(0), // disk with central dir
    ...u16(entries.length),
    ...u16(entries.length),
    ...u32(central.length),
    ...u32(centralOffset),
    ...u16(0), // comment length
  ];

  return Uint8Array.from([...local, ...central, ...eocd]);
}
