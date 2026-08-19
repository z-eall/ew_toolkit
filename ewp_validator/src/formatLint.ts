// Ticket 13 (round 6): a punctuation/format lint over the parsed YAML tree.
//
// Some mistakes are legal YAML but clearly a typo — the reported case is a
// double colon, `filter:: value`, which YAML reads as the *key* `filter:` (the
// `: ` after it is the key/value separator, so the first colon stays in the
// key). ajv then rejects `filter:` as an unknown property with a misleading
// "not a valid key" message, and — because the key is nested inside a `poke:`
// list — a range that falls back to the whole top-level entry (wrong line).
//
// Walking the parsed tree instead lets us point at the offending key node's own
// range (right line, right span) and word it as the format error it is. The
// check registry is deliberately open so more key-punctuation checks can be
// added later — the scripter asked for coverage "inclusive but not limited to
// `::`". Keys are examined (never values or comments), so a `::` inside a value
// or a `#` comment is left alone.
import { isScalar, parseDocument, visit } from "yaml";
import { STRUCTURE_PROBLEM_CATEGORY } from "./diagnosisCategories";
// Type-only import (erased at compile) so there's no runtime cycle with
// structuralPrecheck, which imports runFormatLint from here.
import type { Problem } from "./structuralPrecheck";

// Each check inspects a mapping key's text and returns a user-facing message if
// it's malformed, or null if the key is fine. Add a check here to cover a new
// punctuation/format mistake.
const KEY_CHECKS: Array<(key: string) => string | null> = [
  // A stray colon anywhere in a key. `filter:: value` → YAML key `filter:`
  // (trailing), `fil::ter: value` → key `fil::ter` (mid): the `: ` separator
  // stops at the first colon-then-space, so any extra colon lands inside the
  // key. No EWP/WEC key legitimately contains a colon, so this is always a typo
  // — usually a double colon `::`.
  (key) =>
    key.includes(":")
      ? `Stray colon in the key \`${key}\` — a key can't contain \`:\`, so this ` +
        `is usually a double colon \`::\`. Remove the extra colon.`
      : null,
];

export function runFormatLint(text: string): Problem[] {
  const problems: Problem[] = [];
  const doc = parseDocument(text, { keepSourceTokens: false });

  visit(doc, {
    Pair(_, pair) {
      const keyNode = pair.key;
      if (!isScalar(keyNode) || typeof keyNode.value !== "string") return;
      const key = keyNode.value;
      // Point at the key node's own span: [start, content-end]. Mirrors
      // structuralPrecheck's nodeRange without importing it (avoids a cycle).
      const r = keyNode.range;
      const range: [number, number] = r ? [r[0], r[2] ?? r[1]] : [0, 0];
      for (const check of KEY_CHECKS) {
        const message = check(key);
        if (message) problems.push({ severity: "error", message, branch: STRUCTURE_PROBLEM_CATEGORY, range });
      }
    },
  });

  return problems;
}
