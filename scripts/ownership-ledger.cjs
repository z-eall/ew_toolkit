// Shared helpers for the pid/ownership code-proof ledger
// (ew_wiki/docs/guide-source/3-advanced-guide/EWP_pid_ownership_code_findings.md).
// One copy of the ownership vocabulary. Used by the citation test
// (ew_wiki/tests/ledger-citations.test.mjs) and the stamp check.
// The write-time hook guard-pid-ownership-ledger was retired 2026-10-07; the test replaces it.
const fs = require("fs");
const path = require("path");

const LEDGER_REL = "ew_wiki/docs/guide-source/3-advanced-guide/EWP_pid_ownership_code_findings.md";

// Strong words: one of them alone makes a paragraph an ownership claim.
const STRONG = [
  "<pid>", "<cid>", "ClaimOwnership", "SetOwner", "SetOwnerInternal",
  "ZDOVars.s_owner", "ZDOVars.s_creator", "long_creator", "long_owner",
  "ReleaseZDOS", "zone host",
];
// Weak words: a claim only when the text also names a game component.
// Plain "owner" and "creator" match many harmless sentences (`target: owner`).
const WEAK = ["owner", "creator"];
// Component names too common in plain prose to count as a component.
const GENERIC_COMPONENTS = new Set(["Piece", "Player"]);

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const STRONG_RE = new RegExp(STRONG.map(esc).join("|"), "i");
const WEAK_RE = new RegExp(WEAK.map(esc).join("|"), "i");

// Row ids and the version stamp.
const ROW_ID_RE = /^\| (T[123]-\d+) \|/gm;
const STAMP_RE = /^Ledger stamp:\s*valheim\s+(\d+\.\d+\.\d+)/m;
// Citation inside a paragraph: `ledger: T1-03, T2-04`.
const CITE_RE = /ledger:\s*(T[123]-\d+(?:\s*,\s*T[123]-\d+)*)/gi;

function ledgerRows(text) {
  const rows = new Map(); // id -> component name (first word of the Component cell)
  for (const m of text.matchAll(/^\| (T[123]-\d+) \| ([A-Za-z_][A-Za-z0-9_]*)/gm)) rows.set(m[1], m[2]);
  return rows;
}

function ledgerStamp(text) {
  const m = text.match(STAMP_RE);
  return m ? m[1] : null;
}

function componentNames(rows) {
  return [...new Set(rows.values())].filter((n) => !GENERIC_COMPONENTS.has(n));
}

// Case-sensitive whole-word match against the component names.
function namesComponent(text, components) {
  return components.some((c) => new RegExp(`(?<![A-Za-z0-9_])${esc(c)}(?![A-Za-z0-9_])`).test(text));
}

// True when the text is an ownership claim that needs a ledger row.
function isOwnershipClaim(text, components) {
  return STRONG_RE.test(text) || (WEAK_RE.test(text) && namesComponent(text, components));
}

// The first ownership word found in the text (for a message), or null.
function firstWord(text) {
  const m = text.match(STRONG_RE) || text.match(WEAK_RE);
  return m ? m[0] : null;
}

// Prose paragraphs of a page: no front matter, no fenced code. Blocks split on blank lines.
function paragraphs(source) {
  const lines = source.replace(/\r/g, "").split("\n");
  let i = 0;
  if (lines[0] === "---") { i = lines.indexOf("---", 1) + 1; if (i === 0) i = 0; }
  const out = [];
  let cur = null, fence = false;
  const flush = () => { if (cur) out.push(cur); cur = null; };
  for (; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*(```|~~~)/.test(line)) { fence = !fence; flush(); continue; }
    if (fence) continue;
    if (line.trim() === "") { flush(); continue; }
    if (!cur) cur = { line: i + 1, text: "" };
    cur.text += line + "\n";
  }
  flush();
  return out;
}

// Check one page. Returns a list of { line, problem, text }.
function checkPage(source, rows) {
  const components = componentNames(rows);
  const problems = [];
  for (const p of paragraphs(source)) {
    const cited = [...p.text.matchAll(CITE_RE)].flatMap((m) => m[1].split(/\s*,\s*/));
    const unknown = cited.filter((id) => !rows.has(id.toUpperCase()));
    if (unknown.length) problems.push({ line: p.line, problem: `cites unknown ledger row ${unknown.join(", ")}`, text: p.text });
    else if (!cited.length && isOwnershipClaim(p.text, components)) {
      problems.push({ line: p.line, problem: "ownership paragraph has no ledger row id", text: p.text });
    }
  }
  return problems;
}

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) walk(f, out);
    else if (/\.mdx?$/i.test(e.name)) out.push(f);
  }
  return out;
}

module.exports = { LEDGER_REL, STRONG, WEAK, ledgerRows, ledgerStamp, componentNames, namesComponent, isOwnershipClaim, firstWord, paragraphs, checkPage, walk };
