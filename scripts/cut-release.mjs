// Publishes a GitHub Release from a notes file someone (a Claude Code session,
// per .scratch/changelog-automation/issues/02-trigger-and-mechanism.md) has
// already drafted from `git log`/diff since the last tag. This script only
// handles the mechanical part: compute the next date-based tag, create it,
// push it, and hand the notes file to `gh release create`. No CI involvement,
// no API calls — stays at $0 per the toolkit's standing cost preference.
//
// Usage: node scripts/cut-release.mjs <notes-file>
import { execFileSync, execSync } from "node:child_process";

const notesFile = process.argv[2];
if (!notesFile) {
  console.error("Usage: node scripts/cut-release.mjs <notes-file>");
  process.exit(1);
}

function run(cmd) {
  return execSync(cmd, { encoding: "utf8" }).trim();
}

const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD, UTC
const existingTags = run(`git tag -l "v${today}*"`)
  .split("\n")
  .filter(Boolean);

// First release of the day stays bare (vYYYY-MM-DD); same-day collisions get
// a -2, -3, ... suffix — no semver judgment call, just a count.
const tag = existingTags.length === 0 ? `v${today}` : `v${today}-${existingTags.length + 1}`;

console.log(`Tagging ${tag}...`);
execFileSync("git", ["tag", tag], { stdio: "inherit" });
execFileSync("git", ["push", "origin", tag], { stdio: "inherit" });

console.log(`Publishing release ${tag} from ${notesFile}...`);
execFileSync("gh", ["release", "create", tag, "--title", tag, "--notes-file", notesFile], {
  stdio: "inherit",
});

console.log(`Done: https://github.com/z-eall/ew_toolkit/releases/tag/${tag}`);
