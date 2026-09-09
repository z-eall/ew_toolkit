#!/usr/bin/env node
// PreToolUse hook: before Edit/Write lands on any file, check the field
// order inside its EWP-style YAML (a direct .yaml/.yml, or ```yaml fences
// in a .md/.mdx) against ew_toolkit/AGENTS.md's "Script field order".
// Advisory, not blocking — YAML key order is cosmetic and never changes how
// a script runs, so this only asks; it never refuses the edit outright.
// Applies everywhere (not just ew_wiki), since that convention is scoped to
// "any EWP script we write together." See docs/agents/hooks-vs-rules.md.
const fs = require("fs");
const path = require("path");
const { findFieldOrderViolations } = require("./lib/field-order.cjs");

const RELEVANT_EXT = /\.(ya?ml|md|mdx)$/i;

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
  if (!RELEVANT_EXT.test(filePath)) {
    process.exit(0); // not a file this check applies to
  }

  // Reconstruct the content this edit is about to PRODUCE, not what's on
  // disk right now — a hook fires before the write happens, so "check the
  // file" alone would only ever see yesterday's version.
  let content = null;
  const ti = input.tool_input || {};
  if (typeof ti.content === "string") {
    content = ti.content; // Write: full new content is given directly
  } else if (typeof ti.old_string === "string" && typeof ti.new_string === "string") {
    // Edit: apply the same replacement the tool is about to make, onto
    // whatever's on disk now, so the check runs on the resulting file.
    if (fs.existsSync(filePath)) {
      try {
        const onDisk = fs.readFileSync(filePath, "utf8");
        content = ti.replace_all
          ? onDisk.split(ti.old_string).join(ti.new_string)
          : onDisk.replace(ti.old_string, ti.new_string);
      } catch (e) {
        content = null;
      }
    }
  }
  if (content == null) process.exit(0);

  let violations = [];
  try {
    violations = findFieldOrderViolations(filePath, content);
  } catch (e) {
    process.exit(0); // never block on a bug in the checker itself
  }

  if (violations.length === 0) {
    process.exit(0);
  }

  const shown = violations.slice(0, 5);
  const more = violations.length > shown.length ? `\n...and ${violations.length - shown.length} more.` : "";

  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "ask",
        permissionDecisionReason:
          `Claude is about to write to ${path.basename(filePath)}.\n` +
          `Field order (see ew_toolkit/AGENTS.md's "Script field order") looks off:\n` +
          shown.join("\n") +
          more +
          `\nCosmetic only — this never blocks, just flags it in case it's not intentional.`,
      },
    })
  );
  process.exit(0);
});
