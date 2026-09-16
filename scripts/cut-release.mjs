// Publishes a GitHub Release from a notes file someone (a Claude Code session,
// per .scratch/changelog-automation/issues/02-trigger-and-mechanism.md) has
// already drafted from `git log`/diff since the last tag. This script only
// handles the mechanical part: compute the next date-based tag, create it,
// push it, and hand the notes file to `gh release create`. No CI involvement,
// no API calls — stays at $0 per the toolkit's standing cost preference.
//
// Usage: node scripts/cut-release.mjs <notes-file>
import { execFileSync, execSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const notesFile = process.argv[2];
if (!notesFile) {
  console.error("Usage: node scripts/cut-release.mjs <notes-file>");
  process.exit(1);
}

function run(cmd) {
  return execSync(cmd, { encoding: "utf8" }).trim();
}

/** Calendar date on the machine that cuts the release (not UTC). Matches the validator header's local "last updated" date. */
function localYmd(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const today = localYmd();
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

// Reset CHANGELOG-unreleased.md (see .scratch/changelog-automation/issues/
// 08-unreleased-log-and-push-reminder.md) now that its contents shipped in
// a real release — otherwise the next cycle's raw log would start out
// duplicating everything this release already covers.
const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const unreleasedPath = join(repoRoot, "CHANGELOG-unreleased.md");
if (existsSync(unreleasedPath)) {
  writeFileSync(
    unreleasedPath,
    "# Unreleased\n\n" +
      "Raw commit log since the last release tag, auto-appended by `guard-changelog-unreleased-log.cjs` on every commit. " +
      "Not reader-facing prose — a human/Claude curates this into the real release notes " +
      "(What's New/Changed/Bug Fixes, see .scratch/changelog-automation/issues/07-whats-new-changed-bugfixes-format.md) " +
      "at actual cut-release time, then this file resets to empty for the next cycle.\n\n" +
      "## Unreleased\n\n",
    "utf8"
  );
  console.log(`Reset ${unreleasedPath} for the next cycle.`);
}
