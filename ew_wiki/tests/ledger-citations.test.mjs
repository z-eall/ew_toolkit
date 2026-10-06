// node --test ew_wiki/tests/ledger-citations.test.mjs   (from ew_toolkit)
// Every wiki paragraph that makes an ownership claim must cite a row of the code-proof ledger
// (`ledger: T1-03`), every cited row must exist, and the ledger must not be stale.
// Words and rules: scripts/ownership-ledger.cjs. Plan: .scratch/hook-rule-audit, step 3.7.
// Ratchet: ledger-citations.baseline.json lists the paragraphs that had no row id when this test
// was built. A new uncited paragraph fails. A listed paragraph that is now cited or gone also
// fails, so the list can only shrink. LEDGER_STRICT=1 ignores the list and also fails on a stale ledger.
import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const L = require("../../scripts/ownership-ledger.cjs");
const HERE = path.dirname(fileURLToPath(import.meta.url));
const WIKI = path.resolve(HERE, "..");
const TOOLKIT = path.resolve(WIKI, "..");
const PAGES = path.join(WIKI, "src", "content", "docs");
const LEDGER = path.join(TOOLKIT, L.LEDGER_REL);
const STRICT = process.env.LEDGER_STRICT === "1";

const ledgerText = fs.readFileSync(LEDGER, "utf8");
const rows = L.ledgerRows(ledgerText);

// A baseline key is the page path plus the first 60 characters of the paragraph.
const key = (file, text) => `${path.relative(WIKI, file).split(path.sep).join("/")}::${text.trim().replace(/\s+/g, " ").slice(0, 60)}`;

function scan(dir) {
  const hits = [];
  for (const f of L.walk(dir)) {
    for (const p of L.checkPage(fs.readFileSync(f, "utf8"), rows)) hits.push({ ...p, file: f, key: key(f, p.text) });
  }
  return hits;
}

test("ledger has row ids in all three tables, with no duplicates", () => {
  const ids = [...ledgerText.matchAll(/^\| (T[123]-\d+) \|/gm)].map((m) => m[1]);
  assert.strictEqual(new Set(ids).size, ids.length, "duplicate row id");
  for (const t of ["T1", "T2", "T3"]) assert.ok(ids.some((i) => i.startsWith(t + "-")), `no ${t} rows`);
  assert.strictEqual(rows.size, ids.length, "a row has no readable Component name");
});

test("ledger has a version stamp, and is not behind the validator stamp", (t) => {
  const stamp = L.ledgerStamp(ledgerText);
  assert.ok(stamp, "Add a 'Ledger stamp: valheim X.Y.Z' line to the ledger.");
  const saved = JSON.parse(fs.readFileSync(path.join(TOOLKIT, "ewp_validator", "schema", "verified-against.json"), "utf8")).valheim.version;
  if (stamp !== saved) {
    const msg = `Ledger stamp valheim ${stamp} is behind the repo game stamp ${saved}. Run a new sweep, then change the stamp.`;
    if (STRICT) assert.fail(msg);
    t.diagnostic("STALE LEDGER: " + msg);
  }
});

test("a scratch paragraph with an ownership claim and no row id FAILS", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ledger-"));
  try {
    fs.writeFileSync(path.join(dir, "bad.mdx"), "---\ntitle: X\n---\n\nA Container hands ownership to the player. The zone host keeps the rest.\n");
    const hits = scan(dir);
    assert.strictEqual(hits.length, 1);
    assert.match(hits[0].problem, /no ledger row id/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("a scratch paragraph that cites an existing row PASSES, an unknown row FAILS", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ledger-"));
  try {
    fs.writeFileSync(path.join(dir, "ok.mdx"), "A Container hands ownership to the player. {/* ledger: T1-01, T3-01 */}\n");
    assert.deepStrictEqual(scan(dir), []);
    fs.writeFileSync(path.join(dir, "ok.mdx"), "A Container hands ownership to the player. {/* ledger: T1-999 */}\n");
    const hits = scan(dir);
    assert.strictEqual(hits.length, 1);
    assert.match(hits[0].problem, /unknown ledger row T1-999/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("harmless text is not a claim: weak word alone, code fence, front matter", () => {
  const page = "---\ntitle: SetOwner\n---\n\nSet target: owner to reach the client.\n\n```yaml\nparameter: setOwner <pid>\n```\n";
  assert.deepStrictEqual(L.checkPage(page, rows), []);
});

test("every ownership paragraph in the real wiki cites an existing ledger row", () => {
  const hits = scan(PAGES);
  if (STRICT) {
    assert.deepStrictEqual(hits.map((h) => `${h.key} (${h.problem})`), []);
    return;
  }
  const baseline = new Set(JSON.parse(fs.readFileSync(path.join(HERE, "ledger-citations.baseline.json"), "utf8")).uncited);
  const fresh = hits.filter((h) => !baseline.has(h.key)).map((h) => `${h.key} (${h.problem})`);
  assert.deepStrictEqual(fresh, [], "New paragraph without a ledger row id. Cite a row: ledger: T1-03");
  const now = new Set(hits.map((h) => h.key));
  const gone = [...baseline].filter((k) => !now.has(k));
  assert.deepStrictEqual(gone, [], "Baseline entry is fixed or gone. Remove it from ledger-citations.baseline.json.");
});
