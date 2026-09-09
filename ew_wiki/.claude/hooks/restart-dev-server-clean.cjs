#!/usr/bin/env node
// PreToolUse hook: before a Bash command that starts ew_wiki's `astro dev`
// server, kill every stale copy first (see the "stale watcher" memory:
// a partial restart leaves an old process squatting on port 4321 answering
// with old content). This only does the kill step - it cannot fix the
// underlying WSL filesystem-watcher flakiness, just the recovery drill.
const { execSync } = require("child_process");

let raw = "";
process.stdin.on("data", (c) => (raw += c));
process.stdin.on("end", () => {
  let input;
  try {
    input = JSON.parse(raw);
  } catch (e) {
    process.exit(0);
  }

  const command = (input.tool_input && input.tool_input.command) || "";
  const isAstroDevStart = /astro dev/.test(command) && !/pkill/.test(command);

  if (!isAstroDevStart) {
    process.exit(0);
  }

  try {
    execSync(
      'wsl.exe -d Ubuntu -- bash -lc "pkill -9 -f \'astro dev\'; sleep 1; true"',
      { stdio: "ignore" }
    );
  } catch (e) {
    // pkill exits non-zero if nothing was running - that's fine, not an error
  }

  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "allow",
        permissionDecisionReason:
          "Killed any stale `astro dev` processes before starting a fresh one " +
          "(see docs/agents/hooks-vs-rules.md - partial restarts leave an old instance on port 4321).",
      },
    })
  );
  process.exit(0);
});
