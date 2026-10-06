// Test for source-anchor-check.mjs. Run: node --test scripts/source-anchor-check.test.mjs
// Builds a fixture mirror (a real git repo with fixed commit dates) and a fixture provenance file.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { checkAnchors, parseProvenance } from "./source-anchor-check.mjs";

const SCRIPT = path.join(path.dirname(fileURLToPath(import.meta.url)), "source-anchor-check.mjs");

function commit(dir, file, content, date) {
  mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
  writeFileSync(path.join(dir, file), content);
  const env = { ...process.env, GIT_AUTHOR_DATE: `${date}T12:00:00Z`, GIT_COMMITTER_DATE: `${date}T12:00:00Z` };
  const g = (...a) => execFileSync("git", ["-C", dir, "-c", "user.name=t", "-c", "user.email=t@t", ...a], { env, stdio: "ignore" });
  g("add", "-A");
  g("commit", "-m", "c " + file + " " + date);
}

function fixture(provenanceBody) {
  const root = mkdtempSync(path.join(tmpdir(), "anchor-"));
  const mirror = path.join(root, "upstream");
  const repo = path.join(mirror, "valheim-fix");
  mkdirSync(repo, { recursive: true });
  execFileSync("git", ["-C", repo, "init", "-q"], { stdio: "ignore" });
  commit(repo, "Mod/Old.cs", "old", "2026-09-01");
  commit(repo, "Mod/New.cs", "new", "2026-10-01");
  const prov = path.join(root, "diagnosisProvenance.ts");
  writeFileSync(
    prov,
    `const FIX = "valheim-fix/";
const OLD = \`\${FIX}Mod/Old.cs\`;
const NEWF = \`\${FIX}Mod/New.cs\`;
const RECHECK = { checked: "2026-09-20", ewpVersion: "1.60.0" } as const;
const NOT_DATED = { checked: null, ewpVersion: null } as const;
export const T = {
${provenanceBody}
};
`
  );
  return { root, mirror, prov };
}

test("parseProvenance resolves constants, templates and spread dates", () => {
  const fx = fixture(`  "a": { level: "source", files: [OLD, \`\${FIX}Mod/New.cs\`], ...RECHECK, note: "x" },\n  "b": { level: "library", files: [], ...NOT_DATED, note: "y" },\n  "c": { level: "source", files: [NEWF], checked: "2026-10-05", ewpVersion: "1.62.0" },`);
  const src = (await_read(fx.prov));
  const e = parseProvenance(src);
  assert.deepEqual(e.map((x) => x.id), ["a", "b", "c"]);
  assert.deepEqual(e[0].files, ["valheim-fix/Mod/Old.cs", "valheim-fix/Mod/New.cs"]);
  assert.equal(e[0].checked, "2026-09-20");
  assert.equal(e[1].checked, null);
  assert.equal(e[2].checked, "2026-10-05");
  rmSync(fx.root, { recursive: true, force: true });
});

import { readFileSync } from "node:fs";
function await_read(f) { return readFileSync(f, "utf8"); }

test("a rule whose file changed after its check date is listed as DRIFT", () => {
  const fx = fixture(`  "a": { level: "source", files: [NEWF], ...RECHECK, note: "x" },`);
  const f = checkAnchors({ provenance: fx.prov, mirror: fx.mirror });
  assert.equal(f.length, 1);
  assert.equal(f[0].type, "DRIFT");
  assert.match(f[0].text, /Mod\/New\.cs changed 2026-10-01 after check 2026-09-20/);
  const r = spawnSync(process.execPath, [SCRIPT, "--provenance", fx.prov, "--mirror", fx.mirror], { encoding: "utf8" });
  assert.equal(r.status, 3);
  rmSync(fx.root, { recursive: true, force: true });
});

test("a rule whose file did not change since its check date: silent, exit 0", () => {
  const fx = fixture(`  "a": { level: "source", files: [OLD], ...RECHECK, note: "x" },\n  "b": { level: "library", files: [], ...NOT_DATED, note: "y" },`);
  assert.deepEqual(checkAnchors({ provenance: fx.prov, mirror: fx.mirror }), []);
  const r = spawnSync(process.execPath, [SCRIPT, "--provenance", fx.prov, "--mirror", fx.mirror], { encoding: "utf8" });
  assert.equal(r.status, 0);
  assert.equal(r.stdout, "");
  rmSync(fx.root, { recursive: true, force: true });
});

test("a rule with level source and no anchor fails (exit 1)", () => {
  const fx = fixture(`  "a": { level: "source", files: [], ...RECHECK, note: "x" },\n  "b": { level: "docs", files: [OLD], ...NOT_DATED, note: "y" },`);
  const f = checkAnchors({ provenance: fx.prov, mirror: fx.mirror });
  assert.deepEqual(f.map((x) => `${x.type} ${x.id}`), ["NO-ANCHOR a", "NO-ANCHOR b"]);
  const r = spawnSync(process.execPath, [SCRIPT, "--provenance", fx.prov, "--mirror", fx.mirror], { encoding: "utf8" });
  assert.equal(r.status, 1);
  rmSync(fx.root, { recursive: true, force: true });
});

test("an anchor file missing from the mirror is reported as MISSING (exit 1)", () => {
  const fx = fixture(`  "a": { level: "source", files: ["valheim-fix/Mod/Gone.cs"], ...RECHECK, note: "x" },`);
  const f = checkAnchors({ provenance: fx.prov, mirror: fx.mirror });
  assert.equal(f[0].type, "MISSING");
  rmSync(fx.root, { recursive: true, force: true });
});

test("the real provenance file parses (every entry has an id and a level)", () => {
  const real = path.resolve(path.dirname(SCRIPT), "..", "ewp_validator", "src", "diagnosisProvenance.ts");
  const e = parseProvenance(readFileSync(real, "utf8"));
  assert.ok(e.length > 40);
  for (const x of e) {
    for (const f of x.files) assert.match(f, /^valheim-[a-z_]+\/.+/, `${x.id}: ${f}`);
  }
});
