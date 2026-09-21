import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ICON_PATHS } from "../../shared/icons";

// Guard for the shared nav bar and theme code. A phone draws a text symbol
// such as a sun, a star or an arrow as a color emoji, and pinning the font does
// not stop it (theme toggle, seen twice). Shared UI draws every symbol as an SVG
// from shared/icons.ts. Comments are ignored; only code and CSS values count.
const SHARED_DIR = join(__dirname, "..", "..", "shared");
const SYMBOL = /[←-⇿⌀-⏿☀-➿⬀-⯿]|\p{Extended_Pictographic}/u;

function withoutComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split(/\r?\n/)
    .filter((line) => !/^\s*\/\//.test(line))
    .join("\n");
}

const files = readdirSync(SHARED_DIR).filter((name) => /\.(ts|css)$/.test(name) && !name.endsWith(".test.ts"));

describe("shared UI draws symbols as icons, not text", () => {
  it("scans the shared folder", () => {
    expect(files).toContain("theme.ts");
    expect(files).toContain("theme.css");
  });

  it.each(files)("%s has no symbol or emoji character in code", (name) => {
    const code = withoutComments(readFileSync(join(SHARED_DIR, name), "utf8"));
    const hit = code.match(SYMBOL);
    expect(hit, `symbol character ${hit?.[0]} in shared/${name}: draw it with an icon from shared/icons.ts`).toBeNull();
  });

  it("has the theme toggle icons", () => {
    expect(ICON_PATHS.sun).toBeTruthy();
    expect(ICON_PATHS.moon).toBeTruthy();
  });
});
