// node --test scripts/check-house-rules.test.mjs
// One test runs every row's fail and pass example (ticket 07 item 54), plus the runner's own cases.
import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import cp from "node:child_process";
import { fileURLToPath } from "node:url";
import { checkRows, runExamples, runShapes, globToRegex } from "./check-house-rules.mjs";

const RUNNER = path.join(path.dirname(fileURLToPath(import.meta.url)), "check-house-rules.mjs");

const ROWS = [
  {
    id: "title-colon", input: "files", severity: "block", files: ["docs/**/*.mdx"], scope: "frontmatter:title",
    forbid: "^[^:\\-]+: ", exceptions: [], message: "Use a dash, not a colon, in a page title.", source: "ew_wiki/AGENTS.md",
    examples: { fail: { "docs/a.mdx": "---\ntitle: Advanced Poke: Mechanics\n---\n" }, pass: { "docs/a.mdx": "---\ntitle: Advanced Poke - Mechanics\n---\n" } },
  },
  {
    id: "old-word", input: "files", severity: "show", files: ["mods/**/Settings.cs"], scope: "line",
    forbid: "Local only\\.", message: "Write Not Server-synced. instead of Local only.",
    examples: { fail: { "mods/X/Settings.cs": "a\n\"Local only.\"\n" }, pass: { "mods/X/Settings.cs": "\"Not Server-synced.\"\n" } },
  },
  {
    id: "complexity", input: "files", severity: "block", files: ["docs/**/*.mdx"], exceptions: ["docs/index.mdx"], scope: "frontmatter:complexity",
    require: ".+", message: "Add complexity: to the top of the page.",
    examples: { fail: { "docs/a.mdx": "---\ntitle: A\n---\n" }, pass: { "docs/a.mdx": "---\ntitle: A\ncomplexity: beginner\n---\n" } },
  },
  {
    id: "image-size", input: "limit", severity: "block", files: ["public/support/*.png"], maxBytes: 10,
    message: "Image over the limit. Ask the user before compressing.",
    examples: { fail: { "public/support/a.png": "0123456789ABC" }, pass: { "public/support/a.png": "0123" } },
  },
];

test("every row has a working fail example and pass example", () => {
  const results = runExamples(ROWS);
  assert.deepStrictEqual(results.filter((r) => !r.ok), []);
  assert.strictEqual(results.length, ROWS.length * 2);
});

test("a row without an example is reported", () => {
  const bad = runExamples([{ id: "x", input: "files", files: ["*"], forbid: "a", message: "m" }]);
  assert.ok(bad.every((r) => !r.ok));
});

test("exceptions skip a file; other files still fail", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hr-t-"));
  fs.mkdirSync(path.join(dir, "docs"));
  fs.writeFileSync(path.join(dir, "docs/index.mdx"), "---\ntitle: Home\n---\n");
  fs.writeFileSync(path.join(dir, "docs/b.mdx"), "---\ntitle: B\n---\n");
  const f = checkRows([ROWS[2]], dir);
  assert.deepStrictEqual(f.map((x) => x.file), ["docs/b.mdx"]);
});

test("one-line opt-out: house-ok marker on the hit line or the line before skips that hit only", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hr-o-"));
  fs.mkdirSync(path.join(dir, "docs"));
  const row = { id: "leak", input: "files", severity: "block", files: ["docs/*.mdx"], forbid: "verified", message: "m" };
  fs.writeFileSync(path.join(dir, "docs/a.mdx"), "a verified table <!-- house-ok: leak -->\nok\n<!-- house-ok: leak -->\nverified again\nverified third\n");
  assert.deepStrictEqual(checkRows([row], dir).map((h) => h.line), [5]);
  const lineRow = { ...row, scope: "line" };
  assert.deepStrictEqual(checkRows([lineRow], dir).map((h) => h.line), [5]);
});

test("glob: ** crosses folders, * does not", () => {
  assert.ok(globToRegex("docs/**/*.mdx").test("docs/a/b/c.mdx"));
  assert.ok(globToRegex("docs/**/*.mdx").test("docs/c.mdx"));
  assert.ok(!globToRegex("docs/*.mdx").test("docs/a/c.mdx"));
});

