// Refreshes the saved test copy of the mod's RPCs.md from the local mirror of Jere's source
// (skill `upstream-mirror`; update the mirror first if it is stale). No internet needed here.
//   npm run refresh-fixture
// Set UPSTREAM_MIRROR to the mirror folder if it is not at ../../valheim-modding/upstream.
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const mirror = process.env.UPSTREAM_MIRROR ?? path.join(here, "..", "..", "..", "valheim-modding", "upstream");
const repo = path.join(mirror, "valheim-expand_world_prefabs");
const src = path.join(repo, "docs", "RPCs.md");
if (!existsSync(src)) {
  console.error(`No local copy of EWP at ${repo}. Create it: node <workspace>/valheim-modding/scripts/upstream-mirror.mjs update valheim-expand_world_prefabs`);
  process.exit(1);
}
const meta = JSON.parse(readFileSync(path.join(repo, "MIRROR_META.json"), "utf8"));
copyFileSync(src, path.join(here, "fixtures", "RPCs.md"));
writeFileSync(
  path.join(here, "fixtures", "RPCs.source.json"),
  JSON.stringify({ repo: meta.repo, sha: meta.sha, commitDate: meta.commitDate, copiedAt: new Date().toISOString() }, null, 2) + "\n",
);
console.log(`fixtures/RPCs.md refreshed from EWP ${meta.sha.slice(0, 7)} (commit ${meta.commitDate.slice(0, 10)}). Run npm test.`);
