#!/usr/bin/env node
// PreToolUse hook: before Edit/Write lands on a .md/.mdx file, run every
// ```yaml fenced EWP example through ewp_validator's real structural
// checker (the same schema.generated.json / runStructuralPrecheck the
// browser app uses). Catches what guard-script-field-order.cjs can't: that
// hook only checks the RELATIVE ORDER of fields already present in an
// example, never a required field left out entirely (e.g. a `type: change`
// rule missing its `prefab:` line — not an order problem, a shape problem).
// Advisory, not blocking — same spirit as the other content-quality hooks.
//
// Uses the already-built ewp_validator/dist/cli.mjs (a checked-in build
// artifact) rather than rebuilding on every edit — a rebuild calls out to
// the network (schema/generate.mjs re-stamps the current EWP version) and
// would make every markdown edit in the repo wait on that round-trip. If
// dist/cli.mjs is missing or stale, this hook silently does nothing rather
// than block or force a rebuild — run `npm run build:cli` in
// ewp_validator/ to refresh it after a real schema change.
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");
const { extractYamlFences, dedent } = require("./lib/yaml-fences.cjs");

const RELEVANT_EXT = /\.mdx?$/i;
const CLI_PATH = path.join(__dirname, "..", "..", "ewp_validator", "dist", "cli.mjs");

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
  if (!RELEVANT_EXT.test(filePath)) {
    process.exit(0); // not a file this check applies to
  }
  if (!fs.existsSync(CLI_PATH)) {
    process.exit(0); // no prebuilt CLI on disk, skip silently rather than block
  }

  // Same "reconstruct the content this edit is about to PRODUCE" trick as
  // guard-script-field-order.cjs — a hook fires before the write happens.
  let content = null;
  const ti = input.tool_input || {};
  if (typeof ti.content === "string") {
    content = ti.content;
  } else if (typeof ti.old_string === "string" && typeof ti.new_string === "string") {
    if (fs.existsSync(filePath)) {
      try {
        const onDisk = fs.readFileSync(filePath, "utf8");
        content = ti.replace_all
          ? onDisk.split(ti.old_string).join(ti.new_string)
          : onDisk.replace(ti.old_string, ti.new_string);
      } catch (e) {
        content = null;
      }
    }
  }
  if (content == null) process.exit(0);

  let fences = [];
  try {
    fences = extractYamlFences(content);
  } catch (e) {
    process.exit(0);
  }
  if (fences.length === 0) process.exit(0);

  let tmpDir;
  const problems = [];
  try {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "ewp-doc-check-"));
    fences.forEach((fence, idx) => {
      const text = dedent(fence);
      if (!text.trim()) return;
      // A filename ewp_validator's own fileNameCheck already accepts, so
      // this never raises an unrelated "not an EWP structural file" notice
      // on a doc example.
      const tmpFile = path.join(tmpDir, `expand_prefabs_docexample${idx}.yaml`);
      let out = "";
      try {
        fs.writeFileSync(tmpFile, text, "utf8");
        out = execFileSync("node", [CLI_PATH, tmpFile], { encoding: "utf8" });
      } catch (e) {
        // cli.mjs exits 1 when it found real errors; its stdout still has
        // the messages we want. A genuine spawn failure has no stdout —
        // skip that fence rather than surface a Node stack trace.
        out = e && typeof e.stdout === "string" ? e.stdout : e && e.stdout ? e.stdout.toString() : "";
      }
      out
        .split("\n")
        .filter((l) => l.includes("[error]") || l.includes("[warning]"))
        .forEach((l) => {
          // Rewrite the throwaway temp path back to "code block N" so the
          // message reads sensibly against the .mdx file, not a temp file
          // nobody but this hook ever sees.
          problems.push(l.replace(tmpFile, `code block ${idx + 1}`));
        });
    });
  } catch (e) {
    process.exit(0); // never block on a bug in the checker itself
  } finally {
    if (tmpDir) {
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch (e) {
        // best-effort cleanup only
      }
    }
  }

  if (problems.length === 0) {
    process.exit(0);
  }

  const shown = problems.slice(0, 5);
  const more = problems.length > shown.length ? `\n...and ${problems.length - shown.length} more.` : "";

  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "ask",
        permissionDecisionReason:
          `Claude is about to write to ${path.basename(filePath)}.\n` +
          `ewp_validator flagged an EWP script example as structurally invalid:\n` +
          shown.join("\n") +
          more +
          `\nCheck whether it's missing a required field (like prefab:) or otherwise malformed before proceeding.`,
      },
    })
  );
  process.exit(0);
});
