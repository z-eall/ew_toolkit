// Smoke check of the BUILT validator under its hub path (round 6 ticket 07). No server needed:
// it reads the built files and checks what a browser would need to start the page.
//   node scripts/smoke-hub.mjs [builtDir]     default: dist/ewp_validator (after npm run build:hub)
// Checks: every URL in index.html sits under the hub base path and points at a file that exists;
// the Monaco editor worker, the YAML worker and the zip worker were built and are referenced by
// the main script; the editor icon font exists.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const BASE = "/ew_toolkit/ewp_validator/";
const dir = process.argv[2] ?? "dist/ewp_validator";
const fail = [];
const need = (ok, msg) => { if (!ok) fail.push(msg); };

const indexPath = path.join(dir, "index.html");
need(existsSync(indexPath), `missing ${indexPath}`);
if (existsSync(indexPath)) {
  const html = readFileSync(indexPath, "utf8");
  const urls = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => m[1]).filter((u) => !/^(https?:)?\/\//.test(u));
  need(urls.length > 0, "index.html references no local files");
  for (const u of urls) {
    need(u.startsWith(BASE), `URL not under ${BASE}: ${u}`);
    need(existsSync(path.join(dir, u.slice(BASE.length))), `referenced file missing: ${u}`);
  }
  const assets = existsSync(path.join(dir, "assets")) ? readdirSync(path.join(dir, "assets")) : [];
  const mainName = urls.map((u) => path.basename(u)).find((n) => /^index-.*\.js$/.test(n));
  need(!!mainName, "no main index-*.js referenced");
  const mainPath = mainName ? path.join(dir, "assets", mainName) : "";
  const main = mainPath && existsSync(mainPath) ? readFileSync(mainPath, "utf8") : "";
  for (const w of ["editor.worker", "yaml.worker", "zipWorker"]) {
    const file = assets.find((a) => a.startsWith(w + "-") && a.endsWith(".js"));
    need(!!file, `worker not built: ${w}`);
    if (file) need(main.includes(file), `main script does not reference ${file}`);
  }
  need(assets.some((a) => a.startsWith("codicon-") && a.endsWith(".ttf")), "editor icon font (codicon) not built");
}
// Every Tool in shared/tools.json must have a built page under dist/<key>/
// (only when checking the default dist/, not a custom folder).
if (process.argv[2] === undefined) {
  const tools = JSON.parse(readFileSync("shared/tools.json", "utf8"));
  for (const t of tools) need(existsSync(path.join("dist", t.key, "index.html")), `Tool page not built: dist/${t.key}/index.html`);
}
if (fail.length) {
  console.error("smoke-hub FAILED:\n- " + fail.join("\n- "));
  process.exit(1);
}
console.log(`smoke-hub ok: ${dir} (base path, referenced files, 3 workers, icon font, every Tool page)`);
