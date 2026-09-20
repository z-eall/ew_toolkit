// Round 6 ticket 09: public files must not point at the private planning folder
// (.scratch/ is git-ignored, so those links are dead for everyone else).
// State the reason in plain words, or point to a public doc under docs/.
import { execSync } from "node:child_process";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const REPO_ROOT = join(__dirname, "../..");
const CHECKED = /\.(ts|mjs|cjs|astro|css|yml|yaml|mdx)$/;

function trackedFiles(): string[] | null {
  try {
    return execSync("git ls-files", { cwd: REPO_ROOT, stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .split(/\r?\n/)
      .filter(Boolean);
  } catch {
    return null; // not a git checkout (for example an exported zip)
  }
}

describe("no private references in tracked files", () => {
  const files = trackedFiles();
  it.skipIf(files === null)("no tracked code or config file mentions .scratch/", async () => {
    const { readFileSync } = await import("node:fs");
    const self = "ewp_validator/src/noPrivateReferences.test.ts";
    const hits: string[] = [];
    for (const f of files ?? []) {
      if (!CHECKED.test(f) || f === self) continue;
      readFileSync(join(REPO_ROOT, f), "utf8")
        .split(/\r?\n/)
        .forEach((line, i) => {
          if (line.includes(".scratch")) hits.push(`${f}:${i + 1}: ${line.trim().slice(0, 100)}`);
        });
    }
    expect(hits, "point to a public doc under docs/, or write the reason out").toEqual([]);
  });
});
