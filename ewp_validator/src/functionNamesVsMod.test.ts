// The function names the validator accepts inside `<...>` are copied by hand from EWP's source
// (Functions.cs, ObjectFunctions.cs). When EWP adds a function, the validator would call it a typo.
// This test compares our list with the mod's own switch statements. It needs the local copy of
// Jere's mods (workspace `valheim-modding/upstream`, see docs/sources.md) and skips when that copy
// is missing, for example in CI. Round 6 ticket 21 (finding: `altbiome` was missing).
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ALL_KNOWN_FUNCTION_NAMES } from "./referenceValidation";

const here = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(here, "../../../valheim-modding/upstream/valheim-expand_world_prefabs/ExpandWorldPrefabs/service/data");
const FILES = ["Functions.cs", "ObjectFunctions.cs"].map((f) => resolve(DATA_DIR, f));
const haveMirror = FILES.every((f) => existsSync(f));

// Names the C# files use as switch cases but that are not `<...>` functions. Keep this list empty
// unless a real case shows up; each entry needs a reason.
const NOT_FUNCTIONS: readonly string[] = [];

/** Every `"name" =>` and `"a" or "b" =>` switch case in a C# file. */
function switchCaseNames(source: string): string[] {
  const names: string[] = [];
  for (const line of source.split(/\r?\n/)) {
    const m = line.match(/^\s*((?:"[^"]+"\s*(?:or\s+)?)+)=>/);
    if (!m) continue;
    for (const q of m[1]!.matchAll(/"([^"]+)"/g)) names.push(q[1]!);
  }
  return names;
}

describe.skipIf(!haveMirror)("function names against the mod source", () => {
  it("finds the switch cases (guards the parser in this test)", () => {
    const all = FILES.flatMap((f) => switchCaseNames(readFileSync(f, "utf8")));
    expect(all.length).toBeGreaterThan(100);
    expect(all).toContain("altbiome");
  });

  it("every function name EWP dispatches is in the validator's list", () => {
    const ours = new Set(ALL_KNOWN_FUNCTION_NAMES);
    const missing = FILES.flatMap((f) => switchCaseNames(readFileSync(f, "utf8")))
      .filter((n) => !NOT_FUNCTIONS.includes(n) && !ours.has(n));
    expect([...new Set(missing)]).toEqual([]);
  });
});
