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

// Each Tool's own code (design-consistency ticket 04). Narrower than the shared rule: only characters
// a phone can draw as a color emoji (Unicode "Extended_Pictographic", like the sun and the warning
// sign). Text marks such as the Valheim star and plain arrows are not in that set and stay allowed.
// The wiki pages' prose (.mdx) is content, not UI, and is not scanned.
const ROOT = join(__dirname, "..", "..");
const EMOJI_RISK = /\p{Extended_Pictographic}/u;
const TOOL_CODE_DIRS = ["src", "ewp_validator/src", "ew_wiki/src/components", "ew_wiki/src/layouts", "ew_wiki/src/styles"];

function toolCodeFiles(dir: string): string[] {
  let names: string[] = [];
  try {
    names = readdirSync(join(ROOT, dir), { withFileTypes: true }).map((d) => (d.isDirectory() ? `d:${d.name}` : d.name));
  } catch {
    return [];
  }
  return names.flatMap((n) =>
    n.startsWith("d:")
      ? toolCodeFiles(`${dir}/${n.slice(2)}`)
      : /\.(ts|astro|css)$/.test(n) && !n.endsWith(".test.ts") && !n.includes("generated")
        ? [`${dir}/${n}`]
        : [],
  );
}

describe("each Tool's own code has no emoji-capable symbol", () => {
  const files = TOOL_CODE_DIRS.flatMap(toolCodeFiles).filter((f) => !f.includes("/fixtures/"));
  it("scans the Tool code", () => {
    expect(files).toContain("ewp_validator/src/main.ts");
    expect(files.some((f) => f.startsWith("ew_wiki/src/components/"))).toBe(true);
  });
  it.each(files)("%s", (file) => {
    const code = withoutComments(readFileSync(join(ROOT, file), "utf8"));
    const hit = code.match(EMOJI_RISK);
    expect(hit, `symbol ${hit?.[0]} in ${file}: draw it with an icon from shared/icons.ts`).toBeNull();
  });
});
