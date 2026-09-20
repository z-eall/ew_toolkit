// Corpus test (Round 6 ticket 05): run the code examples published in the
// ew_wiki pages through the validator, the way a scripter copying them would.
// - Blocks labelled WRONG: the validator must keep rejecting the ones it rejects today.
// - Blocks that are fragments (not starting a list) are skipped.
// - Every other block must have no error, except the known wiki problems below.
// A known problem that stops failing must be removed from the list, so the list
// only shrinks as the wiki (or the schema) is fixed.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { runStructuralPrecheck } from "./structuralPrecheck";

const DOCS_ROOT = join(__dirname, "../../ew_wiki/src/content/docs");

interface Fence {
  file: string;
  code: string;
}

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (name.endsWith(".mdx")) out.push(p);
  }
  return out;
}

function collectFences(): Fence[] {
  const fences: Fence[] = [];
  for (const p of walk(DOCS_ROOT)) {
    const text = readFileSync(p, "utf8");
    for (const m of text.matchAll(/```yaml[^\n]*\r?\n([\s\S]*?)```/g)) {
      fences.push({ file: p.slice(DOCS_ROOT.length + 1).replace(/\\/g, "/"), code: m[1] });
    }
  }
  return fences;
}

const firstCodeLine = (code: string) =>
  code.split(/\r?\n/).find((l) => l.trim() !== "" && !l.trim().startsWith("#")) ?? "";
const isFragment = (code: string) => !firstCodeLine(code).startsWith("- ");
const isLabelledWrong = (code: string) => /^\s*#\s*WRONG/m.test(code);
const hasError = (code: string) => runStructuralPrecheck(code).some((p) => p.severity === "error");

// Known wiki problems (found 2026-09-20). Fix the wiki, then delete the entry.
const KNOWN_WIKI_PROBLEMS: { file: string; reason: string; match: (code: string) => boolean }[] = [
  {
    file: "ewp/concepts/advanced-functions.mdx",
    reason: "value contains an unquoted colon (\"roll: <...>\"), invalid YAML",
    match: (c) => c.includes("s Advantage roll:"),
  },
  {
    file: "ewp/concepts/advanced-poke-mechanics.mdx",
    reason: "value contains an unquoted colon (\"Price: 5-2\"), invalid YAML",
    match: (c) => c.includes('message "Price: 5-2"') && !/#\s*(WRONG|CORRECT)/.test(c),
  },
  {
    file: "ewp/concepts/advanced-poke-mechanics.mdx",
    reason: "the block labelled CORRECT has the same unquoted colon",
    match: (c) => /#\s*CORRECT/.test(c) && c.includes('message "Price: 5-2"'),
  },
  {
    file: "ewp/concepts/advanced-poke-mechanics.mdx",
    reason: "connected: is written at rule level; the mod docs place it inside a poke item",
    match: (c) => c.includes("connected: true"),
  },
  {
    file: "ewp/concepts/advanced-triggers-no-prefab.mdx",
    reason: "end: is in the mod docs for event triggers but the schema rejects it (schema gap or loose docs)",
    match: (c) => c.includes("end: true"),
  },
];

const wikiPresent = existsSync(DOCS_ROOT);

describe.skipIf(!wikiPresent)("wiki example corpus (Round 6 ticket 05)", () => {
  const fences = wikiPresent ? collectFences() : [];

  it("finds the wiki's yaml examples", () => {
    expect(fences.length).toBeGreaterThan(100);
  });

  // 18 blocks are labelled WRONG; most are "no error, but it does not do what you expect",
  // which a checker cannot see (input for Round 6 ticket 14). Guard the ones it catches today.
  it("still rejects the WRONG examples it rejects today (at least 3 of 18)", () => {
    const wrong = fences.filter((f) => isLabelledWrong(f.code) && !isFragment(f.code));
    const caught = wrong.filter((f) => runStructuralPrecheck(f.code).length > 0);
    expect(wrong.length).toBeGreaterThanOrEqual(18);
    expect(caught.length).toBeGreaterThanOrEqual(3);
  });

  it("has no errors in full-list examples except the known wiki problems", () => {
    const failing = fences.filter((f) => !isFragment(f.code) && !isLabelledWrong(f.code) && hasError(f.code));
    const unexplained = failing.filter((f) => !KNOWN_WIKI_PROBLEMS.some((k) => k.file === f.file && k.match(f.code)));
    expect(
      unexplained.map((f) => `${f.file}: ${firstCodeLine(f.code)}`),
      "new error in a wiki example: fix the example, or the validator if it is a false alarm",
    ).toEqual([]);
  });

  it("drops a known problem from the list once it is fixed", () => {
    const stale = KNOWN_WIKI_PROBLEMS.filter(
      (k) => !fences.some((f) => f.file === k.file && !isFragment(f.code) && !isLabelledWrong(f.code) && k.match(f.code) && hasError(f.code)),
    );
    expect(stale.map((k) => k.reason), "these no longer fail: delete them from KNOWN_WIKI_PROBLEMS").toEqual([]);
  });
});
