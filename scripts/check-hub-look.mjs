// Same-look check of the BUILT hub (design-consistency map). Opens the landing page and
// every Tool in a real browser, at phone and desktop width, reads the computed style of the
// shared nav bar, and fails when one page differs from the others.
//   node scripts/check-hub-look.mjs          (after npm run build:hub)
// Pages come from shared/tools.json plus every Tool's own sub-page, so a new Tool is checked
// with no edit here. Needs a Chrome or Edge on the machine (CI has Chrome). Set
// HUB_BROWSER_CHANNEL=msedge to use Edge.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import { chromium } from "playwright-core";

const BASE = "/ew_toolkit/";
const DIST = "dist";
const VIEWPORTS = [
  { name: "phone", width: 375, height: 812 },
  { name: "desktop", width: 1280, height: 800 },
];
const MIN_TAP = 40; // phone: both bar buttons at least this many px on each side
const SYMBOL = /[←-⇿⌀-⏿☀-➿⬀-⯿]|\p{Extended_Pictographic}/u;
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml", ".ttf": "font/ttf", ".woff2": "font/woff2", ".ico": "image/x-icon" };

// A Tool's own sub-page: the first folder below the Tool that holds an index.html.
function subPage(key) {
  const root = path.join(DIST, key);
  const walk = (dir, depth) => {
    if (depth > 4) return null;
    for (const name of readdirSync(dir).sort()) {
      const full = path.join(dir, name);
      if (!statSync(full).isDirectory() || name === "assets" || name.startsWith("_")) continue;
      if (existsSync(path.join(full, "index.html"))) return full;
      const deeper = walk(full, depth + 1);
      if (deeper) return deeper;
    }
    return null;
  };
  const found = existsSync(root) ? walk(root, 0) : null;
  return found ? BASE + path.relative(DIST, found).split(path.sep).join("/") + "/" : null;
}

const tools = JSON.parse(readFileSync("shared/tools.json", "utf8"));
const pages = [{ name: "landing", url: BASE }];
for (const t of tools) {
  pages.push({ name: t.key, url: `${BASE}${t.key}/` });
  const sub = subPage(t.key);
  if (sub) pages.push({ name: `${t.key} sub-page`, url: sub });
}

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (!p.startsWith(BASE)) { res.writeHead(404).end(); return; }
  let file = path.join(DIST, p.slice(BASE.length));
  if (existsSync(file) && statSync(file).isDirectory()) file = path.join(file, "index.html");
  if (!existsSync(file)) { res.writeHead(404).end(); return; }
  res.writeHead(200, { "content-type": TYPES[path.extname(file)] ?? "application/octet-stream" }).end(readFileSync(file));
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const origin = `http://127.0.0.1:${server.address().port}`;

function readBar() {
  const px = (n) => Math.round(n * 10) / 10;
  const box = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { w: px(r.width), h: px(r.height) }; };
  const style = (el, props) => Object.fromEntries(props.map((p) => [p, getComputedStyle(el)[p]]));
  const nav = document.querySelector(".site-nav");
  if (!nav) return { missing: "no .site-nav on the page" };
  const theme = nav.querySelector(".theme-toggle");
  const menu = nav.querySelector(".nav-menu-toggle");
  const visible = (el) => !!el && getComputedStyle(el).display !== "none";
  // Page body: the parts every Tool must share. Line height and link color are left out on purpose
  // (the wiki sets its own for reading; docs/agents/hub-tool-nav.md).
  const body = style(document.body, ["fontFamily", "fontSize", "color", "backgroundColor"]);
  const codeEl = document.querySelector("main code, article code, pre code, pre");
  return {
    body,
    // Only pages that have a code block: the landing page and the validator shell may have none.
    codeFont: codeEl ? getComputedStyle(codeEl).fontFamily : null,
    monoToken: getComputedStyle(document.documentElement).getPropertyValue("--font-mono").trim(),
    navHeight: px(nav.getBoundingClientRect().height),
    nav: style(nav, ["fontFamily", "lineHeight", "backgroundColor", "borderBottomColor", "position"]),
    theme: theme && { ...box(theme), ...style(theme, ["fontFamily", "fontSize", "color", "backgroundColor", "borderRadius", "borderTopColor"]), hasIcon: !!theme.querySelector(".theme-icon svg"), text: theme.textContent.trim() },
    menu: visible(menu) ? { ...box(menu), ...style(menu, ["borderRadius", "backgroundColor"]) } : null,
    links: [...nav.querySelectorAll(".nav-link")].map((a) => a.textContent.trim()),
    linkStyle: (() => { const a = nav.querySelector(".nav-link"); return a && style(a, ["fontFamily", "fontSize", "fontWeight"]); })(),
  };
}

