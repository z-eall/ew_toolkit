#!/usr/bin/env node
// Term check for step 3.9 piece P2. Pulls the special terms out of text that is about to be
// written, and asks valheim-modding/scripts/source-lookup.mjs if each one is in the local source.
// It checks the RESULT (is the term real), not whether the agent looked (item 18).
//
// Read only: writes nothing, calls source-lookup as a child process (offline, no network).
//
// v1 rules (what counts as a term):
//   ew_wiki .mdx page: in fenced yaml blocks - top-level and list-entry keys (kind key), `type:`
//     trigger names (kind trigger), `<name...>` function references (kind function). In inline
//     code spans - `<name...>` (function), `key:` (key), `m_field` (kind text, ask only).
//     Prose words are NOT checked. A yaml block marked as a bad example is skipped.
//   ewp_validator src/*.ts: only inside string literals - `<name...>` function references and
//     `type: name` triggers.
// Severity: key, trigger, function -> "block"; text (component and field names) -> "ask".
//
// CLI:  node source-term-check.cjs <file>      lists the unknown terms; exit 1 if any, 0 if none,
//                                              2 if source-lookup could not judge.
"use strict";
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const HERE = __dirname;
const WORKSPACE_ROOT = path.resolve(HERE, "..", "..");
const DEFAULT_LOOKUP = path.join(WORKSPACE_ROOT, "valheim-modding", "scripts", "source-lookup.mjs");
const DEFAULT_ALLOWLIST = path.join(HERE, "source-terms-ok.txt");
const MAX_TERMS_PER_KIND = 40;
const MAX_TEXT_TERMS = 8;

const WIKI_RE = /ew_wiki\/src\/content\/docs\/.+\.mdx$/i;
const VALIDATOR_RE =
  /ewp_validator\/src\/(?!(?:main|confirmModal|fileView|fileIngestion|zip|zipWorker|cli|focusedProblem)\.ts$)[A-Za-z]+\.ts$/i;

function classify(filePath) {
  const p = String(filePath || "").replace(/\\/g, "/");
  if (WIKI_RE.test(p)) return "wiki";
  if (VALIDATOR_RE.test(p)) return "validator";
  return null;
}

