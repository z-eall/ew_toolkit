#!/usr/bin/env node
// PreToolUse hook: hard-block `npm install`/`npm ci` on Windows inside
// ew_toolkit. See docs/agents/hooks-vs-rules.md and
// ~/.claude/projects/.../memory/ew-toolkit-lock-linux.md for why -
// Windows npm writes a package-lock.json that breaks Linux CI.
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
  const isNpmInstall = /\bnpm\s+(install|ci)\b/.test(command);

  if (!isNpmInstall || process.platform !== "win32") {
    process.exit(0);
  }

  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason:
          "Blocked: npm install/ci on Windows writes a package-lock.json that breaks Linux CI " +
          "(esbuild platform-package collision, bit this repo twice on 2026-08-17). " +
          "Regenerate the lockfile in WSL instead - see docs/agents/hooks-vs-rules.md.",
      },
    })
  );
  process.exit(0);
});
