// Copies the Hub's one master favicon (shared/favicon.png) into every
// Tool's own public/ folder before it builds. A favicon is a static binary
// asset - unlike the nav bar (shared/navBar.ts), it can't be shared as
// imported code, so "1 master" here means "1 real source file, copied into
// place on every build" rather than "1 file every consumer reads directly".
// See .scratch/ew_toolkit/issues/22-unify-favicon.md - this replaces a
// state where the landing page and ewp_validator each had their own
// byte-identical-by-accident copy, and ew_wiki was silently serving
// Starlight's own generic default icon instead of the Hub's brand icon at
// all, because astro.config.mjs never set a `favicon:` option.
//
// Run as each Tool's own `prebuild` script (self-heals on every build, no
// separate step to remember) - see package.json in ew_toolkit/,
// ewp_validator/, and ew_wiki/.
import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const hubRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const master = join(hubRoot, "shared", "favicon.png");

const targets = ["public/favicon.png", "ewp_validator/public/favicon.png", "ew_wiki/public/favicon.png"];

for (const target of targets) {
  const dest = join(hubRoot, target);
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(master, dest);
}
