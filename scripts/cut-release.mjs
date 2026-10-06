// Cuts a GitHub Release from a notes file that someone (a Claude Code session) drafted from the
// commit list that this script prints. Steps:
//   1. Print every commit since the last tag, with the folder each commit changed.
//   2. Check the notes file (headings, raw page file names, brand casing). On a problem, stop and
//      list the problems. The flag --allow-format-issues lets you publish anyway.
//   3. Compute the next date-based tag, create it, push it, hand the notes to `gh release create`.
// No CI involvement, no API calls: this stays at $0 per the toolkit's standing cost preference.
// The cut needs the user's OK. Ticket 07 item 33 (plan step 4.3) moved the list and the checks here
// from three hooks.
//
// Usage:
//   node scripts/cut-release.mjs <notes-file> [--allow-format-issues]
//   node scripts/cut-release.mjs --check [notes-file]   (list and checks only: no tag, no publish)
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

function git(args, cwd) {
  return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
}

/** Newest tag reachable from HEAD, or null when the repo has no tag. */
export function lastTag(cwd) {
  try {
    return git(["describe", "--tags", "--abbrev=0"], cwd) || null;
  } catch {
    return null;
  }
}

/**
 * Commits since the last tag, oldest first: [{ hash, subject, folders }].
 * folders = the top-level folders that the commit changed (files in the repo root show as ".").
 */
export function commitsSinceLastTag(cwd) {
  const tag = lastTag(cwd);
  let out;
  try {
    out = git(["log", "--reverse", "--name-only", "--format=@@%h %s", tag ? `${tag}..HEAD` : "HEAD"], cwd);
  } catch {
    return [];
  }
  const commits = [];
  for (const line of out.split(/\r?\n/)) {
    if (line.startsWith("@@")) {
      const text = line.slice(2);
      const sp = text.indexOf(" ");
      commits.push({ hash: text.slice(0, sp), subject: text.slice(sp + 1), folders: [] });
    } else if (line.trim() && commits.length) {
      const first = line.includes("/") ? line.split("/")[0] : ".";
      const c = commits[commits.length - 1];
      if (!c.folders.includes(first)) c.folders.push(first);
    }
  }
  return commits;
}

export function formatCommitList(commits, tag) {
  const head = tag ? `${commits.length} commit(s) since ${tag}:` : `${commits.length} commit(s), no tag yet:`;
  return [head, ...commits.map((c) => `  ${c.hash} ${c.subject}  [${c.folders.join(", ") || "no files"}]`)].join("\n");
}

const REQUIRED_HEADINGS = [/\*\*What's New:\*\*/i, /\*\*What's Changed:\*\*/i, /\*\*Bug Fixes:\*\*/i];

/**
 * Checks reader-facing release notes. Returns a list of problem texts (empty list = clean).
 * Same cases as the retired guard-changelog-release-format hook, minus the old-heading check
 * (ticket 07 item 33 (4): obsolete).
 */
export function checkNotes(content) {
  const problems = [];
  if (!REQUIRED_HEADINGS.some((re) => re.test(content))) {
    problems.push(`No "What's New:", "What's Changed:" or "Bug Fixes:" heading. Use at least one of them under a "## <Tool name>" heading.`);
  }
  content.split(/\r?\n/).forEach((line, i) => {
    const mdx = line.match(/\b[\w-]+\.mdx\b/);
    if (mdx) problems.push(`Line ${i + 1}: raw file name "${mdx[0]}". Use the real page title. The reader does not know file names.`);
    if (/\bEw Wiki\b/.test(line)) problems.push(`Line ${i + 1}: write "EW Wiki", not "Ew Wiki".`);
  });
  return problems;
}

/** First release of the day stays bare (vYYYY-MM-DD). Same-day releases get -2, -3, and so on. */
export function nextTag(existingTagsToday, today) {
  return existingTagsToday.length === 0 ? `v${today}` : `v${today}-${existingTagsToday.length + 1}`;
}

/** Calendar date on the machine that cuts the release (not UTC). Matches the validator header's local "last updated" date. */
export function localYmd(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Runs the list and the checks. Returns { problems, text } and never tags or publishes. */
export function prepare(cwd, notesFile) {
  const out = [formatCommitList(commitsSinceLastTag(cwd), lastTag(cwd))];
  let problems = [];
  if (notesFile) {
    if (!existsSync(notesFile)) {
      problems = [`Notes file not found: ${notesFile}`];
    } else {
      problems = checkNotes(readFileSync(notesFile, "utf8"));
    }
    out.push(problems.length ? `Notes check: ${problems.length} problem(s):\n` + problems.map((p) => `  - ${p}`).join("\n") : "Notes check: no problems.");
  }
  return { problems, text: out.join("\n\n") };
}

function main(argv) {
  const allow = argv.includes("--allow-format-issues");
  const checkOnly = argv.includes("--check");
  const notesFile = argv.find((a) => !a.startsWith("--"));
  if (!notesFile && !checkOnly) {
    console.error("Usage: node scripts/cut-release.mjs <notes-file> [--allow-format-issues]\n       node scripts/cut-release.mjs --check [notes-file]");
    process.exit(1);
  }

  const { problems, text } = prepare(process.cwd(), notesFile);
  console.log(text);
  if (checkOnly) process.exit(problems.length ? 1 : 0);
  if (problems.length && !allow) {
    console.error("\nStopped before the tag. Fix the notes, or run again with --allow-format-issues to publish anyway.");
    process.exit(1);
  }

  const today = localYmd();
  const existing = git(["tag", "-l", `v${today}*`], process.cwd()).split("\n").filter(Boolean);
  const tag = nextTag(existing, today);

  console.log(`\nTagging ${tag}...`);
  execFileSync("git", ["tag", tag], { stdio: "inherit" });
  execFileSync("git", ["push", "origin", tag], { stdio: "inherit" });

  console.log(`Publishing release ${tag} from ${notesFile}...`);
  execFileSync("gh", ["release", "create", tag, "--title", tag, "--notes-file", notesFile], { stdio: "inherit" });
  console.log(`Done: https://github.com/z-eall/ew_toolkit/releases/tag/${tag}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main(process.argv.slice(2));
