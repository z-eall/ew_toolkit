// The one catalog of "Practice recommendation" messages: EWP accepts the input
// (or silently ignores part of it), but a different habit is recommended.
// Messages only — detectors stay in their domain modules and call these with
// what the scan actually found (the real field and section, never a menu of
// alternatives). Never an error: every entry is info or warning. Group names
// mirror the ew_wiki habit pages; a test over this catalog enforces the shape
// (group lead-in, no "set", no "(or ...)"). See ewp_validator/AGENTS.md rule 6.

export const PRACTICE_GROUPS = ["Legacy format", "Legacy filename", "Preferred format", "Overlapping fields"] as const;
export type PracticeGroup = (typeof PRACTICE_GROUPS)[number];

const legacy = (found: string) => `Legacy format: ${found}. It still works, but we recommend using the latest format.`;

export const practiceMessages = {
  legacyDelay: () => legacy("a top-level `delay:`"),

  legacySpawn: (key: string) => legacy(`a single-line \`${key}:\``),

  legacyFilename: (target: string) =>
    `Legacy filename: 'expand_data*.yaml' is the old data file name. It still works, ` +
    `but we recommend renaming it to '${target}' and move into the '/config/data' directory ` +
    `— click the filename above to rename it.`,

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

  filterBothForms: (singular: string, plural: string, section: string | null) =>
    `Overlapping fields: \`${singular}:\` and \`${plural}:\` are both written ${section ? `under \`${section}:\`` : "here"}. ` +
    `Check which one you want to keep.`,
};
