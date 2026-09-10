#!/usr/bin/env node
// PreToolUse hook: before Edit/Write lands on ew_wiki reader content, scan
// the content this edit is about to PRODUCE for phrases ew_wiki/AGENTS.md's
// "Content voice and depth" / "Component conventions" sections already ban
// from reader text: a confirmation badge ("confirmed on X", "officially
// confirmed", "verified"), or attribution to this wiki's own verification
// process (a source's name, a test file, "this session", "cross-checked").
// See "No internal bookkeeping in reader text" and "State a true fact
// plainly — no confirmation badge" in that file for the full rule and why
// it exists — this incident is exactly the shape it was written to catch:
// a source-verification habit (cite what proved a fact) bleeding into
// reader-facing prose instead of staying in docs/sources.md where it
// belongs. Advisory, not blocking — same spirit as the other content
// hooks (guard-doc-example-schema.cjs, guard-script-field-order.cjs).
const fs = require("fs");
const path = require("path");

// One entry per Tool with reader-facing prose this check applies to.
// contentMatch: regex tested against the normalized (forward-slash)
// file_path. Only ew_wiki has this today; add a Tool here rather than
// editing the check logic itself if a second one grows reader prose.
const TOOL_CONFIGS = [
  {
    name: "ew_wiki",
    contentMatch: /ew_wiki\/src\/content\/docs\//i,
  },
];

// Each pattern pairs a regex with the plain-English reason it's banned, so
// the hook's message can say *why*, not just *what matched*. Negative
// lookbehind on "verified" so the allowed uncertainty-flag word
// "unverified" doesn't trip it.
const BANNED_PATTERNS = [
  { re: /\bconfirmed\s+(directly\s+)?(from|on|against)\b/i, why: "a confirmation badge naming a source — state the fact plainly instead" },
  { re: /\bofficially confirmed\b/i, why: "a confirmation badge — state the fact plainly instead" },
  { re: /(?<!un)\bverified\b/i, why: "a confirmation badge — state the fact plainly instead (this doesn't catch \"unverified\", which is the allowed uncertainty flag)" },
  { re: /\bcross-checked\b/i, why: "attribution to this wiki's own verification process — internal bookkeeping, not reader content" },
  { re: /\bthis session\b/i, why: "attribution to when this wiki was edited — internal bookkeeping, not reader content" },
  { re: /\bsource-verified\b/i, why: "internal bookkeeping term — the reader doesn't need to know this wiki's own QA vocabulary" },
  { re: /\btest suite\b/i, why: "names this wiki's own verification source (a test file) — that belongs in docs/sources.md, not the page" },
  { re: /\bscripting\.md['’]s prose\b/i, why: "compares this page against another doc by name — internal bookkeeping, not reader content" },
];

let raw = "";
process.stdin.on("data", (c) => (raw += c));
process.stdin.on("end", () => {
  let input;
  try {
    input = JSON.parse(raw);
  } catch (e) {
    process.exit(0);
  }

  const filePath = (input.tool_input && input.tool_input.file_path) || "";
  const normalized = filePath.replace(/\\/g, "/");

  const config = TOOL_CONFIGS.find((c) => c.contentMatch.test(normalized));
  if (!config) {
    process.exit(0); // not reader-facing content this check applies to
  }

  // Same "reconstruct the content this edit is about to PRODUCE" trick as
  // guard-doc-example-schema.cjs — a hook fires before the write happens.
  let content = null;
  const ti = input.tool_input || {};
  if (typeof ti.content === "string") {
    content = ti.content;
  } else if (typeof ti.new_string === "string") {
    // Only the newly-added text needs checking — old_string already lived
    // on the page (or is being removed), so scanning it would false-flag
    // an edit that's fixing a violation rather than adding one.
    content = ti.new_string;
  }
  if (content == null) process.exit(0);

  const hits = [];
  for (const { re, why } of BANNED_PATTERNS) {
    const m = content.match(re);
    if (m) hits.push(`"${m[0]}" — ${why}`);
  }
  if (hits.length === 0) process.exit(0);

  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "ask",
        permissionDecisionReason:
          `Claude is about to write ${config.name} reader content: ${normalized.split("/").pop()}.\n` +
          `This text this edit adds looks like internal bookkeeping leaking into reader-facing prose (see "No internal bookkeeping in reader text" and "State a true fact plainly" in ${config.name}/AGENTS.md):\n` +
          hits.map((h) => `- ${h}`).join("\n") +
          `\nIf the fact is true and confirmed, state it plainly with no badge. If it's genuinely uncertain, flag confidence only (e.g. "unconfirmed — test this yourself"), never the source that checked it. The source citation itself belongs in docs/sources.md, not the page.`,
      },
    })
  );
  process.exit(0);
});
