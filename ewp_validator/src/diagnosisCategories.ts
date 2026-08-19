// The shared diagnostic-category vocabulary — the `[branch]` tags that appear
// on problems — behind the Problems-panel category filter and the report
// dialog's "validation" sub-tag. This is the SOLE source for every category
// label: every checker (structuralPrecheck, formatLint, fileNameCheck,
// fileManager's reference-validation glue) imports its category constants
// from here rather than defining its own, so the filter vocabulary can never
// drift from what checkers actually emit. Kept import-free on purpose (a pure
// leaf module) so nothing here can create a circular import with a checker.
//
// Redesigned (message-catalog / category-grouping ticket) from the original
// 10 categories — one per internal check or schema branch — to 5, grouped by
// *kind of mistake* instead of by which internal mechanism found it. The old
// grouping had EWP rule entry absorbing dozens of unrelated mistakes while
// RPC rule entry/Formatting/Invalid file each got their own bucket for one
// narrow check — uneven, and it didn't help a scripter tell at a glance what
// kind of problem they were looking at.
//
// Naming principle: "___ problem" for any bucket that mixes severities (a
// real error alongside a merely-informational finding — "worth checking,"
// not "definitely broken"); "Invalid ___" reserved for the one bucket that's
// always a hard error every time it fires; "Legacy but working" for the one
// bucket that's never an error. The differently-shaped names are deliberate:
// they signal at a glance which kind of certainty a tag carries.
export const STRUCTURE_PROBLEM_CATEGORY = "Structure problem";
export const VALUE_PROBLEM_CATEGORY = "Value problem";
export const REFERENCE_PROBLEM_CATEGORY = "Reference problem";
export const YAML_PROBLEM_CATEGORY = "YAML problem";
export const INVALID_FILE_CATEGORY = "Invalid file";
export const LEGACY_CATEGORY = "Legacy but working";

/** Sub-group labels shown under {@link YAML_PROBLEM_CATEGORY} in the tag UI. */
export const YAML_SUBGROUP_PARSE = "(parse)";
export const YAML_SUBGROUP_ROOT = "(root)";
export const YAML_SUBGROUP_ITEM = "(item)";

export const DIAGNOSIS_CATEGORIES = [
  STRUCTURE_PROBLEM_CATEGORY,
  VALUE_PROBLEM_CATEGORY,
  REFERENCE_PROBLEM_CATEGORY,
  YAML_PROBLEM_CATEGORY,
  INVALID_FILE_CATEGORY,
  LEGACY_CATEGORY,
] as const;

export const DIAGNOSIS_CATEGORY_SET: ReadonlySet<string> = new Set(DIAGNOSIS_CATEGORIES);

// The filterable categories actually present among the given problem branches,
// ascending alphabetical (case-insensitive). Drives the dynamic category-filter
// menu: a category the current diagnoses never produced isn't offered.
export function presentSortedCategories(branches: Iterable<string>): string[] {
  const present = new Set<string>();
  for (const b of branches) if (DIAGNOSIS_CATEGORY_SET.has(b)) present.add(b);
  return [...present].sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }));
}

/** Copy/report tag string — YAML problem alone keeps a ` · (sub-group)` suffix. */
export function formatProblemTag(branch: string, entryType?: string): string {
  if (branch === YAML_PROBLEM_CATEGORY && entryType) return `${branch} · ${entryType}`;
  return branch;
}

/** Variant B (ticket 04): muted second line only for YAML-native sub-groups. */
export function shouldShowTagSubline(branch: string, entryType?: string): boolean {
  return branch === YAML_PROBLEM_CATEGORY && !!entryType;
}
