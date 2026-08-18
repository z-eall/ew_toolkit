// The shared diagnostic-category vocabulary — the `[branch]` tags that appear
// on problems — behind the Problems-panel category filter and the report
// dialog's "validation" sub-tag. Kept in one module so the checkers
// (structuralPrecheck's BRANCH_TITLES, fileManager's reference labels) and the
// UI stay in step, and so the pure list/sort helpers can be unit-tested without
// pulling in main.ts's DOM/monaco entry point.
import { INVALID_FILE_CATEGORY } from "./fileNameCheck";
import { FORMAT_CATEGORY } from "./formatLint";
import { BRANCH_TITLES, LEGACY_FORMAT_CATEGORY, RPC_RULE_CATEGORY } from "./structuralPrecheck";

// Reference-validation labels (referenceValidation's `kind` maps to these).
// Renamed from "data.yaml reference": `expand_data*.yaml` files are also a
// source of these entries after the filename gate, so "data.yaml" was too
// narrow — it's any data-entry reference now (ticket 13 round 7).
export const DATA_REFERENCE_CATEGORY = "Data entry reference";
export const CUSTOM_KEY_CATEGORY = "Custom saved key";
export const OBJECT_DATA_CATEGORY = "Object data";

// Labels are sentence-case ("Proper case") except where they lead with an
// established abbreviation (EWP/WEC), which stays upper-case.
export const DIAGNOSIS_CATEGORIES = [
  // The four branch titles are single-sourced from structuralPrecheck's
  // BRANCH_TITLES so the filter vocabulary can't drift from what checkers emit.
  BRANCH_TITLES.ewpRuleEntry,
  BRANCH_TITLES.wecDataEntry,
  BRANCH_TITLES.valueEntry,
  BRANCH_TITLES.valueGroup,
  LEGACY_FORMAT_CATEGORY,
  RPC_RULE_CATEGORY,
  INVALID_FILE_CATEGORY,
  FORMAT_CATEGORY,
  DATA_REFERENCE_CATEGORY,
  CUSTOM_KEY_CATEGORY,
  OBJECT_DATA_CATEGORY,
] as const;

export const DIAGNOSIS_CATEGORY_SET: ReadonlySet<string> = new Set(DIAGNOSIS_CATEGORIES);

// The filterable categories actually present among the given problem branches,
// ascending alphabetical (case-insensitive). Drives the dynamic category-filter
// menu: a category the current diagnoses never produced isn't offered, and
// synthetic parse/root/item branches (not in the vocabulary) are never listed.
export function presentSortedCategories(branches: Iterable<string>): string[] {
  const present = new Set<string>();
  for (const b of branches) if (DIAGNOSIS_CATEGORY_SET.has(b)) present.add(b);
  return [...present].sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" }));
}