test("CLI: exit 1 on a block finding, 0 on a show finding only, --examples exit code", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hr-c-"));
  fs.mkdirSync(path.join(dir, "docs"));
  fs.writeFileSync(path.join(dir, "docs/a.mdx"), "---\ntitle: A: B\ncomplexity: beginner\n---\n");
  fs.writeFileSync(path.join(dir, "house-rules.json"), JSON.stringify({ rows: [ROWS[0]] }));
  assert.strictEqual(cp.spawnSync(process.execPath, [RUNNER, "--project", dir]).status, 1);
  fs.writeFileSync(path.join(dir, "house-rules.json"), JSON.stringify({ rows: [{ ...ROWS[0], severity: "show" }] }));
  assert.strictEqual(cp.spawnSync(process.execPath, [RUNNER, "--project", dir]).status, 0);
  assert.strictEqual(cp.spawnSync(process.execPath, [RUNNER, "--project", dir, "--examples"]).status, 0);
});

// ---- Diff and PR body rows (item 54, step 6.4): one example test per row type, then runner cases ----

const LF12 = Array.from({ length: 12 }, (_, i) => `line ${i}`).join("\n") + "\n";
const DIFF_ROWS = [
  {
    id: "diff-comment", input: "diff", severity: "block", files: ["**/*.cs"], forbid: "^\s*//",
    message: "Remove the added comment line before you publish.",
    examples: { fail: { base: { "a.cs": "int x;\n" }, head: { "a.cs": "int x;\n// note\n" } }, pass: { base: { "a.cs": "int x;\n" }, head: { "a.cs": "int x;\nint y;\n" } } },
  },
  {
    id: "diff-check", input: "diff", severity: "block", builtin: "diff-check", message: "Fix the whitespace error or conflict mark that git diff --check found.",
    examples: { fail: { base: { "a.cs": "int x;\n" }, head: { "a.cs": "int x; \n" } }, pass: { base: { "a.cs": "int x;\n" }, head: { "a.cs": "int y;\n" } } },
  },
  {
    id: "whole-file-rewrite", input: "diff", severity: "block", builtin: "whole-file-rewrite", message: "Every line of the file changed. Restore the original line endings.",
    examples: {
      fail: { base: { "a.cs": LF12 }, head: { "a.cs": LF12.replace(/\n/g, "\r\n") } },
      pass: { base: { "a.cs": LF12 }, head: { "a.cs": LF12.replace("line 3", "line three") } },
    },
  },
  {
    id: "stray-files", input: "diff", severity: "block", builtin: "stray-files", message: "Delete the stray file or add it to .gitignore.",
    examples: { fail: { head: { "a.cs": "x\n" }, untracked: { "scratch.txt": "x" } }, pass: { head: { "a.cs": "x\n" } } },
  },
  {
    id: "pr-body-headings", input: "pr-body", severity: "block", require: ["^## Summary", "^## Evidence"],
    message: "Load the pr skill and write the body with its template.",
    examples: { fail: { body: "Fixes a bug.\n" }, pass: { body: "## Summary\nx\n## Evidence\ny\n" } },
  },
];

function scratchRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hr-g-"));
  const g = (...a) => cp.execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@example.invalid", "-c", "core.autocrlf=false", "-c", "commit.gpgsign=false", ...a], { cwd: dir, encoding: "utf8" });
  g("init", "-q");
  fs.writeFileSync(path.join(dir, "a.cs"), "int x;\n");
  g("add", "-A"); g("commit", "-q", "-m", "base");
  return { dir, g };
}

test("diff and pr-body rows: every row type has a working fail and pass example", () => {
  const results = runExamples(DIFF_ROWS);
  assert.deepStrictEqual(results.filter((r) => !r.ok), []);
  assert.strictEqual(results.length, DIFF_ROWS.length * 2);
});

test("diff row: reports the new line number of an added line; house-ok skips it", () => {
  const { dir, g } = scratchRepo();
  fs.writeFileSync(path.join(dir, "a.cs"), "int x;\nint y;\n// one\n// two // house-ok: diff-comment\nint z;\n// four\n");
  g("add", "-A"); g("commit", "-q", "-m", "head");
  const f = checkRows([DIFF_ROWS[0]], dir, null, { base: "HEAD~1" });
  assert.deepStrictEqual(f.map((x) => [x.file, x.line]), [["a.cs", 3], ["a.cs", 6]]);
});

test("diff row: reads a unified diff from a file (no Git needed)", () => {
  const diff = "diff --git a/a.cs b/a.cs\n--- a/a.cs\n+++ b/a.cs\n@@ -1,0 +2,2 @@\n+int y;\n+// note\n";
  const f = checkRows([DIFF_ROWS[0]], os.tmpdir(), [], { diffFileText: diff });
  assert.deepStrictEqual(f.map((x) => [x.file, x.line]), [["a.cs", 3]]);
});

