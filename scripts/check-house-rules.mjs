#!/usr/bin/env node
// House rules runner (hook-rule-audit, ticket 13; ticket 07 items 53 to 60). One runner, one row format.
// Rows are data in <project>/house-rules.json. A row says where to get the text (input), what to forbid
// or require, and the message (reason plus smallest fix). No packages. Read-only: it writes nothing.
//
// Usage:
//   node check-house-rules.mjs [--project <dir>] [--rules <file>] [--json]   check the files; exit 1 on a block row
//   node check-house-rules.mjs --examples [--rules <file>]                   run every row's fail and pass example
//
// Row fields:
//   id        short name                      severity  "block" (exit 1) or "show" (print only)
//   input     "files" (text of the files) or "limit" (size of the files)
//   files     glob list, relative to the project (** and * only)      exclude   glob list
//   scope     files input only: "file" (whole text, default), "line" (each line), "frontmatter:<key>" (top-of-page value)
//   forbid    regex: a match is a finding        require   regex: no match in the scope is a finding
//   flags     regex flags (default "")            exceptions  list of project-relative files the row skips
//   maxBytes  limit input only: a file over this size is a finding
//   message   reason plus smallest fix            source    pointer to the doc with the full reason
//   examples  { fail: { "<relative name>": "<text>" }, pass: { ... } } (limit rows: use a number, the file size in bytes)
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const SKIP_DIRS = new Set(["node_modules", ".git", "dist", ".astro", "decompiled", "upstream"]);

export function globToRegex(glob) {
  let re = "";
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === "*" && glob[i + 1] === "*") {
      if (glob[i + 2] === "/") { re += "(?:.*/)?"; i += 2; } else { re += ".*"; i += 1; }
    } else if (c === "*") re += "[^/]*";
    else if (c === "?") re += "[^/]";
    else re += c.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  }
  return new RegExp(`^${re}$`);
}

function walk(root, rel = "", out = []) {
  let entries;
  try { entries = fs.readdirSync(path.join(root, rel), { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name)) walk(root, r, out); } else out.push(r);
  }
  return out;
}

// One-line opt-out: the text "house-ok: <row id>" on the hit line or the line before it skips that hit.
function optedOut(lines, i, id) {
  const marker = `house-ok: ${id}`;
  return (lines[i] ?? "").includes(marker) || (lines[i - 1] ?? "").includes(marker);
}

function frontmatterValue(text, key) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (!m) return null;
  const line = m[1].split(/\r?\n/).find((l) => l.startsWith(`${key}:`));
  return line === undefined ? null : line.slice(key.length + 1).trim().replace(/^["']|["']$/g, "");
}

export function checkRows(rows, projectDir, allFiles = walk(projectDir)) {
  const findings = [];
  for (const row of rows) {
    const include = (row.files ?? []).map(globToRegex);
    const exclude = (row.exclude ?? []).map(globToRegex);
    const skip = new Set(row.exceptions ?? []);
    const files = allFiles.filter((f) => include.some((r) => r.test(f)) && !exclude.some((r) => r.test(f)) && !skip.has(f));
    const add = (file, line, extra = "") =>
      findings.push({ id: row.id, severity: row.severity ?? "block", file, line, message: row.message, source: row.source, extra });
    for (const file of files) {
      const full = path.join(projectDir, file);
      if (row.input === "limit") {
        const size = fs.statSync(full).size;
        if (size > row.maxBytes) add(file, 0, `${size} bytes, limit ${row.maxBytes}`);
        continue;
      }
      let text;
      try { text = fs.readFileSync(full, "utf8"); } catch { continue; }
      const scope = row.scope ?? "file";
      const re = (row.forbid ?? row.require) !== undefined ? new RegExp(row.forbid ?? row.require, row.flags ?? "") : null;
      if (!re) continue;
      if (scope === "line") {
        const lines = text.split(/\r?\n/);
        for (let i = 0; i < lines.length; i++) {
          const hit = re.test(lines[i]);
          re.lastIndex = 0;
          if (row.forbid !== undefined && hit && !optedOut(lines, i, row.id)) add(file, i + 1, lines[i].trim().slice(0, 80));
        }
        if (row.require !== undefined && !lines.some((l) => re.test(l))) add(file, 0, "required text is missing");
        continue;
      }
      const subject = scope.startsWith("frontmatter:") ? frontmatterValue(text, scope.slice("frontmatter:".length)) : text;
      if (subject === null) { if (row.require !== undefined) add(file, 0, "required top-of-page field is missing"); continue; }
      if (row.forbid !== undefined) {
        const all = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
        const lines = text.split(/\r?\n/);
        for (const hit of subject.matchAll(all)) {
          if (hit[0] === "") continue;
          if (scope !== "file") { add(file, 0, hit[0].slice(0, 80)); break; }
          const at = text.slice(0, hit.index).split(/\r?\n/).length - 1;
          if (!optedOut(lines, at, row.id)) add(file, at + 1, hit[0].slice(0, 80));
        }
      }
      const hit = re.exec(subject);
      if (row.require !== undefined && !hit) add(file, 0, "required text is missing");
    }
  }
  return findings;
}

export function runExamples(rows) {
  const results = [];
  for (const row of rows) {
    for (const kind of ["fail", "pass"]) {
      const files = row.examples?.[kind];
      if (!files) { results.push({ id: row.id, kind, ok: false, why: "row has no example" }); continue; }
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hr-"));
      for (const [name, text] of Object.entries(files)) {
        fs.mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
        fs.writeFileSync(path.join(dir, name), typeof text === "number" ? "x".repeat(text) : text);
      }
      const f = checkRows([{ ...row, exceptions: [] }], dir).filter((x) => x.id === row.id);
      const ok = kind === "fail" ? f.length > 0 : f.length === 0;
      results.push({ id: row.id, kind, ok, why: ok ? "" : kind === "fail" ? "fail example found nothing" : `pass example found ${f.length}` });
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
  return results;
}

export function loadRules(file) {
  const j = JSON.parse(fs.readFileSync(file, "utf8"));
  return Array.isArray(j) ? { rows: j, intended: [] } : { rows: j.rows ?? [], intended: j.intended ?? [] };
}

function main() {
  const args = process.argv.slice(2);
  const val = (flag) => (args.includes(flag) ? args[args.indexOf(flag) + 1] : undefined);
  const project = path.resolve(val("--project") ?? process.cwd());
  const rulesFile = path.resolve(val("--rules") ?? path.join(project, "house-rules.json"));
  if (!fs.existsSync(rulesFile)) { console.error(`No rules file: ${rulesFile}`); process.exit(2); }
  const { rows } = loadRules(rulesFile);
  if (args.includes("--examples")) {
    const results = runExamples(rows);
    for (const r of results) console.log(`${r.ok ? "ok  " : "FAIL"} ${r.id} (${r.kind}) ${r.why}`);
    process.exit(results.every((r) => r.ok) ? 0 : 1);
  }
  const findings = checkRows(rows, project);
  if (args.includes("--json")) console.log(JSON.stringify(findings, null, 2));
  else {
    for (const f of findings) {
      console.log(`${f.severity.toUpperCase()} ${f.id} ${f.file}${f.line ? ":" + f.line : ""} ${f.extra}\n  ${f.message}${f.source ? ` (see ${f.source})` : ""}`);
    }
    console.log(`${findings.length} finding(s) from ${rows.length} row(s).`);
  }
  process.exit(findings.some((f) => f.severity === "block") ? 1 : 0);
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) main();
