// Mechanical architecture and wording rules (round 6 ticket 04). Each test guards one rule that
// used to live only in AGENTS.md / CONTEXT.md prose. TypeScript only, no build step.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { ErrorObject } from "ajv";
import { formatAjvFallthroughMessage } from "./ajvMessages";
import { DIAGNOSIS_CATEGORIES } from "./diagnosisCategories";
import schemaJson from "./schema.generated.json";

const read = (n: string) => readFileSync(new URL(n, import.meta.url), "utf8");

/** Text of every string and template literal in a source file, comments removed. */
function stringLiterals(src: string): string[] {
  const noComments = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`\\])\/\/[^\n]*/g, "$1");
  const out: string[] = [];
  const re = /"((?:[^"\\\n]|\\.)*)"|'((?:[^'\\\n]|\\.)*)'|`((?:[^`\\]|\\.)*)`/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(noComments))) out.push(m[1] ?? m[2] ?? m[3] ?? "");
  return out;
}

// A user-facing sentence: several words, at least one space-separated lowercase word run.
const looksLikeMessage = (s: string) => s.length >= 30 && /[a-z]+ [a-z]+ [a-z]+/.test(s);

describe("(a) detector modules carry no user-facing message text", () => {
  // Detectors are pure predicates; messages live in the catalog modules (AGENTS.md rule 3).
  for (const file of ["dataFieldValidation.ts", "rpcValidation.ts"]) {
    it(`${file} has no sentence-like string literals`, () => {
      const hits = stringLiterals(read(file)).filter(looksLikeMessage);
      expect(hits, `message-like text in a detector:\n${hits.join("\n")}`).toEqual([]);
    });
  }
});

describe("(c) every category appears in CONTEXT.md", () => {
  const context = readFileSync(new URL("../CONTEXT.md", import.meta.url), "utf8");
  for (const c of DIAGNOSIS_CATEGORIES) {
    it(`CONTEXT.md names "${c}"`, () => expect(context.includes(c)).toBe(true));
  }
});

describe("(d) wording lint over the message catalogs", () => {
  const CATALOGS = [
    "ajvMessages.ts",
    "practiceRecommendations.ts",
    "yamlErrorMessages.ts",
    "shapeMismatchDiagnosis.ts",
    "referenceValidation.ts",
    "structuralPrecheck.ts",
    "formatLint.ts",
    "fileNameCheck.ts",
  ];
  const RULES: Array<{ name: string; re: RegExp }> = [
    { name: "internal verification language (source/C#/decompile)", re: /\bC#|source code|decompil|EWP's source|the source\b/i },
    { name: '"set" (say what to write instead)', re: /\bset\b/i },
    { name: 'an "(or ...)" menu', re: /\(or /i },
  ];
  // Known exceptions. Hub ticket 31 (diagnosis text sweep) works this list down to empty; never add to it.
  const ALLOW: string[] = [
    "got mixed together in a way YAML can't reconcile", // "reconcile" wording; ticket 31
    "(or another mod)", // parenthetical menu; ticket 31
  ];

  it("no message uses banned wording, except the allow-listed ones", () => {
    const hits: string[] = [];
    for (const file of CATALOGS) {
      for (const lit of stringLiterals(read(file))) {
        if (!looksLikeMessage(lit)) continue;
        for (const r of RULES) if (r.re.test(lit) && !ALLOW.some((a) => lit.includes(a))) hits.push(`${file} [${r.name}]: ${lit.slice(0, 110)}`);
      }
    }
    expect(hits.join("\n")).toBe("");
  });
});

describe("(e) every schema keyword ajv can report has a plain-language answer", () => {
  const AJV_KEYWORDS = new Set(["type", "required", "additionalProperties", "pattern", "enum", "const", "minItems", "maxItems", "anyOf", "oneOf", "allOf", "not", "minimum", "maximum", "minLength", "maxLength", "format", "uniqueItems"]);
  // keyword -> where its message comes from. A new keyword in the schema fails the first test
  // until someone adds a row here (and a message, if it is not handled elsewhere).
  const HANDLED: Record<string, string> = {
    required: "formatAjvFallthroughMessage",
    type: "formatAjvFallthroughMessage",
    anyOf: "formatAjvFallthroughMessage",
    oneOf: "formatAjvFallthroughMessage",
    additionalProperties: "unknownKeyMessage (structuralPrecheck)",
    pattern: "typeValueEnumMessage (type:/types: only)",
    enum: "formatAjvFallthroughMessage generic wording (ticket 31 to improve)",
  };

  function keywordsInSchema(): Set<string> {
    const found = new Set<string>();
    (function walk(o: unknown, inMap: boolean): void {
      if (Array.isArray(o)) return o.forEach((x) => walk(x, false));
      if (!o || typeof o !== "object") return;
      for (const [k, v] of Object.entries(o)) {
        if (!inMap && AJV_KEYWORDS.has(k)) found.add(k);
        walk(v, k === "properties" || k === "definitions");
      }
    })((schemaJson as any).definitions, false);
    return found;
  }

  it("every keyword used in the generated schema has a HANDLED entry", () => {
    for (const k of keywordsInSchema()) expect(HANDLED[k], `schema uses "${k}" with no message plan`).toBeDefined();
  });

  it("pattern is only used on type:/types:, where typeValueEnumMessage takes over", () => {
    const paths: string[] = [];
    (function walk(o: unknown, trail: string[]): void {
      if (Array.isArray(o)) return o.forEach((x) => walk(x, trail));
      if (!o || typeof o !== "object") return;
      for (const [k, v] of Object.entries(o)) {
        if (k === "pattern" && typeof v === "string") paths.push(trail.slice(-2).join("/"));
        walk(v, [...trail, k]);
      }
    })((schemaJson as any).definitions, []);
    expect(paths.length).toBeGreaterThan(0);
    for (const p of paths) expect(p, "pattern outside type/types").toMatch(/^(properties\/type|types\/items)$/);
  });

  it("the generic wording has no ajv jargon for the keywords it handles", () => {
    const err = (keyword: string, params: object, message: string): ErrorObject =>
      ({ keyword, instancePath: "/field", schemaPath: "#", params, message }) as ErrorObject;
    for (const e of [
      err("required", { missingProperty: "prefab" }, "must have required property 'prefab'"),
      err("type", { type: "string" }, "must be string"),
      err("anyOf", {}, "must match a schema in anyOf"),
      err("oneOf", {}, "must match exactly one schema in oneOf"),
      err("enum", { allowedValues: ["a"] }, "must be equal to one of the allowed values"),
    ]) {
      const m = formatAjvFallthroughMessage(e);
      expect(m, e.keyword).not.toMatch(/must match|schema|instancePath|property '/i);
    }
  });
});
