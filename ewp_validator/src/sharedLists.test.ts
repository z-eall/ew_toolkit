// Lists that exist in two places must not drift apart (round 6 ticket 10). Where one shared copy
// is not practical (a build script vs app code), a test compares the copies.
import { describe, expect, it } from "vitest";
import { VARIADIC_RPCS } from "./rpcValidation";
import schemaJson from "./schema.generated.json";
import { KNOWN_TYPES } from "./structuralPrecheck";
import { FILENAME_PATTERN_HINT, checkFileName } from "./fileNameCheck";

describe("type: words", () => {
  it("the validator's known type list equals the schema's type list", () => {
    const pattern: string = (schemaJson as any).definitions.ewpRuleEntry.properties.type.pattern;
    // The schema writes each word case-insensitively as [cC][rR]...; turn it back into words.
    const group = pattern.slice(pattern.indexOf("(") + 1, pattern.indexOf(")"));
    const words = group.split("|").map((w) => w.replace(/\[(.)(.)\]/g, "$1").toLowerCase());
    expect(new Set(words)).toEqual(new Set(KNOWN_TYPES));
  });
});

describe("variadic RPC list", () => {
  it("rpcValidation.ts and schema/rpcOverrides.mjs name the same RPCs", async () => {
    // @ts-expect-error plain .mjs build script, no types
    const overrides = (await import("../schema/rpcOverrides.mjs")) as { VARIADIC_RPCS: Set<string> };
    expect(new Set(overrides.VARIADIC_RPCS)).toEqual(new Set(VARIADIC_RPCS));
  });
});

describe("file name wording", () => {
  it("the invalid-file message uses the shared pattern text", () => {
    const p = checkFileName("simple.yaml").problem!;
    expect(p.message).toContain(FILENAME_PATTERN_HINT);
  });
});
