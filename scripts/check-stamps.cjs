#!/usr/bin/env node
// ONE stamp check. Replaces .agents/hooks/ew_toolkit/guard-validator-stamp.cjs.
// SessionStart: tells the agent when a saved stamp is behind the local copies.
// Silent when all stamps match. No network, no email.
//   1. Validator stamp (ewp_validator/schema/verified-against.json) against the local
//      copies of EWP, WEC and the decompiled game (valheim-modding/decompiled/current).
//   2. Ledger stamp (the "Ledger stamp:" line of the pid/ownership ledger) against the
//      decompiled game.
// Runs in ew_toolkit sessions and ew_wiki sessions. One script, one message.
// Use --text to print the message and exit 1 when a stamp is behind (manual run).
const fs = require("fs");
const path = require("path");
const { LEDGER_REL, ledgerStamp } = require("./ownership-ledger.cjs");

const workspace = path.resolve(__dirname, "..", "..");
const modding = path.join(workspace, "valheim-modding");
const toolkit = path.join(workspace, "ew_toolkit");
const readJson = (f) => JSON.parse(fs.readFileSync(f, "utf8").replace(/^﻿/, ""));

// Each behind entry is [name, savedVersion, currentVersion].
function behind() {
  const out = { validator: [], ledger: [] };
  const game = readJson(path.join(modding, "decompiled", "current", "DUMP_META.json")).gameVersion;
  try {
    const stamp = readJson(path.join(toolkit, "ewp_validator", "schema", "verified-against.json"));
    const now = {
      EWP: [stamp.ewp.version, readJson(path.join(modding, "upstream", "valheim-expand_world_prefabs", "publish", "manifest.json")).version_number],
      WEC: [stamp.wec.version, readJson(path.join(modding, "upstream", "valheim-world_edit_commands", "publish", "manifest.json")).version_number],
      Valheim: [stamp.valheim.version, game],
    };
    out.validator = Object.entries(now).filter(([, [old, cur]]) => old !== cur).map(([n, [old, cur]]) => [n, old, cur]);
  } catch (e) { /* validator stamp or local copies missing: stay silent for this part */ }
  try {
    const saved = ledgerStamp(fs.readFileSync(path.join(toolkit, LEDGER_REL), "utf8"));
    if (saved !== game) out.ledger = [["Valheim", saved || "no stamp", game]];
  } catch (e) { /* ledger missing: stay silent for this part */ }
  return out;
}

function message(b) {
  const fmt = (list) => list.map(([n, o, c]) => `${n} ${o} -> ${c}`).join(", ");
  const parts = [];
  if (b.validator.length) parts.push(`The validator stamp is behind the local copies (${fmt(b.validator)}). The validator may need a recheck. After a real recheck, run 'npm run stamp' in ewp_validator.`);
  if (b.ledger.length) parts.push(`The pid/ownership ledger stamp is behind the game (${fmt(b.ledger)}). Its rows may be out of date. After a new sweep, change the 'Ledger stamp:' line in the ledger.`);
  return parts.length ? `Stamps are behind. Tell the user. ${parts.join(" ")}` : "";
}

module.exports = { behind, message };

if (require.main === module) {
  try {
    const msg = message(behind());
    if (process.argv.includes("--text")) {
      if (msg) { console.log(msg); process.exit(1); }
    } else if (msg) {
      process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: "SessionStart", additionalContext: msg } }));
    }
  } catch (e) { /* game copy missing: stay silent */ }
}
