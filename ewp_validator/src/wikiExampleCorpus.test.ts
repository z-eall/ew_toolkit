// Corpus test (Round 6 ticket 05): run the code examples published in the
// ew_wiki pages through the validator, the way a scripter copying them would.
// - Blocks labelled WRONG: the validator must keep rejecting the ones it rejects today.
// - Blocks that are fragments (not starting a list) are skipped.
// - Every other block must have no error.
// - House rule: a text value never contains ": " (write " = " instead); YAML reads it as a new key.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { runStructuralPrecheck } from "./structuralPrecheck";
import { runFullValidation } from "./validationPipeline";

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

const wikiPresent = existsSync(DOCS_ROOT);

describe.skipIf(!wikiPresent)("wiki example corpus (Round 6 ticket 05)", () => {
  const fences = wikiPresent ? collectFences() : [];

  it("finds the wiki's yaml examples", () => {
    expect(fences.length).toBeGreaterThan(100);
  });

  // 18 blocks are labelled WRONG; most are "no error, but it does not do what you expect",
  // which a checker cannot see (input for Round 6 ticket 14). Guard the ones it catches today.
  it("still rejects the WRONG examples it rejects today (at least 2 of 18)", () => {
    const wrong = fences.filter((f) => isLabelledWrong(f.code) && !isFragment(f.code));
    const caught = wrong.filter((f) => runStructuralPrecheck(f.code).length > 0);
    expect(wrong.length).toBeGreaterThanOrEqual(18);
    expect(caught.length).toBeGreaterThanOrEqual(2);
  });

  // Ticket 18: five of the WRONG examples are silent mistakes the validator now warns about.
  it("warns on the five silent-mistake WRONG examples (and only those pages carry them)", () => {
    const expected: Record<string, string> = {
      "advanced-filter-condition.mdx": "silent-condition-operator",
      "advanced-triggers-change.mdx": "silent-change-needs-trigger-rules",
      "advanced-triggers-no-prefab.mdx": "silent-poke-world-centre",
      "basic-filter.mdx": "silent-filter-weight-part",
      "ewp-key.mdx": "silent-key-store-mix",
      // data: written next to filters: (the page's WRONG example, checked in the full pipeline).
      "advanced-filter-plural.mdx": "ignored-data-with-filter",
    };
    const wrong = fences.filter((f) => isLabelledWrong(f.code));
    // A fragment (starts with `objects:`) is put inside a full entry so the validator can read it.
    const asEntry = (code: string) =>
      isFragment(code) ? "- prefab: Player\n  type: say, test\n" + code.split(/\r?\n/).map((l) => (l ? `  ${l}` : l)).join("\n") : code;
    for (const [page, id] of Object.entries(expected)) {
      const blocks = wrong.filter((f) => f.file.endsWith(page));
      expect(blocks.length, `no WRONG example on ${page}`).toBeGreaterThan(0);
      const idsPerBlock = blocks.map((b) =>
        [...runFullValidation([{ id: "a", name: "expand_prefabs_x.yaml", text: asEntry(b.code) }]).get("a")!].map((p) => p.id as string),
      );
      expect(idsPerBlock.some((ids) => ids.includes(id)), `${page} should warn ${id}`).toBe(true);
    }
  });

  it("has no errors in full-list examples", () => {
    const failing = fences.filter((f) => !isFragment(f.code) && !isLabelledWrong(f.code) && hasError(f.code));
    expect(
      failing.map((f) => `${f.file}: ${firstCodeLine(f.code)}`),
      "error in a wiki example: fix the example, or the validator if it is a false alarm",
    ).toEqual([]);
  });

  // House rule (ew_wiki/AGENTS.md): no ": " inside a value. Write " = " instead.
  it("has no ': ' inside a value in any example", () => {
    const bad: string[] = [];
    for (const f of fences) {
      for (const raw of f.code.split(/\r?\n/)) {
        const line = raw.replace(/\s+#.*$/, "").replace(/^\s*(-\s+)?/, "");
        if (line.startsWith("#") || line.startsWith("{")) continue;
        const m = line.match(/^[\w-]+:\s+(.*)$/); // key: value
        if (m && !/^["'{[]/.test(m[1]) && m[1].includes(": ")) bad.push(`${f.file}: ${raw.trim()}`);
      }
    }
    expect(bad, 'write " = " instead of ": " inside a text value').toEqual([]);
  });
});
