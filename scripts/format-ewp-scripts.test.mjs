// node --test scripts/format-ewp-scripts.test.mjs
// Cases for the EWP script formatter: order, kept comments, same result on a second run, opt-out, skip rule, check mode.
import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import cp from "node:child_process";
import { fileURLToPath } from "node:url";
import { formatText, isSkipped, loadOrder } from "./format-ewp-scripts.mjs";

const TOOL = path.join(path.dirname(fileURLToPath(import.meta.url)), "format-ewp-scripts.mjs");
const order = loadOrder();
const fmt = (name, text) => formatText(name, text, order);

test("sorts top-level fields and keeps comments with their field", () => {
  const src = [
    "# Header for the whole script.",
    "- type: create # trailing note",
    "  # about the prefab",
    "  prefab: Boar",
    "  exec: 1",
    "",
  ].join("\n");
  const { text, changes } = fmt("a.yaml", src);
  assert.strictEqual(changes.length, 1);
  assert.strictEqual(
    text,
    [
      "# Header for the whole script.",
      "# about the prefab",
      "- prefab: Boar",
      "  type: create # trailing note",
      "  exec: 1",
      "",
    ].join("\n")
  );
});

test("a second run changes nothing", () => {
  const src = "- poke: x\n  # why\n  data: int, a, 1\n  prefab: P\n  log: hi\n  injectData: z\n";
  const once = fmt("a.yaml", src).text;
  const twice = fmt("a.yaml", once);
  assert.strictEqual(twice.text, once);
  assert.strictEqual(twice.changes.length, 0);
});

test("injectData goes directly after data, and log goes before poke", () => {
  const src = "- poke: x\n  log: hi\n  injectData: z\n  data: int, a, 1\n  command: c\n  prefab: P\n";
  const lines = fmt("a.yaml", src).text.trim().split("\n");
  assert.deepStrictEqual(lines.map((l) => l.replace(/^- /, "  ").split(":")[0].trim()), ["prefab", "data", "injectData", "command", "log", "poke"]);
});

test("sorts the fields inside a poke list and keeps a block value together", () => {
  const src = [
    "- prefab: A",
    "  poke:",
    "  - delay: 2",
    "    # target",
    "    filter: |",
    "      line one",
    "      line two",
    "    prefab: B",
    "  - prefab: C",
    "    parameter: 5",
    "    position: 1,2,3",
    "",
  ].join("\n");
  const { text, changes } = fmt("a.yaml", src);
  assert.strictEqual(changes.length, 2);
  assert.strictEqual(
    text,
    [
      "- prefab: A",
      "  poke:",
      "  - prefab: B",
      "    # target",
      "    filter: |",
      "      line one",
      "      line two",
      "    delay: 2",
      "  - prefab: C",
      "    position: 1,2,3",
      "    parameter: 5",
      "",
    ].join("\n")
  );
});

test("a field that is not in the data file stays in its place", () => {
  const src = "- type: create\n  chance: 0.5\n  prefab: Boar\n";
  const { text } = fmt("a.yaml", src);
  assert.strictEqual(text, "- prefab: Boar\n  chance: 0.5\n  type: create\n");
});

test("fixes a yaml fence inside an indented Steps item, with CRLF, and reports the file line", () => {
  const src = ["Text", "", "1. Step", "", "   ```yaml", "   - type: create", "     prefab: Boar", "   ```", "", "After"].join("\r\n");
  const { text, changes } = fmt("page.mdx", src);
  assert.strictEqual(changes.length, 1);
  assert.strictEqual(changes[0].line, 6);
  assert.ok(text.includes("   - prefab: Boar\r\n     type: create\r\n"));
  assert.ok(text.endsWith("After"));
});

test("text outside a fence and other fences stay as they are", () => {
  const src = "type: x\nprefab: y\n\n```js\n- type: a\n  prefab: b\n```\n";
  const { text, changes } = fmt("page.mdx", src);
  assert.strictEqual(text, src);
  assert.strictEqual(changes.length, 0);
});

test("field-order-ok skips one rule, and field-order-ok: all skips a fence", () => {
  const rule = "- type: a\n  prefab: b\n";
  assert.strictEqual(fmt("a.yaml", "# field-order-ok\n" + rule).changes.length, 0);
  assert.strictEqual(fmt("a.yaml", "- type: a # field-order-ok\n  prefab: b\n").changes.length, 0);
  assert.strictEqual(fmt("a.yaml", rule + "- type: c\n  prefab: d\n").changes.length, 2);
  assert.strictEqual(fmt("a.yaml", "# field-order-ok\n" + rule + "- type: c\n  prefab: d\n").changes.length, 1);
  assert.strictEqual(fmt("p.mdx", "{/* field-order-ok: all */}\n```yaml\n" + rule + "```\n").changes.length, 0);
  assert.strictEqual(fmt("p.mdx", "```yaml {/* field-order-ok: all */}\n" + rule + "```\n").changes.length, 0);
  assert.strictEqual(fmt("p.mdx", "```yaml\n" + rule + "```\n").changes.length, 1);
});

test("guide-source is skipped, except 4-script-examples/ai-written", () => {
  assert.strictEqual(isSkipped("ew_wiki/docs/guide-source/2-intermediate-guide/a.md"), true);
  assert.strictEqual(isSkipped("C:\\x\\ew_wiki\\docs\\guide-source\\4-script-examples\\1-beginner-friendly\\a.md"), true);
  assert.strictEqual(isSkipped("ew_wiki/docs/guide-source/4-script-examples/ai-written/a.md"), false);
  assert.strictEqual(isSkipped("ew_wiki/src/content/docs/ewp/a.mdx"), false);
});

test("check mode exits 1 and changes nothing, write mode fixes, then check exits 0", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fmt-"));
  const f = path.join(dir, "a.mdx");
  const bad = "```yaml\n- type: create\n  prefab: Boar\n```\n";
  fs.writeFileSync(f, bad);
  const run = (...a) => cp.spawnSync(process.execPath, [TOOL, ...a], { encoding: "utf8" });
  const check = run("--check", f);
  assert.strictEqual(check.status, 1);
  assert.match(check.stdout, /a\.mdx:2: fields are out of order/);
  assert.strictEqual(fs.readFileSync(f, "utf8"), bad);
  assert.strictEqual(run("--write", f).status, 0);
  assert.strictEqual(fs.readFileSync(f, "utf8"), "```yaml\n- prefab: Boar\n  type: create\n```\n");
  assert.strictEqual(run("--check", f).status, 0);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("the data file lists every slot once", () => {
  const j = JSON.parse(fs.readFileSync(path.join(path.dirname(TOOL), "ewp-field-order.json"), "utf8"));
  for (const part of ["top", "nested"]) {
    const names = j[part].flat();
    assert.strictEqual(new Set(names).size, names.length, `${part} has a repeated name`);
  }
});
