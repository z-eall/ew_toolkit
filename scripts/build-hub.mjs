// Builds every Tool (each its own package.json/vite.config) plus the landing page, then
// combines them into one dist/ for a single Pages deploy: the landing
// page at dist/, each Tool copied into dist/<subpath>/.
//
// Plain script, no workspace/monorepo tooling.
import { execSync } from "node:child_process";
import { cpSync, mkdirSync, readFileSync, renameSync, rmSync } from "node:fs";

function run(cmd, cwd = ".") {
  execSync(cmd, { cwd, stdio: "inherit" });
}

// shared/tools.json is the one list of Tools; each key is the Tool's folder.
const tools = JSON.parse(readFileSync("shared/tools.json", "utf8")).map((t) => t.key);

rmSync("dist", { recursive: true, force: true });

run("npm run build"); // landing page (multi-page: Home + Support) -> dist/

// support.html builds flat at dist/support.html; move it to dist/support/index.html
// so it serves at the /support/ subpath like every Tool.
mkdirSync("dist/support", { recursive: true });
renameSync("dist/support.html", "dist/support/index.html");

for (const tool of tools) {
  run("npm run build", tool); // -> <tool>/dist/
  mkdirSync(`dist/${tool}`, { recursive: true });
  cpSync(`${tool}/dist`, `dist/${tool}`, { recursive: true });
}
