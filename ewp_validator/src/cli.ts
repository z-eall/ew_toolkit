// Headless CLI wrapper around the same validation pipeline the browser app
// uses (see main.ts / fileManager.ts). Locked scope, see memory
// project_ewp_script_skill_design.md: thin wrapper only, no logic duplicated
// here — checkFileName and runStructuralPrecheck are the same pure functions
// the browser calls, so a fix or new rule there is picked up here for free.
//
// Usage: node dist/cli.mjs <path-to-script.yaml>
import { readFileSync } from "node:fs";
import { checkFileName } from "./fileNameCheck";
import { runStructuralPrecheck, type Problem } from "./structuralPrecheck";

const path = process.argv[2];
if (!path) {
  console.error("Usage: cli <path-to-script.yaml>");
  process.exit(2);
}

const text = readFileSync(path, "utf8");

// Character offset -> 1-based line number, same mapping main.ts gets from
// Monaco's getPositionAt — done by hand here since there's no editor model.
const lineStarts: number[] = [0];
for (let i = 0; i < text.length; i++) if (text[i] === "\n") lineStarts.push(i + 1);
function lineOf(offset: number): number {
  let lo = 0, hi = lineStarts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (lineStarts[mid] <= offset) lo = mid;
    else hi = mid - 1;
  }
  return lo + 1;
}

const problems: Problem[] = [];
const nameCheck = checkFileName(path.split(/[/\\]/).pop() ?? path);
if (nameCheck.problem) problems.push(nameCheck.problem);
problems.push(...runStructuralPrecheck(text));

if (problems.length === 0) {
  console.log(`${path}: valid, no problems found`);
  process.exit(0);
}

for (const p of problems) {
  console.log(`${path}:${lineOf(p.range[0])}: [${p.severity}] ${p.message}`);
}
const errorCount = problems.filter((p) => p.severity === "error").length;
process.exit(errorCount > 0 ? 1 : 0);
