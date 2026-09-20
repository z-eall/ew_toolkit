// The one catalog of "Practice recommendation" messages: EWP accepts the input
// (or silently ignores part of it), but a different habit is recommended.
// Messages only — detectors stay in their domain modules and call these with
// what the scan actually found (the real field and section, never a menu of
// alternatives). Never an error: every entry is info or warning. Group names
// mirror the ew_wiki habit pages; a test over this catalog enforces the shape
// (group lead-in, no "set", no "(or ...)"). See ewp_validator/AGENTS.md rule 6.

export const PRACTICE_GROUPS = ["Legacy format", "Legacy filename", "Preferred format", "Overlapping fields", "Silently ignored"] as const;
export type PracticeGroup = (typeof PRACTICE_GROUPS)[number];

const legacy = (found: string) => `Legacy format: ${found}. It still works, but we recommend using the latest format.`;

import type { SilentFinding } from "./silentMistakes";

export const practiceMessages = {
  legacyDelay: () => legacy("a top-level `delay:`"),

  legacySpawn: (key: string) => legacy(`a single-line \`${key}:\``),

  legacyFilename: (target: string) =>
    `Legacy filename: 'expand_data*.yaml' is the old data name. It still works, ` +
    `but rename it to '${target}' in '/config/data' (click the name above).`,

  legacyDataAlias: (section: string) =>
    `Legacy format: \`data:\` under \`${section}:\` is an old alias for \`filter:\`. It still works, ` +
    `but we recommend renaming it to \`filter:\`.`,

  /** `filter:`/`bannedFilter:` written as a YAML list — EWP rewrites it to the plural form. */
  filterAsList: (field: string, plural: string, section: string) =>
    `Preferred format: \`${field}:\` is written as a list under \`${section}:\`. It still works, ` +
    `but a list belongs in \`${plural}:\`.`,

  /** Nested `data:` next to a filter field. `written` is the filter field the scan found. */
  dataIgnored: (section: string, written: string, plural: string, redundant: boolean) => {
    if (redundant) return `Overlapping fields: \`data:\` repeats a name already in \`${written}:\`. Remove \`data:\`.`;
    const fix =
      written === plural
        ? "Remove `data:`, or add its name to that list."
        : `Remove \`data:\`, or list both names in \`${plural}:\` (plural).`;
    return (
      `Overlapping fields: \`data:\` is not used because \`${written}:\` is written under \`${section}:\`. ${fix}`
    );
  },

  conditionOperator: (op: "==" | "<>") =>
    `Silently ignored: \`${op}\` is not a comparison EWP knows, so this condition never passes. Use \`${op === "==" ? "=" : "!="}\`.`,

  changeNeedsTriggerRules: (key: string) =>
    `Silently ignored: this entry writes \`${key}\` on its own object, so the \`type: change, ${key}\` entry does not fire. Add \`triggerRules: true\`.`,

  pokeWorldCentre: () =>
    "Silently ignored: this trigger has no place, so the poke measures from the world centre and reaches only 100 m. Add `maxDistance:`.",

  filterWeightPart: (shown: string) =>
    `Silently ignored: in \`${shown}\` the 4th part is a weight, not a second value, so only the first value is checked. Use \`;\` for a range.`,

  keyStoreMix: (key: string, watcher: "globalkey" | "globalKeys" | "key") => {
    if (watcher === "key") {
      return `Silently ignored: \`setkey ${key}\` sets a Valheim global key, but \`type: key, ${key}\` reads EWP's own keys. Use \`type: globalkey, ${key}\`.`;
    }
    const reads = watcher === "globalkey" ? "`type: globalkey`" : "`globalKeys:`";
    const fix = watcher === "globalkey" ? `Use \`type: key, ${key}\`.` : `Compare \`<load_${key}>\` in a \`condition:\`.`;
    return `Silently ignored: \`${key}\` is saved with \`<save_${key}_...>\` in EWP's own keys, but ${reads} reads Valheim's global keys. ${fix}`;
  },

  filterBothForms: (singular: string, plural: string, section: string | null) =>
    `Overlapping fields: \`${singular}:\` and \`${plural}:\` are both written ${section ? `under \`${section}:\`` : "here"}. ` +
    `Check which one you want to keep.`,
};

/** The message for one silent-mistake finding (detectors return findings; the words live here). */
export function silentFindingMessage(f: SilentFinding): string {
  switch (f.id) {
    case "silent-condition-operator": return practiceMessages.conditionOperator(f.op);
    case "silent-change-needs-trigger-rules": return practiceMessages.changeNeedsTriggerRules(f.key);
    case "silent-poke-world-centre": return practiceMessages.pokeWorldCentre();
    case "silent-filter-weight-part": return practiceMessages.filterWeightPart(f.shown);
    case "silent-key-store-mix": return practiceMessages.keyStoreMix(f.key, f.watcher);
  }
}
