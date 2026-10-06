#!/usr/bin/env node
// EWP script formatter (hook-rule-audit, ticket 07 items 30 and 31). Sorts the fields of EWP scripts into the
// order in scripts/ewp-field-order.json. It reads yaml files and ```yaml fences in md and mdx files.
// It keeps every comment. A comment above a field moves with that field. No packages.
//
// Usage:
//   node format-ewp-scripts.mjs [--check | --write] [path ...]
//   --check   (default) print each script that is out of order, change nothing, exit 1 if there is one
//   --write   rewrite the files that are out of order, exit 0
//   path      file or folder. Default: the wiki pages and guide-source/4-script-examples/ai-written/
//
// Skipped: guide-source (scripts from other people) except 4-script-examples/ai-written/.
// Opt-out: the text `field-order-ok` in a comment on the first line of a rule, or on the line before it,
// skips that rule. The text `field-order-ok: all` on the opening fence line, the line above it, or any line
// of a yaml file skips the whole block or file.
// A field that is not in the data file stays where it is. Only the listed fields move.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const DEFAULT_ORDER_FILE = path.join(HERE, "ewp-field-order.json");
const PROJECT = path.resolve(HERE, "..");
const DEFAULT_TARGETS = [
  "ew_wiki/src/content/docs",
  "ew_wiki/docs/guide-source/4-script-examples/ai-written",
];
const SKIP_DIRS = new Set(["node_modules", ".git", "dist", ".astro", "decompiled", "upstream"]);
const KEY_RE = /^([A-Za-z_][A-Za-z0-9_-]*)\s*:(?:\s|$)/;

export function loadOrder(file = DEFAULT_ORDER_FILE) {
  const j = JSON.parse(fs.readFileSync(file, "utf8"));
  const toRank = (slots) => {
    const r = {};
    slots.forEach((names, i) => names.forEach((n) => { r[n] = i; }));
    return r;
  };
  return { topRank: toRank(j.top), nestedRank: toRank(j.nested), nestedKeys: new Set(j.nestedListKeys) };
}

// guide-source holds scripts from other people. Only ai-written/ is ours.
export function isSkipped(filePath) {
  const p = filePath.replace(/\\/g, "/");
  if (!p.includes("/guide-source/") && !p.startsWith("guide-source/")) return false;
  return !/(^|\/)guide-source\/4-script-examples\/ai-written\//.test(p);
}

const indentOf = (l) => l.length - l.trimStart().length;
const isBlank = (l) => l.trim() === "";
const isComment = (l) => l.trim().startsWith("#");
const isDashAt = (l, indent) => !isBlank(l) && indentOf(l) === indent && /^-(\s|$)/.test(l.trim());
const keyOf = (text) => { const m = KEY_RE.exec(text.trim()); return m ? m[1] : null; };
const optedOut = (lines, i) => /field-order-ok/.test(lines[i] ?? "") || /field-order-ok/.test(lines[i - 1] ?? "");

// Sorts the fields of one list item. `el` starts with the "- key: value" line. Returns the new lines.
function sortEntry(el, level, order, changes, base) {
  const m = /^(\s*)-(\s+)(.*)$/.exec(el[0]);
  if (!m) return el;
  const markerIndent = m[1].length;
  const fieldIndent = markerIndent + 1 + m[2].length;
  const rank = level === "top" ? order.topRank : order.nestedRank;
  const lines = [" ".repeat(fieldIndent) + m[3], ...el.slice(1)];

  // Cut the item into field chunks. A comment line above a field belongs to that field.
  const chunks = [{ key: keyOf(m[3]), lines: [lines[0]], start: 0 }];
  let cur = chunks[0];
  let pending = [];
  for (let k = 1; k < lines.length; k++) {
    const line = lines[k];
    if (isBlank(line) || isComment(line)) { pending.push(line); continue; }
    const isField = indentOf(line) === fieldIndent && !line.trim().startsWith("-") && keyOf(line) !== null;
    if (isField) {
      const c = pending.findIndex((l) => isComment(l) && indentOf(l) <= fieldIndent);
      const keep = c < 0 ? pending : pending.slice(0, c);
      const lead = c < 0 ? [] : pending.slice(c);
      cur.lines.push(...keep);
      cur = { key: keyOf(line), lines: [...lead, line], start: k - lead.length };
      chunks.push(cur);
    } else {
      cur.lines.push(...pending, line);
    }
    pending = [];
  }
  cur.lines.push(...pending);

  // A list under poke, objects, bannedObjects or spawn has its own order.
  if (level === "top") {
    for (const ch of chunks) {
      if (!ch.key || !order.nestedKeys.has(ch.key)) continue;
      const kl = ch.lines.findIndex((l) => !isBlank(l) && !isComment(l));
      if (!new RegExp(`^\\s*${ch.key}\\s*:\\s*(#.*)?$`).test(ch.lines[kl])) continue;
      const body = ch.lines.slice(kl + 1);
      ch.lines = [...ch.lines.slice(0, kl + 1), ...processList(body, "nested", order, changes, base + ch.start + kl + 1)];
    }
  }

  // Put the listed fields in order. A field that is not listed keeps its place.
  const known = chunks.map((c, i) => i).filter((i) => rank[chunks[i].key] !== undefined);
  const sorted = known.map((i) => chunks[i]).sort((a, b) => rank[a.key] - rank[b.key]);
  if (sorted.some((c, n) => c !== chunks[known[n]])) {
    changes.push({ line: base + 1, from: known.map((i) => chunks[i].key), to: sorted.map((c) => c.key) });
  }
  const placed = [...chunks];
  known.forEach((i, n) => { placed[i] = sorted[n]; });

  // Put the "- " marker back on the first field line. Comments that moved to the top sit above it.
  const out = placed.flatMap((c) => c.lines);
  const first = out.findIndex((l) => !isBlank(l) && !isComment(l));
  for (let i = 0; i < first; i++) out[i] = isBlank(out[i]) ? out[i] : m[1] + out[i].trimStart();
  out[first] = m[1] + "-" + m[2] + out[first].slice(fieldIndent);
  return out;
}

