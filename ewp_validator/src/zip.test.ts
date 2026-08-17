import { describe, expect, it } from "vitest";
import { buildZip, crc32 } from "./zip";

const utf8 = new TextEncoder();
const u32le = (b: Uint8Array, o: number) => b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24);
const u16le = (b: Uint8Array, o: number) => b[o] | (b[o + 1] << 8);

describe("crc32", () => {
  it("is 0 for empty input", () => {
    expect(crc32(new Uint8Array())).toBe(0);
  });
  it("matches the standard check vector", () => {
    // CRC-32 of "The quick brown fox jumps over the lazy dog" = 0x414FA339.
    expect(crc32(utf8.encode("The quick brown fox jumps over the lazy dog"))).toBe(0x414fa339);
  });
});

describe("buildZip", () => {
  it("starts with a local file header and ends with the EOCD signature", () => {
    const zip = buildZip([{ path: "a.yaml", content: "- prefab: X\n" }]);
    expect(u32le(zip, 0)).toBe(0x04034b50); // local file header
    // EOCD is the last 22 bytes (no archive comment).
    expect(u32le(zip, zip.length - 22)).toBe(0x06054b50);
  });

  it("records the entry count in the EOCD", () => {
    const zip = buildZip([
      { path: "expand_world/a.yaml", content: "x" },
      { path: "expand_world/b.yaml", content: "y" },
    ]);
    const eocd = zip.length - 22;
    expect(u16le(zip, eocd + 8)).toBe(2); // entries on this disk
    expect(u16le(zip, eocd + 10)).toBe(2); // total entries
  });

  it("stores the path bytes and the raw content uncompressed", () => {
    const content = "- prefab: Bonemass\n  type: create\n";
    const zip = buildZip([{ path: "expand_world/rules.yaml", content }]);
    const text = new TextDecoder().decode(zip);
    expect(text).toContain("expand_world/rules.yaml");
    expect(text).toContain("type: create"); // stored, so the content is literally present
  });

  it("marks entries as stored (method 0) with matching compressed/uncompressed sizes", () => {
    const content = "hello world";
    const zip = buildZip([{ path: "a.yaml", content }]);
    expect(u16le(zip, 8)).toBe(0); // compression method in local header
    expect(u32le(zip, 18)).toBe(content.length); // compressed size
    expect(u32le(zip, 22)).toBe(content.length); // uncompressed size
    expect(u32le(zip, 14)).toBe(crc32(utf8.encode(content))); // crc
  });

  it("produces a valid empty archive for no entries", () => {
    const zip = buildZip([]);
    expect(zip.length).toBe(22); // EOCD only
    expect(u32le(zip, 0)).toBe(0x06054b50);
  });
});
