#!/usr/bin/env node
// PreToolUse hook: before Edit/Write lands on a script-shaped file, check
// that its checklist was opened *since the last qualifying edit* — not just
// "sometime recently." A single read does not cover multiple later writes;
// each write needs its own fresh evidence. Config-driven, same shape as
// guard-source-verify.cjs — adding a future Tool/skill means one row here,
// never new check logic. See docs/agents/hooks-vs-rules.md.
const fs = require("fs");
const path = require("path");

const HUB_ROOT = path.join(__dirname, "..", "..");

// One entry per Tool/skill that writes script-shaped examples.
const CHECKLIST_CONFIGS = [
  {
    name: "ew_wiki",
    contentMatch: /ew_wiki\/src\/content\/docs\//i,
    checklistFile: path.join(HUB_ROOT, "ew_wiki", "docs", "script-writing-checklist.md"),
  },
];

function readTranscriptLines(transcriptPath) {
  if (!transcriptPath || !fs.existsSync(transcriptPath)) return [];
  try {
    return fs
      .readFileSync(transcriptPath, "utf8")
      .split("\n")
      .filter((l) => l.trim().length > 0);
  } catch (e) {
    return [];
  }
}

// Index (0-based) of the last line mentioning a file path matching
// contentMatch — i.e. the most recent PRIOR qualifying edit. -1 if none yet
// (first qualifying edit this session).
function lastQualifyingEditIndex(lines, contentMatch) {
  for (let i = lines.length - 1; i >= 0; i--) {
    if (contentMatch.test(lines[i])) return i;
  }
  return -1;
}

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

  const config = CHECKLIST_CONFIGS.find((c) => c.contentMatch.test(normalized));
  if (!config) {
    process.exit(0); // not a checklist-covered file, allow silently
  }

  const checklistName = path.basename(config.checklistFile);
  const lines = readTranscriptLines(input.transcript_path);

  // Only text AFTER the last qualifying edit counts as fresh evidence — a
  // checklist read that happened before that edit doesn't carry forward to
  // cover this new one. If there's no prior qualifying edit yet, the whole
  // transcript is fair game (nothing to be "since" yet).
  const boundary = lastQualifyingEditIndex(lines, config.contentMatch);
  const relevantLines = boundary === -1 ? lines : lines.slice(boundary + 1);
  const wasOpenedSinceLastEdit = relevantLines.some((l) => l.includes(checklistName));

  if (wasOpenedSinceLastEdit) {
    process.exit(0); // fresh evidence for THIS edit specifically, allow silently
  }

  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "ask",
        permissionDecisionReason:
          `Claude wants to write a ${config.name} script example: ${normalized.split("/").pop()}.\n` +
          `⚠ ${checklistName} was not opened since the last qualifying edit — a stale read from` +
          ` an earlier file doesn't cover this one.\n` +
          `This only proves the file wasn't read recently — not that its rules were followed.`,
      },
    })
  );
  process.exit(0);
});
