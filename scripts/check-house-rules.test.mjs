// node --test .agents/check-house-rules.test.mjs
// One test runs every row's fail and pass example (ticket 07 item 54), plus the runner's own cases.
import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import cp from "node:child_process";
import { fileURLToPath } from "node:url";
import { checkRows, runExamples, globToRegex } from "./check-house-rules.mjs";

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
