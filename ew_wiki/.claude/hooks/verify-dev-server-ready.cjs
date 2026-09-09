#!/usr/bin/env node
// PostToolUse hook: after a Bash command that starts ew_wiki's `astro dev`
// server, poll port 4321 with a real curl (from inside WSL, matching how the
// "stale watcher" memory verifies it) before letting Claude report the
// server as ready. Cold start takes ~18-20s, so this polls rather than
// checking once. See docs/agents/hooks-vs-rules.md and the
// project_ew_wiki_astro_dev_stale_watcher memory for why a bare port-up
// check isn't enough on its own but is what this hook covers (content
// freshness after edits is still the memory's job, not this hook's).
const { execSync } = require("child_process");

const PORT = 4321;
const MAX_ATTEMPTS = 20; // ~40s at 2s between attempts
const POLL_DELAY_CMD = 'wsl.exe -d Ubuntu -- bash -lc "sleep 2"';
// astro.config.mjs sets base: '/ew_wiki/' - the root path 404s even when
// the server is fully up, so this must check the real base path.
const CURL_CMD = `wsl.exe -d Ubuntu -- bash -lc "curl -sf -o /dev/null -w '%{http_code}' http://localhost:${PORT}/ew_wiki/ 2>/dev/null"`;

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

  let up = false;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const code = execSync(CURL_CMD, { encoding: "utf8" }).trim();
      if (code === "200") {
        up = true;
        break;
      }
    } catch (e) {
      // curl failed (port not open yet, or non-2xx) - keep polling
    }
    if (attempt < MAX_ATTEMPTS) {
      try {
        execSync(POLL_DELAY_CMD);
      } catch (e) {}
    }
  }

  if (up) {
    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PostToolUse",
          additionalContext:
            `astro dev verified responding on port ${PORT} (curl 200) - safe to report the server as ready.`,
        },
      })
    );
    process.exit(0);
  }

  process.stdout.write(
    JSON.stringify({
      decision: "block",
      reason:
        `astro dev did not respond with HTTP 200 on port ${PORT} after ` +
        `${MAX_ATTEMPTS * 2}s of polling via curl. Do not report the dev ` +
        `server as ready - check /tmp/astro.log inside WSL for a startup ` +
        `error before trying again.`,
    })
  );
  process.exit(0);
});