test("diff and pr-body rows are skipped when their input is not given", () => {
  assert.deepStrictEqual(checkRows(DIFF_ROWS, os.tmpdir(), []), []);
});

test("diff row: a missing base gives a clear error", () => {
  const { dir } = scratchRepo();
  assert.throws(() => checkRows([DIFF_ROWS[0]], dir, null, { base: "upstream/main" }), /git fetch upstream/);
});

test("CLI: --base runs diff rows, --pr-body-file runs pr-body rows, exit 1 on a block finding", () => {
  const { dir, g } = scratchRepo();
  fs.writeFileSync(path.join(dir, "a.cs"), "int x;\n// note\n");
  g("add", "-A"); g("commit", "-q", "-m", "head");
  fs.writeFileSync(path.join(dir, "house-rules.json"), JSON.stringify({ rows: DIFF_ROWS.filter((r) => r.id === "diff-comment" || r.id === "pr-body-headings") }));
  const run = (...a) => cp.spawnSync(process.execPath, [RUNNER, "--project", dir, ...a], { encoding: "utf8" });
  assert.strictEqual(run().status, 0);
  const d = run("--base", "HEAD~1");
  assert.strictEqual(d.status, 1);
  assert.match(d.stdout, /diff-comment a\.cs:2/);
  const body = path.join(dir, "body.md");
  fs.writeFileSync(body, "no headings\n");
  assert.match(run("--pr-body-file", body).stdout, /pr-body-headings pr-body missing: \^## Summary/);
  fs.writeFileSync(body, "## Summary\n## Evidence\n");
  assert.strictEqual(run("--pr-body-file", body).status, 0);
  assert.strictEqual(run("--base", "no-such-ref").status, 2);
});

// ---- Shape report (items 59, 60, step 2.5) ----

function wikiCopy(pages) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hr-s-"));
  for (const [name, text] of Object.entries(pages)) {
    fs.mkdirSync(path.dirname(path.join(dir, "src/content/docs", name)), { recursive: true });
    fs.writeFileSync(path.join(dir, "src/content/docs", name), text);
  }
  return dir;
}
const PAGE = (extra = "") => `---\ntitle: Basic Page\ndescription: d\ncomplexity: beginner\n${extra}---\n\n## Part\n\ntext\n`;

test("shape report: lists pages that differ per signature; a fenced # line is not a heading", () => {
  const dir = wikiCopy({
    "a.mdx": PAGE(), "b.mdx": PAGE(), "c.mdx": PAGE(),
    "preparation.mdx": "---\ntitle: Preparation\ndescription: d\n---\n\n## Part\n",
    "index.mdx": "---\ntitle: Overview\ndescription: d\nnext: false\n---\n\n```\n# not a heading\n```\n",
    "d.mdx": "---\ntitle: Basic Page - More\ndescription: d\ncomplexity: beginner\n---\n\n## Part\n",
  });
  const r = Object.fromEntries(runShapes(dir).map((s) => [s.signature, s]));
  assert.deepStrictEqual(r.fields.differing.map((d) => path.basename(d.file)), ["index.mdx", "preparation.mdx"]);
  assert.strictEqual(r.fields.count, 4);
  assert.deepStrictEqual(r.title.differing.map((d) => path.basename(d.file)), ["d.mdx"]);
  assert.deepStrictEqual(r.headings.differing.map((d) => path.basename(d.file)), ["index.mdx"]);
});

test("shape report: an intended entry skips one page and one signature only", () => {
  const dir = wikiCopy({
    "a.mdx": PAGE(), "b.mdx": PAGE(), "c.mdx": PAGE(),
    "index.mdx": "---\ntitle: Overview\ndescription: d\n---\n",
  });
  const intended = [{ file: "src/content/docs/index.mdx", signature: "fields", reason: "home page has no complexity field" }];
  const r = Object.fromEntries(runShapes(dir, {}, intended).map((s) => [s.signature, s]));
  assert.deepStrictEqual(r.fields.differing, []);
  assert.deepStrictEqual(r.headings.differing.map((d) => path.basename(d.file)), ["index.mdx"]);
});

test("CLI: --shapes always exits 0 and prints the differing pages", () => {
  const dir = wikiCopy({ "a.mdx": PAGE(), "b.mdx": PAGE(), "preparation.mdx": "---\ntitle: P\n---\n\n## X\n" });
  const r = cp.spawnSync(process.execPath, [RUNNER, "--project", dir, "--shapes"], { encoding: "utf8" });
  assert.strictEqual(r.status, 0);
  assert.match(r.stdout, /differs: .*preparation\.mdx/);
});
