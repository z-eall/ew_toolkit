// Headless command-line wrapper around the same validation pipeline the browser app uses
// (validationPipeline.ts: filename check, structural pre-check, cross-file reference checks).
// Thin wrapper only: no rules live here, so a new rule is picked up for free.
//
// Usage: node dist/cli.mjs <script.yaml> [more.yaml ...]   (several files are checked together,
//        so a data entry defined in one file and used in another resolves)
//        node dist/cli.mjs --version
import { readFileSync } from "node:fs";
import pkg from "../package.json";
import schemaJson from "./schema.generated.json";
import { runFullValidation } from "./validationPipeline";

const args = process.argv.slice(2);
if (args[0] === "--version") {
  const meta = (schemaJson as { _meta?: { ewpVersion?: string | null } })._meta;
  console.log(`ewp-validator ${pkg.version} (schema built for EWP ${meta?.ewpVersion ?? "unknown"})`);
  process.exit(0);
}
if (args.length === 0) {
  console.error("Usage: cli <script.yaml> [more.yaml ...] | --version");
  process.exit(2);
}

const files = args.map((path, i) => ({
  id: String(i),
  path,
  name: path.split(/[/\\]/).pop() ?? path,
  text: readFileSync(path, "utf8"),
}));

// Character offset -> 1-based line number, same mapping main.ts gets from Monaco's
// getPositionAt, done by hand here since there is no editor model.
function lineOf(text: string, offset: number): number {
  let line = 1;
  for (let i = 0; i < offset && i < text.length; i++) if (text[i] === "\n") line++;
  return line;
}

const result = runFullValidation(files);
let errors = 0;
let total = 0;
for (const f of files) {
  const problems = result.get(f.id) ?? [];
  total += problems.length;
  for (const p of problems) {
    if (p.severity === "error") errors++;
    console.log(`${f.path}:${lineOf(f.text, p.range[0])}: [${p.severity}] ${p.message}`);
  }
}
if (total === 0) {
  console.log(`${files.length === 1 ? files[0].path : `${files.length} files`}: no problems found`);
}
process.exit(errors > 0 ? 1 : 0);
