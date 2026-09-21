// Writes schema/verified-against.json: which mod and game versions we last
// rechecked the validator against, and when. Run it by hand after a real
// recheck (`npm run stamp`). Builds never touch the file.
//
// The versions come from the local copies of Jere's mods and the decompiled
// game, found by walking up from this repo (see docs/sources.md).
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const STAMP_PATH = path.join(here, "verified-against.json");
const root = path.resolve(here, "..", "..", "..", "valheim-modding");

const readJson = (file) => JSON.parse(readFileSync(file, "utf-8").replace(/^﻿/, ""));
const commit = (dir) =>
  execFileSync("git", ["-C", dir, "log", "-1", "--format=%h"], { encoding: "utf-8" }).trim();

function modInfo(name) {
  const dir = path.join(root, "upstream", name);
  return { version: readJson(path.join(dir, "publish", "manifest.json")).version_number, commit: commit(dir) };
}

export function readLocalVersions() {
  const meta = readJson(path.join(root, "decompiled", "current", "DUMP_META.json"));
  return {
    ewp: modInfo("valheim-expand_world_prefabs"),
    wec: modInfo("valheim-world_edit_commands"),
    valheim: { version: meta.gameVersion, build: meta.steamBuildId },
  };
}

if (process.argv[1]?.endsWith("stamp.mjs")) {
  if (!existsSync(root)) {
    console.error("stamp: local mod copies not found. See docs/sources.md.");
    process.exit(1);
  }
  const stamp = { checkedOn: new Date().toISOString().slice(0, 10), ...readLocalVersions() };
  writeFileSync(STAMP_PATH, JSON.stringify(stamp, null, 2) + "\n", "utf-8");
  console.log(`stamp: EWP ${stamp.ewp.version}, checked on ${stamp.checkedOn}`);
}
