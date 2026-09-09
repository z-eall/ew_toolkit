#!/usr/bin/env node
// PreToolUse hook: before Edit/Write lands on any Tool's source-verified
// content, check that a trusted source (that Tool's own docs/sources.md)
// was actually touched recently in this transcript. Generic and
// config-driven - adding a new Tool means adding its own docs/sources.md
// and one line below, never editing the check logic itself. See
// docs/agents/hooks-vs-rules.md and ew_toolkit/AGENTS.md's
// "new Tool needing source-verification" bullet.
const path = require("path");
const { checkRecentSourceEvidence } = require("./lib/source-verify.cjs");

const HUB_ROOT = path.join(__dirname, "..", "..");

// One entry per Tool. contentMatch: regex tested against the normalized
// (forward-slash) file_path. sourcesFile: that Tool's own trusted-sources
// list, relative to HUB_ROOT.
const TOOL_CONFIGS = [
  {
    name: "ew_wiki",
    contentMatch: /ew_wiki\/src\/content\/docs\//i,
    sourcesFile: path.join(HUB_ROOT, "ew_wiki", "docs", "sources.md"),
  },
  {
    name: "ewp_validator",
    contentMatch:
      /ewp_validator\/(src\/(dataFieldValidation|rpcValidation|referenceValidation|structuralPrecheck|formatLint|shapeMismatchDiagnosis|ajvMessages)\.ts|schema\/[\w-]+\.mjs)$/i,
    sourcesFile: path.join(HUB_ROOT, "ewp_validator", "docs", "sources.md"),
  },
];

const RECENCY_WINDOW = 15;

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
    process.exit(0); // not a source-verified file, allow silently
  }

  const { matched, up } = checkRecentSourceEvidence({
    transcriptPath: input.transcript_path,
    sourcesFilePath: config.sourcesFile,
    windowSize: RECENCY_WINDOW,
  });

  const lines = [
    `Claude wants to write ${config.name} content: ${normalized.split("/").pop()}.`,
    up
      ? `✓ A trusted source (see ${config.name}/docs/sources.md) was touched in the last ${RECENCY_WINDOW} transcript entries (${matched.length} match${matched.length > 1 ? "es" : ""}).`
      : `⚠ No trusted source (see ${config.name}/docs/sources.md) was touched in the last ${RECENCY_WINDOW} transcript entries.`,
    "This only proves a fetch happened recently, not that this specific claim is backed by it.",
  ];

  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "ask",
        permissionDecisionReason: lines.join("\n"),
      },
    })
  );
  process.exit(0);
});
