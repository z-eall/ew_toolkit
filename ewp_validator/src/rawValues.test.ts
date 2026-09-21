import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Guard for the shared look. Tool CSS uses the tokens from shared/theme.css instead of raw values:
// --radius, --radius-sm, --fs-xs, --fs-sm, --fs-md, --font-mono, and the palette variables.
// A new raw value fails here. Known exceptions are listed below; add one only with a reason.
const ROOT = join(__dirname, "..", "..");
const TOOL_CSS = ["src/style.css", "ewp_validator/src/style.css", "ew_wiki/src/styles/theme.css"];
// The 4 dark-theme palette colors (the light theme swaps them). Comments are ignored.
const PALETTE = /#(?:222831|393e46|948979|dfd0b8)\b/i;

const stripComments = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, "");

const RULES: { name: string; pattern: RegExp; fix: string }[] = [
  { name: "raw border-radius", pattern: /border-radius:\s*\d+(?:\.\d+)?px\s*(?:!important)?\s*;/, fix: "var(--radius) or var(--radius-sm)" },
  { name: "raw small font-size (10 to 14px)", pattern: /font-size:\s*(?:1[0-4](?:\.\d+)?)px\s*(?:!important)?\s*;/, fix: "var(--fs-xs), var(--fs-sm) or var(--fs-md)" },
  { name: "raw monospace font stack", pattern: /font-family:[^;{}]*monospace[^;{}]*;/i, fix: "var(--font-mono)" },
  { name: "raw palette color", pattern: PALETTE, fix: "var(--bg), var(--panel), var(--border), var(--text) or var(--muted)" },
];

// Known exceptions: none yet. The wiki explainer widgets (ew_wiki/src/components/*.astro) are not
// scanned: they keep their own look (design-consistency map, ticket 01 decision).
const EXCEPTIONS: Record<string, string[]> = {};

describe("Tool CSS uses design tokens, not raw values", () => {
  for (const file of TOOL_CSS) {
    const css = stripComments(readFileSync(join(ROOT, file), "utf8"));
    for (const rule of RULES) {
      it(`${file}: no ${rule.name}`, () => {
        const allowed = EXCEPTIONS[file] ?? [];
        const hits = css
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter((l) => rule.pattern.test(l) && !allowed.includes(l));
        expect(hits, `use ${rule.fix} (shared/theme.css)`).toEqual([]);
      });
    }
  }

  it("defines every token in shared/theme.css", () => {
    const shared = readFileSync(join(ROOT, "shared", "theme.css"), "utf8");
    for (const token of ["--radius", "--radius-sm", "--fs-xs", "--fs-sm", "--fs-md", "--font-mono", "--tap-size"]) {
      expect(shared, token).toContain(`${token}:`);
    }
  });
});
