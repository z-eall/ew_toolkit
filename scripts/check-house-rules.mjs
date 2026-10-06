#!/usr/bin/env node
// House rules runner (hook-rule-audit, ticket 13; ticket 07 items 53 to 60). One runner, one row format.
// Rows are data in <project>/house-rules.json. A row says where to get the text (input), what to forbid
// or require, and the message (reason plus smallest fix). No packages. Read-only: it writes nothing.
//
// Usage:
//   node check-house-rules.mjs [--project <dir>] [--rules <file>] [--json]   check the files; exit 1 on a block row
//   node check-house-rules.mjs --examples [--rules <file>]                   run every row's fail and pass example
//   node check-house-rules.mjs --shapes [--json]                             shape report: pages that differ from most pages (never fails)
//   Diff and PR body rows run only when you give their input:
//     --base <ref>            run "diff" rows on the lines this branch adds since the merge base with <ref> (a git repo)
//     --diff-file <file>      run forbid rows of input "diff" on a unified diff in a file (builtin rows still need --base)
//     --pr-body-file <file>   run "pr-body" rows on the text of a PR body (use - for stdin)
//
// Row fields:
//   id        short name                      severity  "block" (exit 1) or "show" (print only)
//   input     "files" (text of the files), "limit" (size of the files), "diff" (lines added in a git diff), or "pr-body" (PR body text)
//   files     glob list, relative to the project (** and * only)      exclude   glob list
//   scope     files input only: "file" (whole text, default), "line" (each line), "frontmatter:<key>" (top-of-page value)
//   forbid    regex: a match is a finding        require   regex: no match in the scope is a finding
//   flags     regex flags (default "")            exceptions  list of project-relative files the row skips
//   maxBytes  limit input only: a file over this size is a finding
//   builtin   diff input only: "diff-check" (git diff --check), "whole-file-rewrite" (every line changed; minLines, default 10),
//             "stray-files" (untracked and not ignored). A builtin row needs no forbid. A forbid row checks each added line.
//   require   pr-body input: a regex or a list of regexes. Each one with no match is a finding. forbid can be a list too.
//   message   reason plus smallest fix            source    pointer to the doc with the full reason
//   examples  { fail: { "<relative name>": "<text>" }, pass: { ... } } (limit rows: use a number, the file size in bytes)
//             diff rows: { fail: { base: { "<name>": "<text>" }, head: { ... }, untracked: { ... } } } (base and untracked are optional)
//             pr-body rows: { fail: { "body": "<text>" }, pass: { ... } }
// Top level of the rules file (not a row):
//   rows      the row list (a plain array of rows also works)
//   shape     { files: [glob] } pages for the shape report; default src/content/docs/**/*.mdx
//   intended  [{ file, signature, reason }] the shape report skips that page and signature
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import cp from "node:child_process";
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

