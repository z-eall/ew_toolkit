// Test for cut-release.mjs (plan step 4.3). Run: node --test scripts/cut-release.test.mjs
// Uses a scratch Git repo and a sample notes file. It never tags the real repo and never publishes.
import test from "node:test";
import assert from "node:assert";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { checkNotes, commitsSinceLastTag, formatCommitList, lastTag, nextTag, prepare } from "./cut-release.mjs";

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), "cut-release.mjs");
const g = (cwd, ...a) => execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@example.com", ...a], { cwd, stdio: "ignore" });
const tags = (cwd) => execFileSync("git", ["tag", "-l"], { cwd, encoding: "utf8" }).trim();

function scratchRepo() {
  const dir = mkdtempSync(join(tmpdir(), "cut-release-"));
  g(dir, "init", "-q");
  const add = (file, msg) => {
    mkdirSync(dirname(join(dir, file)), { recursive: true });
    writeFileSync(join(dir, file), msg);
    g(dir, "add", "-A");
    g(dir, "commit", "-q", "-m", msg);
  };
  add("README.md", "old commit");
  g(dir, "tag", "v2026-01-01");
  add("ew_wiki/page.mdx", "wiki change");
  add("ewp_validator/src/a.ts", "validator change");
  add("shared/nav.ts", "nav change one");
  writeFileSync(join(dir, "both.txt"), "x");
  mkdirSync(join(dir, "ew_wiki"), { recursive: true });
  writeFileSync(join(dir, "ew_wiki", "b.txt"), "x");
  g(dir, "add", "-A");
  g(dir, "commit", "-q", "-m", "two folders");
  return dir;
}

const GOOD = "## Basic Filter\n**What's Changed:**\n- Clearer example\n";
const BAD = "## Site\nWe fixed basic-filter.mdx on the Ew Wiki.\n";

test("commit list since the last tag has the changed folders", () => {
  const dir = scratchRepo();
  try {
    assert.strictEqual(lastTag(dir), "v2026-01-01");
    const c = commitsSinceLastTag(dir);
    assert.deepStrictEqual(c.map((x) => x.subject), ["wiki change", "validator change", "nav change one", "two folders"]);
    assert.deepStrictEqual(c[0].folders, ["ew_wiki"]);
    assert.deepStrictEqual(c[1].folders, ["ewp_validator"]);
    assert.deepStrictEqual(c[3].folders.sort(), [".", "ew_wiki"]);
    const text = formatCommitList(c, "v2026-01-01");
    assert.match(text, /4 commit\(s\) since v2026-01-01/);
    assert.match(text, /wiki change {2}\[ew_wiki\]/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("no tag: every commit counts", () => {
  const dir = mkdtempSync(join(tmpdir(), "cut-release-"));
  try {
    g(dir, "init", "-q");
    writeFileSync(join(dir, "a.txt"), "a");
    g(dir, "add", "-A");
    g(dir, "commit", "-q", "-m", "first");
    assert.strictEqual(lastTag(dir), null);
    assert.strictEqual(commitsSinceLastTag(dir).length, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("checkNotes: clean notes pass", () => {
  assert.deepStrictEqual(checkNotes(GOOD), []);
});

test("checkNotes: every case of the old hook is caught", () => {
  const p = checkNotes(BAD);
  assert.strictEqual(p.length, 3);
  assert.ok(p.some((x) => /heading/.test(x)));
  assert.ok(p.some((x) => /basic-filter\.mdx/.test(x) && /Line 2/.test(x)));
  assert.ok(p.some((x) => /EW Wiki/.test(x)));
});

test("checkNotes: any one of the three headings is enough", () => {
  assert.deepStrictEqual(checkNotes("## X\n**Bug Fixes:**\n- a\n"), []);
  assert.deepStrictEqual(checkNotes("## X\n**What's New:**\n- a\n"), []);
});

test("nextTag counts same-day releases", () => {
  assert.strictEqual(nextTag([], "2026-10-06"), "v2026-10-06");
  assert.strictEqual(nextTag(["v2026-10-06"], "2026-10-06"), "v2026-10-06-2");
});

test("prepare reports a missing notes file", () => {
  const dir = scratchRepo();
  try {
    assert.strictEqual(prepare(dir, join(dir, "nope.md")).problems.length, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("script: bad notes stop before any tag, with the list and the problems", () => {
  const dir = scratchRepo();
  try {
    const notes = join(dir, "notes.md");
    writeFileSync(notes, BAD);
    const r = spawnSync(process.execPath, [SCRIPT, notes], { cwd: dir, encoding: "utf8" });
    assert.strictEqual(r.status, 1);
    assert.match(r.stdout, /wiki change/);
    assert.match(r.stdout, /3 problem\(s\)/);
    assert.match(r.stderr, /--allow-format-issues/);
    assert.strictEqual(tags(dir), "v2026-01-01"); // no new tag
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("script --check: clean notes exit 0, no tag", () => {
  const dir = scratchRepo();
  try {
    const notes = join(dir, "notes.md");
    writeFileSync(notes, GOOD);
    const r = spawnSync(process.execPath, [SCRIPT, "--check", notes], { cwd: dir, encoding: "utf8" });
    assert.strictEqual(r.status, 0);
    assert.match(r.stdout, /Notes check: no problems/);
    assert.strictEqual(tags(dir), "v2026-01-01");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("script with no notes file and no --check prints usage", () => {
  const r = spawnSync(process.execPath, [SCRIPT], { encoding: "utf8" });
  assert.strictEqual(r.status, 1);
  assert.match(r.stderr, /Usage/);
});
