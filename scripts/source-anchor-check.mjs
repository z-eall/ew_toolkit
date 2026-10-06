#!/usr/bin/env node
// Anchor and drift check for step 3.9 piece P3 (items 20 and 21 (a)).
// The anchor store is ewp_validator/src/diagnosisProvenance.ts: one entry per validator rule with
// level, files (inside the mirrored mod repos), checked (date) and ewpVersion. This script adds NO
// second store. It only reads that file and the local mirror (git log). It writes nothing.
//
//   node scripts/source-anchor-check.mjs [--provenance <ts file>] [--mirror <upstream dir>]
//
// Output, one line each:
//   NO-ANCHOR <id> <why>              a rule with level source or docs has no file or no check date
//   MISSING <id> <file>               the anchor file is not in the mirror (moved or deleted upstream)
//   DRIFT <id> <file> changed <date> after check <date>    re-check this rule
// Exit 0 = clean (silent). 1 = NO-ANCHOR or MISSING (a real fault). 3 = DRIFT only (a list to re-check).
// A file whose last change is older than the shallow clone is not counted as drift.
// The merged stamp check of step 3.7 may call checkAnchors() and print its list at session start.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_PROVENANCE = path.resolve(HERE, "..", "ewp_validator", "src", "diagnosisProvenance.ts");
const DEFAULT_MIRROR = path.resolve(HERE, "..", "..", "valheim-modding", "upstream");

export function parseProvenance(src) {
  const strs = {};
  for (const m of src.matchAll(/^const\s+([A-Z_]+)\s*=\s*"([^"]*)";/gm)) strs[m[1]] = m[2];
  const resolve = (s) => s.replace(/\$\{([A-Z_]+)\}/g, (_, k) => resolve(strs[k] ?? ""));
  for (const m of src.matchAll(/^const\s+([A-Z_]+)\s*=\s*`([^`]*)`;/gm)) strs[m[1]] = resolve(m[2]);
  const dates = {};
  for (const m of src.matchAll(/^const\s+([A-Z_]+)\s*=\s*\{\s*checked:\s*(null|"[^"]*"),\s*ewpVersion:\s*(null|"[^"]*")\s*\}/gm)) {
    dates[m[1]] = { checked: m[2] === "null" ? null : m[2].slice(1, -1) };
  }
  const entries = [];
  for (const line of src.split(/\r?\n/)) {
    const m = line.match(/^\s*"([^"]+)":\s*\{\s*level:\s*"(\w+)",\s*files:\s*\[([^\]]*)\](.*)$/);
    if (!m) continue;
    const [, id, level, filesRaw, rest] = m;
    const files = filesRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => (s.startsWith("`") ? resolve(s.slice(1, -1)) : strs[s] ?? s));
    let checked = null;
    const direct = rest.match(/checked:\s*(null|"([^"]*)")/);
    const spread = rest.match(/\.\.\.([A-Z_]+)/);
    if (direct) checked = direct[2] ?? null;
    else if (spread && dates[spread[1]]) checked = dates[spread[1]].checked;
    entries.push({ id, level, files, checked });
  }
  return entries;
}

const git = (dir, args) => execFileSync("git", ["-C", dir, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();

function lastChange(repoDir, file) {
  try {
    const out = git(repoDir, ["log", "-1", "--format=%H %cs", "--", file]);
    if (!out) return null;
    const [hash, date] = out.split(" ");
    let boundary = false;
    const shallow = path.join(repoDir, ".git", "shallow");
    if (existsSync(shallow)) boundary = readFileSync(shallow, "utf8").split(/\r?\n/).includes(hash);
    return { date, boundary };
  } catch {
    return null;
  }
}

export function checkAnchors({ provenance = DEFAULT_PROVENANCE, mirror = DEFAULT_MIRROR } = {}) {
  const findings = [];
  const entries = parseProvenance(readFileSync(provenance, "utf8"));
  for (const e of entries) {
    if (e.level !== "source" && e.level !== "docs") continue;
    if (e.files.length === 0) {
      findings.push({ type: "NO-ANCHOR", id: e.id, text: "no file" });
      continue;
    }
    if (!e.checked) {
      findings.push({ type: "NO-ANCHOR", id: e.id, text: "no check date" });
      continue;
    }
    for (const f of e.files) {
      const slash = f.indexOf("/");
      const repo = f.slice(0, slash);
      const inner = f.slice(slash + 1);
      const repoDir = path.join(mirror, repo);
      if (!existsSync(path.join(repoDir, inner))) {
        findings.push({ type: "MISSING", id: e.id, text: f });
        continue;
      }
      const ch = lastChange(repoDir, inner);
      if (!ch || ch.boundary) continue;
      if (ch.date > e.checked) findings.push({ type: "DRIFT", id: e.id, text: `${f} changed ${ch.date} after check ${e.checked}` });
    }
  }
  return findings;
}

function main() {
  const argv = process.argv.slice(2);
  const opt = (name, def) => (argv.includes(name) ? path.resolve(argv[argv.indexOf(name) + 1]) : def);
  const findings = checkAnchors({ provenance: opt("--provenance", DEFAULT_PROVENANCE), mirror: opt("--mirror", DEFAULT_MIRROR) });
  for (const f of findings) console.log(`${f.type} ${f.id} ${f.text}`);
  if (findings.some((f) => f.type !== "DRIFT")) process.exit(1);
  process.exit(findings.length ? 3 : 0);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
