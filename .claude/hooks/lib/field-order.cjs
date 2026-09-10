// Shared logic for guard-script-field-order.cjs. Checks the RELATIVE order
// of a small, explicitly-named set of fields inside EWP-style YAML — never
// full YAML validity, never a field outside the named set. Fields not in
// TOP_LEVEL_RANK/NESTED_RANK are invisible to this checker on purpose: EWP
// has dozens of real fields (bannedGlobalKeys, chance, day, night, target,
// triggerRules, ...) and flagging every one of them would make this hook
// noise, not signal. See ew_toolkit/AGENTS.md's "Script field order".
//
// "ask before slotting it in" (the human half of that rule, for a field
// this checker has never seen) is a judgment call for whoever is writing
// the script — this file only re-checks the fields already agreed on.

// Lower rank = earlier. Aliases share a rank on purpose (order between
// aliases of the same slot is never a violation).
const TOP_LEVEL_RANK = {
  prefab: 0,
  type: 1,
  weight: 2,
  exec: 3,
  filter: 4,
  filters: 4,
  bannedFilter: 4,
  bannedFilters: 4,
  objects: 5,
  bannedObjects: 5,
  data: 6,
  spawn: 6,
  remove: 6,
  command: 7,
  commands: 7,
  poke: 8,
};

const NESTED_RANK = {
  prefab: 0,
  filter: 1,
  filters: 1,
  bannedFilter: 1,
  bannedFilters: 1,
  data: 1,
  position: 2,
  offset: 2,
  rot: 3,
  rotation: 3,
  delay: 4,
  parameter: 5,
};

// Bare `key:` announcers whose list items are themselves rule-shaped
// (prefab/filter/.../parameter) and so get nested-checked. A list under any
// other bare key (commands:, filters:, value:, ...) is opaque to this
// checker — its items are plain strings or condition tuples, not entries
// with their own field order.
const NESTED_LIST_KEYS = new Set(["poke", "objects", "bannedObjects", "spawn"]);

function getIndent(line) {
  return line.length - line.trimStart().length;
}

function firstKey(trimmedContent) {
  let s = trimmedContent;
  if (s.startsWith("- ")) s = s.slice(2).trim();
  const m = s.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*:/);
  return m ? m[1] : null;
}

function bareKey(trimmedContent) {
  const m = trimmedContent.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*$/);
  return m ? m[1] : null;
}

// Fence extraction/dedent is shared with guard-doc-example-schema.cjs — see
// lib/yaml-fences.cjs.
const { extractYamlFences, dedent } = require("./yaml-fences.cjs");

// Checks one region of YAML text. Returns an array of violation strings.
function checkRegion(rawText) {
  const violations = [];
  const lines = dedent(rawText).split("\n");

  let lastBareKey2 = null;
  let topEntry = null;
  let nestedEntry = null;

  function record(entry, key, rankMap, lineNo) {
    if (!entry || !key) return;
    const rank = rankMap[key];
    if (rank == null) return; // not in the named set — ignored on purpose
    if (entry.lastRank !== -1 && rank < entry.lastRank) {
      violations.push(
        `line ${lineNo}: \`${key}:\` comes after \`${entry.lastKeyAtRank}:\` — out of the agreed field order`
      );
    } else {
      entry.lastKeyAtRank = key;
    }
    entry.lastRank = Math.max(entry.lastRank, rank);
  }

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();
    if (trimmed === "" || trimmed.startsWith("#")) continue;
    const indent = getIndent(raw);
    const lineNo = i + 1;

    if (indent === 0) {
      if (trimmed.startsWith("- ")) {
        nestedEntry = null;
        lastBareKey2 = null;
        topEntry = { lastRank: -1, lastKeyAtRank: null };
        record(topEntry, firstKey(trimmed), TOP_LEVEL_RANK, lineNo);
      }
      continue;
    }

    if (indent === 2) {
      if (trimmed.startsWith("- ")) {
        if (lastBareKey2 && NESTED_LIST_KEYS.has(lastBareKey2)) {
          nestedEntry = { lastRank: -1, lastKeyAtRank: null };
          record(nestedEntry, firstKey(trimmed), NESTED_RANK, lineNo);
        } else {
          nestedEntry = null;
        }
        continue;
      }
      nestedEntry = null;
      const bk = bareKey(trimmed);
      lastBareKey2 = bk || null;
      record(topEntry, firstKey(trimmed), TOP_LEVEL_RANK, lineNo);
      continue;
    }

    if (indent === 4) {
      record(nestedEntry, firstKey(trimmed), NESTED_RANK, lineNo);
      continue;
    }
    // Deeper indentation (flow mappings, unusual formatting): not tracked.
  }

  return violations;
}

// Top-level entry point. `filePath` decides how to read `content`: a
// .yaml/.yml file is one region; anything else is scanned for ```yaml
// fences, each checked as its own region.
function findFieldOrderViolations(filePath, content) {
  const isYamlFile = /\.ya?ml$/i.test(filePath);
  const regions = isYamlFile ? [content] : extractYamlFences(content);

  const all = [];
  regions.forEach((region, idx) => {
    const violations = checkRegion(region);
    if (violations.length === 0) return;
    const label = isYamlFile ? "" : ` (code block ${idx + 1})`;
    violations.forEach((v) => all.push(`${v}${label}`));
  });
  return all;
}

module.exports = { findFieldOrderViolations, TOP_LEVEL_RANK, NESTED_RANK };