const FENCE_RE = /```ya?ml\r?\n([\s\S]*?)```/g;
const BAD_MARK = /\b(bad|wrong|invalid|broken|mistake|do not|don't|never)\b/i;
const FN_RE = /<([a-z][a-z0-9]*)(?=[_>])/g;

function stripComment(line) {
  return /^\s*#/.test(line) ? "" : line.replace(/\s+#.*$/, "");
}

function fencesOf(text) {
  const out = [];
  let m;
  FENCE_RE.lastIndex = 0;
  while ((m = FENCE_RE.exec(text))) {
    const before = text.slice(Math.max(0, m.index - 240), m.index).split(/\r?\n/).slice(-3).join("\n");
    out.push({ body: m[1], start: m.index, end: m.index + m[0].length, before });
  }
  return out;
}

function add(map, kind, term, severity, where) {
  const k = `${kind}:${term}`;
  if (!map.has(k)) map.set(k, { kind, term, severity, where });
}

function extractFromYamlBlock(body, map) {
  const firstComment = (body.split(/\r?\n/).find((l) => /^\s*#/.test(l)) || "");
  if (BAD_MARK.test(firstComment)) return;
  for (const raw of body.split(/\r?\n/)) {
    const line = stripComment(raw);
    if (!line.trim()) continue;
    const km = line.match(/^\s*(?:-\s+)?([A-Za-z_][\w]*)\s*:(?:\s|$)/);
    if (km) {
      const key = km[1];
      if (key === "type") {
        const tm = line.match(/^\s*(?:-\s+)?type\s*:\s*([A-Za-z]+)/);
        if (tm) add(map, "trigger", tm[1], "block", "yaml");
      }
      add(map, "key", key, "block", "yaml");
    }
    let f;
    FN_RE.lastIndex = 0;
    while ((f = FN_RE.exec(line))) add(map, "function", f[1], "block", "yaml");
  }
}

function extractFromProse(prose, map) {
  const spans = prose.match(/`[^`\n]+`/g) || [];
  for (const s of spans) {
    const t = s.slice(1, -1).trim();
    const fm = t.match(/^<([a-z][a-z0-9]*)(?=[_>])/);
    if (fm) add(map, "function", fm[1], "block", "span");
    else if (/^m_[A-Za-z0-9]+$/.test(t)) add(map, "text", t, "ask", "span");
    else if (/^[a-z][A-Za-z0-9]*:$/.test(t)) add(map, "key", t.slice(0, -1), "block", "span");
  }
}

function extractFromTs(text, map) {
  const lits = text.match(/"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`/g) || [];
  for (const lit of lits) {
    const body = lit.slice(1, -1);
    let f;
    FN_RE.lastIndex = 0;
    while ((f = FN_RE.exec(body))) add(map, "function", f[1], "block", "ts");
    const tm = body.match(/(?:^|[\s{,])type\s*:\s*([a-z]+)\b/);
    if (tm) add(map, "trigger", tm[1], "block", "ts");
  }
}

// Returns [{ kind, term, severity, where }] for the text that is being added.
function extractTerms(filePath, text) {
  const cls = classify(filePath);
  const map = new Map();
  if (!cls || typeof text !== "string") return [];
  if (cls === "wiki") {
    const fences = fencesOf(text);
    let prose = "";
    let last = 0;
    for (const f of fences) {
      prose += text.slice(last, f.start) + "\n";
      last = f.end;
      if (!BAD_MARK.test(f.before)) extractFromYamlBlock(f.body, map);
    }
    prose += text.slice(last);
    extractFromProse(prose, map);
  } else {
    const code = text
      .split(/\r?\n/)
      .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
      .join("\n");
    extractFromTs(code, map);
  }
  return [...map.values()];
}

function loadAllowlist(file) {
  const set = new Set();
  try {
    for (const raw of fs.readFileSync(file || DEFAULT_ALLOWLIST, "utf8").split(/\r?\n/)) {
      const l = raw.replace(/#.*$/, "").trim();
      if (l) set.add(l.toLowerCase());
    }
  } catch (e) {
    /* no list: nothing allowed */
  }
  return set;
}

// Runs the lookup for every term. Returns { unknown: [terms], skipped: string|null }.
// skipped is set when source-lookup could not judge (folder missing, stale, crash): the caller
// must then allow, never block on a tool failure.
function checkTerms(terms, opts = {}) {
  const lookup = opts.lookupScript || process.env.SOURCE_LOOKUP_SCRIPT || DEFAULT_LOOKUP;
  const allow = opts.allowlist || loadAllowlist(opts.allowlistFile);
  if (!fs.existsSync(lookup)) return { unknown: [], skipped: "source-lookup script not found" };
  const todo = terms.filter((t) => !allow.has(t.term.toLowerCase()) && !allow.has(`${t.kind}:${t.term}`.toLowerCase()));
  const unknown = [];
  for (const kind of ["key", "trigger", "function", "text"]) {
    let group = todo.filter((t) => t.kind === kind);
    if (!group.length) continue;
    group = group.slice(0, kind === "text" ? MAX_TEXT_TERMS : MAX_TERMS_PER_KIND);
    const args = [lookup, "--offline", "--json", "--kind", kind, ...(opts.lookupArgs || []), ...group.map((t) => t.term)];
    const r = spawnSync(process.execPath, args, { encoding: "utf8", timeout: opts.timeoutMs || 30000 });
    let parsed = null;
    try {
      parsed = JSON.parse(r.stdout);
    } catch (e) {
      return { unknown: [], skipped: `source-lookup gave no JSON (exit ${r.status})` };
    }
    if (parsed.problems && parsed.problems.length) return { unknown: [], skipped: parsed.problems[0] };
    for (const res of parsed.results) {
      if (!res.found) unknown.push(group.find((g) => g.term === res.term));
    }
  }
  return { unknown: unknown.filter(Boolean), skipped: null };
}

module.exports = { classify, extractTerms, loadAllowlist, checkTerms, DEFAULT_LOOKUP };

if (require.main === module) {
  const file = process.argv[2];
  if (!file) {
    console.error("usage: node source-term-check.cjs <file>");
    process.exit(64);
  }
  const text = fs.readFileSync(file, "utf8");
  const terms = extractTerms(file, text);
  const { unknown, skipped } = checkTerms(terms);
  if (skipped) {
    console.log(`SKIPPED ${skipped}`);
    process.exit(2);
  }
  for (const u of unknown) console.log(`UNKNOWN ${u.kind} ${u.term} (${u.severity})`);
  console.log(`${terms.length} term(s) checked, ${unknown.length} unknown.`);
  process.exit(unknown.length ? 1 : 0);
}
