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
  { name: "raw sans-serif font stack", pattern: /font-family:\s*-apple-system/i, fix: "var(--font-sans)" },
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
    for (const token of ["--font-sans", "--radius", "--radius-sm", "--fs-xs", "--fs-sm", "--fs-md", "--font-mono", "--tap-size"]) {
      expect(shared, token).toContain(`${token}:`);
    }
  });

  // Monospace is for code and file names only. A container that sets it makes every button and
  // tab inside it monospace by inheritance (the Problems tabs did). Add a selector here only for
  // text that quotes code or names a file.
  it("ewp_validator/src/style.css: monospace only where code or file names are shown", () => {
    const css = stripComments(readFileSync(join(ROOT, "ewp_validator/src/style.css"), "utf8"));
    const selectors: string[] = [];
    for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      if (/font-family:\s*var\(--font-mono\)/.test(m[2]!)) selectors.push(m[1]!.replace(/\s+/g, " ").trim());
    }
    expect(selectors.sort()).toEqual([".confirm-list-scroll ul", ".problem .msg, .problem .loc"]);
  });

  // The validator keeps its own status colors, but as named variables: no raw hex outside a
  // `--name: #hex` definition line (design-consistency ticket 02).
  it("ewp_validator/src/style.css: colors are named variables", () => {
    const css = stripComments(readFileSync(join(ROOT, "ewp_validator/src/style.css"), "utf8"));
    const hits = css
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => /(?:^|[\s:(,])#[0-9a-fA-F]{3,8}(?![-\w])/.test(l) && !/^--[\w-]+:/.test(l));
    expect(hits, "name the color as a variable in :root, then use var(--name)").toEqual([]);
  });
});