function git(dir, args, okCodes = [0]) {
  const r = cp.spawnSync("git", args, { cwd: dir, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
  if (r.error || !okCodes.includes(r.status)) throw new Error(`git ${args.join(" ")} failed in ${dir}: ${(r.stderr || r.error?.message || "").trim()}`);
  return r.stdout;
}

// Added lines per file from a unified diff made with --unified=0: { file: [{ n, text }] }.
export function parseAddedLines(diffText) {
  const out = {};
  let file = null, n = 0;
  for (const line of diffText.split(/\r?\n/)) {
    if (line.startsWith("+++ ")) { file = line.startsWith("+++ b/") ? line.slice(6) : null; if (file) out[file] ??= []; continue; }
    const h = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/.exec(line);
    if (h) { n = Number(h[1]); continue; }
    if (file && line.startsWith("+") && !line.startsWith("+++")) { out[file].push({ n, text: line.slice(1) }); n++; }
  }
  return out;
}

function countLines(text) {
  return text === "" ? 0 : text.split("\n").length - (text.endsWith("\n") ? 1 : 0);
}

function inGlobs(file, row) {
  const include = (row.files ?? ["**"]).map(globToRegex);
  const exclude = (row.exclude ?? []).map(globToRegex);
  return include.some((r) => r.test(file)) && !exclude.some((r) => r.test(file)) && !(row.exceptions ?? []).includes(file);
}

function mergeBase(dir, base) {
  try { return git(dir, ["merge-base", base, "HEAD"]).trim(); } catch {
    throw new Error(`Base "${base}" not found. Run: git fetch upstream (or pass another --base).`);
  }
}

// Rows with input "diff" or "pr-body". Each needs its own input in ctx: ctx.base or ctx.diffFileText, ctx.prBody.
function checkDiffRow(row, projectDir, ctx) {
  const findings = [];
  const add = (file, line, extra = "") =>
    findings.push({ id: row.id, severity: row.severity ?? "block", file, line, message: row.message, source: row.source, extra });
  if (row.input === "pr-body") {
    if (ctx.prBody === undefined) return findings;
    for (const src of [].concat(row.require ?? [])) if (!new RegExp(src, row.flags ?? "m").test(ctx.prBody)) add("pr-body", 0, `missing: ${src}`);
    for (const src of [].concat(row.forbid ?? [])) { const m = new RegExp(src, row.flags ?? "m").exec(ctx.prBody); if (m) add("pr-body", 0, m[0].slice(0, 80)); }
    return findings;
  }
  if (row.builtin === "stray-files") {
    if (ctx.base === undefined) return findings;
    for (const f of git(projectDir, ["ls-files", "--others", "--exclude-standard"]).split(/\r?\n/).filter(Boolean)) {
      if (inGlobs(f, row)) add(f, 0, "untracked and not ignored");
    }
    return findings;
  }
  if (row.builtin) {
    if (ctx.base === undefined) return findings;
    const mb = mergeBase(projectDir, ctx.base);
    if (row.builtin === "diff-check") {
      // git diff --check exits 2 when it finds problems. Each problem line is "<file>:<line>: <problem>".
      const shown = {};
      for (const l of git(projectDir, ["diff", "--check", "--no-color", mb, "HEAD"], [0, 2]).split(/\r?\n/)) {
        const m = /^(.+?):(\d+): (.*)$/.exec(l);
        if (!m || !inGlobs(m[1], row)) continue;
        shown[m[1]] = (shown[m[1]] ?? 0) + 1;
        if (shown[m[1]] <= 5) add(m[1], Number(m[2]), m[3]);
        else if (shown[m[1]] === 6) add(m[1], 0, "more problems in this file, not listed");
      }
    } else if (row.builtin === "whole-file-rewrite") {
      const min = row.minLines ?? 10;
      for (const l of git(projectDir, ["diff", "--numstat", "--no-renames", mb, "HEAD"]).split(/\r?\n/).filter(Boolean)) {
        const [a, d, f] = l.split("\t");
        if (a === "-" || !inGlobs(f, row)) continue;
        let oldN, newN;
        try { oldN = countLines(git(projectDir, ["show", `${mb}:${f}`])); newN = countLines(git(projectDir, ["show", `HEAD:${f}`])); } catch { continue; }
        if (oldN >= min && newN >= min && Number(d) >= oldN && Number(a) >= newN) add(f, 0, `all ${newN} lines changed (line endings?)`);
      }
    } else throw new Error(`Unknown builtin "${row.builtin}" in row ${row.id}`);
    return findings;
  }
  let added;
  if (ctx.diffFileText !== undefined) added = parseAddedLines(ctx.diffFileText);
  else if (ctx.base !== undefined) added = parseAddedLines(git(projectDir, ["diff", "--unified=0", "--no-color", "--no-renames", mergeBase(projectDir, ctx.base), "HEAD"]));
  else return findings;
  const re = new RegExp(row.forbid, row.flags ?? "");
  const marker = `house-ok: ${row.id}`;
  for (const [file, lines] of Object.entries(added)) {
    if (!inGlobs(file, row)) continue;
    lines.forEach((l, i) => {
      if (!re.test(l.text)) return;
      if (l.text.includes(marker) || (lines[i - 1]?.n === l.n - 1 && lines[i - 1].text.includes(marker))) return;
      add(file, l.n, l.text.trim().slice(0, 80));
    });
  }
  return findings;
}

// ctx: { base, diffFileText, prBody }. A diff or pr-body row with no matching input in ctx is skipped.
export function checkRows(rows, projectDir, allFiles = null, ctx = {}) {
  const findings = [];
  for (const row of rows) {
    if (row.input === "diff" || row.input === "pr-body") { findings.push(...checkDiffRow(row, projectDir, ctx)); continue; }
    allFiles ??= walk(projectDir);
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

function writeTree(dir, files) {
  for (const [name, text] of Object.entries(files ?? {})) {
    fs.mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
    fs.writeFileSync(path.join(dir, name), typeof text === "number" ? "x".repeat(text) : text);
  }
}

// A diff example becomes a scratch Git repo: commit "base" files, commit "head" files, leave "untracked" files.
// No autocrlf, so the example text reaches Git as written.
function runDiffExample(row, example) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hr-"));
  try {
    const g = (...a) => git(dir, ["-c", "user.name=hr", "-c", "user.email=hr@example.invalid", "-c", "core.autocrlf=false", "-c", "commit.gpgsign=false", ...a]);
    g("init", "-q");
    writeTree(dir, { ".hr-keep": "keep\n", ...example.base });
    g("add", "-A"); g("commit", "-q", "-m", "base");
    writeTree(dir, example.head);
    g("add", "-A"); g("commit", "-q", "--allow-empty", "-m", "head");
    writeTree(dir, example.untracked);
    return checkRows([{ ...row, exceptions: [] }], dir, null, { base: "HEAD~1" });
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

export function runExamples(rows) {
  const results = [];
  for (const row of rows) {
    for (const kind of ["fail", "pass"]) {
      const files = row.examples?.[kind];
      if (!files) { results.push({ id: row.id, kind, ok: false, why: "row has no example" }); continue; }
      let f;
      if (row.input === "diff") f = runDiffExample(row, files);
      else if (row.input === "pr-body") f = checkRows([row], os.tmpdir(), [], { prBody: Object.values(files)[0] });
      else {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hr-"));
        writeTree(dir, files);
        f = checkRows([{ ...row, exceptions: [] }], dir);
        fs.rmSync(dir, { recursive: true, force: true });
      }
      f = f.filter((x) => x.id === row.id);
      const ok = kind === "fail" ? f.length > 0 : f.length === 0;
      results.push({ id: row.id, kind, ok, why: ok ? "" : kind === "fail" ? "fail example found nothing" : `pass example found ${f.length}` });
    }
  }
  return results;
}

// ---- Shape report (items 59, 60): list pages that differ from most pages. It never fails the build. ----

function shapeFacts(text) {
  const front = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  const fields = front ? front[1].split(/\r?\n/).map((l) => /^([A-Za-z0-9_-]+):/.exec(l)?.[1]).filter(Boolean) : [];
  const title = frontmatterValue(text, "title") ?? "";
  const words = title.split(/\s+/).filter(Boolean);
  const separator = / - /.test(title) ? "dash" : title.includes(":") ? "colon" : "none";
  const big = words.filter((w) => w.length > 3 && /^[A-Za-z]+$/.test(w));
  const casing = big.length === 0 || big.every((w) => /^[A-Z]/.test(w)) ? "title-case" : "other-case";
  // Heading levels outside code fences. Names are free text, so the signature checks level order only (plan difference: item 59 also named heading names).
  const body = front ? text.slice(front[0].length) : text;
  let fence = false;
  const levels = [];
  for (const l of body.split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(l)) { fence = !fence; continue; }
    const m = !fence && /^(#{1,6})\s+\S/.exec(l);
    if (m) levels.push(m[1].length);
  }
  const skips = levels.some((v, i) => i > 0 && v > levels[i - 1] + 1);
  const odd = [levels.length === 0 && "no headings", levels[0] === 1 && "body starts with h1", levels.length && levels[0] > 2 && "starts below h2", skips && "skips a level"].filter(Boolean);
  return {
    title: `${separator}, ${words.length <= 6 ? "up to 6 words" : "over 6 words"}, ${casing}`,
    fields: fields.join(", ") || "(none)",
    headings: odd.join(", ") || "normal (h2 first, no skipped level)",
  };
}

export function runShapes(projectDir, shape = {}, intended = []) {
  const include = (shape.files ?? ["src/content/docs/**/*.mdx"]).map(globToRegex);
  const pages = walk(projectDir).filter((f) => include.some((r) => r.test(f))).sort();
  const facts = new Map(pages.map((p) => [p, shapeFacts(fs.readFileSync(path.join(projectDir, p), "utf8"))]));
  const skipPair = (file, signature) => intended.some((e) => e.file === file && e.signature === signature);
  return ["title", "fields", "headings"].map((signature) => {
    const counts = new Map();
    for (const p of pages) { const v = facts.get(p)[signature]; counts.set(v, (counts.get(v) ?? 0) + 1); }
    const [common, count] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0] ?? ["", 0];
    const differing = pages.filter((p) => facts.get(p)[signature] !== common && !skipPair(p, signature)).map((p) => ({ file: p, value: facts.get(p)[signature] }));
    return { signature, common, count, total: pages.length, differing };
  });
}

export function loadRules(file) {
  const j = JSON.parse(fs.readFileSync(file, "utf8"));
  return Array.isArray(j) ? { rows: j, intended: [], shape: {} } : { rows: j.rows ?? [], intended: j.intended ?? [], shape: j.shape ?? {} };
}

function main() {
  const args = process.argv.slice(2);
  const val = (flag) => (args.includes(flag) ? args[args.indexOf(flag) + 1] : undefined);
  const project = path.resolve(val("--project") ?? process.cwd());
  const rulesFile = path.resolve(val("--rules") ?? path.join(project, "house-rules.json"));
  if (!fs.existsSync(rulesFile) && !args.includes("--shapes")) { console.error(`No rules file: ${rulesFile}`); process.exit(2); }
  const { rows, intended, shape } = fs.existsSync(rulesFile) ? loadRules(rulesFile) : { rows: [], intended: [], shape: {} };
  if (args.includes("--examples")) {
    const results = runExamples(rows);
    for (const r of results) console.log(`${r.ok ? "ok  " : "FAIL"} ${r.id} (${r.kind}) ${r.why}`);
    process.exit(results.every((r) => r.ok) ? 0 : 1);
  }
  if (args.includes("--shapes")) {
    const report = runShapes(project, shape, intended);
    if (args.includes("--json")) console.log(JSON.stringify(report, null, 2));
    else {
      for (const s of report) {
        console.log(`${s.signature}: ${s.count} of ${s.total} pages share "${s.common}"`);
        for (const d of s.differing) console.log(`  differs: ${d.file}  "${d.value}"`);
      }
      console.log("This report is a list to read. A page that differs on purpose goes in the intended list in house-rules.json (file, signature, reason).");
    }
    process.exit(0);
  }
  const ctx = {};
  if (val("--base")) ctx.base = val("--base");
  if (val("--diff-file")) ctx.diffFileText = fs.readFileSync(val("--diff-file"), "utf8");
  if (val("--pr-body-file")) ctx.prBody = fs.readFileSync(val("--pr-body-file") === "-" ? 0 : val("--pr-body-file"), "utf8");
  let findings;
  try { findings = checkRows(rows, project, null, ctx); } catch (e) { console.error(e.message); process.exit(2); }
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
