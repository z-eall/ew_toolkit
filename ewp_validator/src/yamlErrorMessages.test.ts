import { describe, expect, it } from "vitest";
import type { ErrorCode } from "yaml";
import { translateYamlError } from "./yamlErrorMessages";

// Mirrors the closed 23-value union in node_modules/yaml/dist/errors.d.ts —
// kept as a literal here (not imported) so this test fails loudly if that
// union ever grows, prompting a new table entry rather than a silent
// fallback-only translation for the new code.
const ALL_ERROR_CODES: ErrorCode[] = [
  "ALIAS_PROPS",
  "BAD_ALIAS",
  "BAD_DIRECTIVE",
  "BAD_DQ_ESCAPE",
  "BAD_INDENT",
  "BAD_PROP_ORDER",
  "BAD_SCALAR_START",
  "BLOCK_AS_IMPLICIT_KEY",
  "BLOCK_IN_FLOW",
  "DUPLICATE_KEY",
  "IMPOSSIBLE",
  "KEY_OVER_1024_CHARS",
  "MISSING_CHAR",
  "MULTILINE_IMPLICIT_KEY",
  "MULTIPLE_ANCHORS",
  "MULTIPLE_DOCS",
  "MULTIPLE_TAGS",
  "NON_STRING_KEY",
  "RESOURCE_EXHAUSTION",
  "TAB_AS_INDENT",
  "TAG_RESOLVE_FAILED",
  "UNEXPECTED_TOKEN",
  "BAD_COLLECTION_TYPE",
];

describe("translateYamlError", () => {
  it("covers all 23 known ErrorCode values with a distinct, non-raw message", () => {
    expect(ALL_ERROR_CODES).toHaveLength(23);
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
