import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { ErrorCode } from "yaml";
import { translateYamlError } from "./yamlErrorMessages";

// The real list of codes, read from the yaml library's own type file, so this test fails loudly
// the day the library adds a code without a table entry here. (A copy typed by hand cannot do that.)
const dts = readFileSync(new URL("../node_modules/yaml/dist/errors.d.ts", import.meta.url), "utf8");
const ALL_ERROR_CODES = [...(dts.match(/export type ErrorCode = ([^;]+);/)?.[1] ?? "").matchAll(/'([A-Z_0-9]+)'/g)].map((m) => m[1] as ErrorCode);

describe("translateYamlError", () => {
  it("covers every ErrorCode value the yaml library defines with a distinct, non-raw message", () => {
    expect(ALL_ERROR_CODES.length, "could not read the ErrorCode list").toBeGreaterThan(15);
    const seen = new Set<string>();
    for (const code of ALL_ERROR_CODES) {
      const message = translateYamlError({ code, message: "raw technical message" });
      expect(message).not.toBe("raw technical message");
      expect(message.length).toBeGreaterThan(10);
      expect(seen.has(message)).toBe(false); // no two codes accidentally share a copy-pasted message
      seen.add(message);
    }
  });

  it("falls back to a friendly-but-generic wrapper for an unknown/future code, never showing the raw message bare", () => {
    const message = translateYamlError({ code: "SOME_FUTURE_CODE", message: "Nested mappings are not allowed in compact mappings" });
    expect(message).toContain("YAML formatting problem");
    expect(message).toContain("Nested mappings are not allowed in compact mappings");
  });

  it("falls back gracefully when code is missing entirely", () => {
    const message = translateYamlError({ message: "some raw message" });
    expect(message).toContain("some raw message");
  });
});