const browser = await chromium.launch({ channel: process.env.HUB_BROWSER_CHANNEL ?? "chrome" });
const problems = [];
try {
  for (const vp of VIEWPORTS) {
    const seen = [];
    for (const page of pages) {
      const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, hasTouch: vp.name === "phone", colorScheme: "dark" });
      const tab = await ctx.newPage();
      const res = await tab.goto(origin + page.url, { waitUntil: "load" });
      if (!res || res.status() !== 200) { problems.push(`${vp.name} / ${page.name}: page did not load (${res?.status()})`); await ctx.close(); continue; }
      await tab.waitForSelector(".site-nav .theme-toggle .theme-icon", { timeout: 8000 }).catch(() => {});
      const bar = await tab.evaluate(readBar);
      await ctx.close();
      if (bar.missing) { problems.push(`${vp.name} / ${page.name}: ${bar.missing}`); continue; }
      seen.push({ page: page.name, bar });

      const here = `${vp.name} / ${page.name}`;
      if (!bar.theme) problems.push(`${here}: no theme button`);
      else {
        if (!bar.theme.hasIcon) problems.push(`${here}: theme button has no drawn icon`);
        if (SYMBOL.test(bar.theme.text)) problems.push(`${here}: theme button text holds a symbol character (phones draw it as a color emoji)`);
      }
      if (vp.name === "phone") {
        for (const [label, b] of [["theme button", bar.theme], ["menu button", bar.menu]]) {
          if (!b) { if (label === "menu button") problems.push(`${here}: no menu button on a phone`); continue; }
          if (b.w < MIN_TAP || b.h < MIN_TAP) problems.push(`${here}: ${label} is ${b.w}x${b.h}px, smaller than ${MIN_TAP}px`);
        }
      }
    }
    // Every page must match the first one (the landing page) at this width.
    const [base, ...rest] = seen;
    const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    for (const other of rest) {
      for (const key of Object.keys(base.bar)) {
        if (key === "links") continue;
        if (key === "codeFont" || key === "monoToken") continue; // checked against the token below
        if (!same(base.bar[key], other.bar[key])) {
          problems.push(`${vp.name}: ${other.page} differs from ${base.page} in ${key}\n    ${base.page}: ${JSON.stringify(base.bar[key])}\n    ${other.page}: ${JSON.stringify(other.bar[key])}`);
        }
      }
      if (!same(base.bar.links, other.bar.links)) problems.push(`${vp.name}: ${other.page} lists different nav links than ${base.page}`);
    }
    // A code block must use the shared monospace token (--font-mono), whatever the page's own CSS says.
    const norm = (s) => (s ?? "").replace(/["'\s]/g, "");
    for (const s of seen) {
      if (s.bar.codeFont !== null && norm(s.bar.codeFont) !== norm(s.bar.monoToken)) {
        problems.push(`${vp.name} / ${s.page}: code font is ${s.bar.codeFont}, not the shared --font-mono (${s.bar.monoToken})`);
      }
    }
    console.log(`checked ${vp.name} (${vp.width}px): ${seen.map((s) => s.page).join(", ")}`);
  }
} finally {
  await browser.close();
  server.close();
}

if (problems.length) {
  console.error("check-hub-look FAILED:\n- " + problems.join("\n- "));
  process.exit(1);
}
console.log(`check-hub-look ok: ${pages.length} pages x ${VIEWPORTS.length} widths share one nav bar and page body look`);