// Handles a block of list items. Text before the first item, between items and after the list stays as it is.
function processList(lines, level, order, changes, base) {
  const first = lines.findIndex((l) => !isBlank(l) && !isComment(l));
  if (first < 0 || !/^-(\s|$)/.test(lines[first].trim())) return lines;
  const L = indentOf(lines[first]);
  let stop = lines.length;
  for (let i = first; i < lines.length; i++) {
    if (!isBlank(lines[i]) && !isComment(lines[i]) && indentOf(lines[i]) <= L && !isDashAt(lines[i], L)) { stop = i; break; }
  }
  const starts = [];
  for (let i = first; i < stop; i++) if (isDashAt(lines[i], L)) starts.push(i);
  const out = lines.slice(0, first);
  starts.forEach((s, n) => {
    const e = n + 1 < starts.length ? starts[n + 1] : stop;
    let end = e;
    while (end > s + 1 && (isBlank(lines[end - 1]) || isComment(lines[end - 1]))) end--;
    const entry = lines.slice(s, end);
    out.push(...(optedOut(lines, s) ? entry : sortEntry(entry, level, order, changes, base + s)));
    out.push(...lines.slice(end, e));
  });
  out.push(...lines.slice(stop));
  return out;
}

// Handles one block of yaml text (a whole yaml file, or the inside of one fence).
function formatRegion(text, order, changes, lineOffset) {
  const lines = text.split("\n");
  if (lines.some((l) => /field-order-ok:\s*all/.test(l))) return text;
  const content = lines.filter((l) => !isBlank(l));
  if (content.length === 0) return text;
  const minIndent = Math.min(...content.map(indentOf));
  const prefix = content.find((l) => indentOf(l) === minIndent).slice(0, minIndent);
  const stripped = lines.map((l) => (isBlank(l) ? l : l.slice(minIndent)));
  const local = [];
  const done = processList(stripped, "top", order, local, 0);
  local.forEach((c) => changes.push({ ...c, line: c.line + lineOffset }));
  return done.map((l) => (isBlank(l) ? l : prefix + l)).join("\n");
}

// Returns { text, changes }. `changes` is a list of { line, from, to }. The text keeps its line endings.
export function formatText(filePath, input, order = loadOrder()) {
  const crlf = input.includes("\r\n");
  const text = crlf ? input.replace(/\r\n/g, "\n") : input;
  const changes = [];
  let result;
  if (/\.ya?ml$/i.test(filePath)) {
    result = formatRegion(text, order, changes, 0);
  } else {
    result = text.replace(/(```ya?ml[^\n]*\n)([\s\S]*?)(```)/g, (all, open, body, close, at) => {
      const beforeLines = text.slice(0, at).split("\n");
      const prevLine = beforeLines.length >= 2 ? beforeLines[beforeLines.length - 2] : "";
      if (/field-order-ok:\s*all/.test(open) || /field-order-ok:\s*all/.test(prevLine)) return all;
      const lineOffset = beforeLines.length;
      return open + formatRegion(body, order, changes, lineOffset) + close;
    });
  }
  return { text: crlf ? result.replace(/\n/g, "\r\n") : result, changes };
}

function collect(target, out) {
  let st;
  try { st = fs.statSync(target); } catch { return; }
  if (st.isDirectory()) {
    for (const e of fs.readdirSync(target, { withFileTypes: true })) {
      if (e.isDirectory() && SKIP_DIRS.has(e.name)) continue;
      collect(path.join(target, e.name), out);
    }
  } else if (/\.(mdx?|ya?ml)$/i.test(target)) out.push(target);
}

function main() {
  const args = process.argv.slice(2);
  const write = args.includes("--write");
  const targets = args.filter((a) => !a.startsWith("--"));
  const files = [];
  (targets.length ? targets.map((t) => path.resolve(t)) : DEFAULT_TARGETS.map((t) => path.join(PROJECT, t))).forEach((t) => collect(t, files));
  const order = loadOrder();
  let bad = 0;
  let skipped = 0;
  for (const f of files) {
    if (isSkipped(f)) { skipped++; continue; }
    const before = fs.readFileSync(f, "utf8");
    const { text, changes } = formatText(f, before, order);
    if (changes.length === 0) continue;
    bad++;
    const rel = path.relative(process.cwd(), f) || f;
    for (const c of changes) console.log(`${rel}:${c.line}: fields are out of order (${c.from.join(", ")}). Use: ${c.to.join(", ")}.`);
    if (write) fs.writeFileSync(f, text);
  }
  console.log(`${bad} file(s) ${write ? "rewritten" : "out of order"}, ${files.length - skipped} checked, ${skipped} skipped (guide-source).`);
  if (!write && bad > 0) {
    console.log("Run with --write to fix the order. Add `field-order-ok` in a comment to keep one rule as it is.");
    process.exit(1);
  }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) main();
