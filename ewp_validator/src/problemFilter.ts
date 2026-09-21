// The rules behind the Problems-panel filter and folded rows (hub ticket 29, built as round 6
// ticket 20). Pure functions, tested in problemFilter.test.ts, like uiRules.ts. The page code only
// draws what these return.
//
// - A "kind" is one diagnosis id at one severity (`data-reference:info`). The filter menu lists
//   kinds under their category. A parent tick selects or unselects every kind under it.
// - Ticks are not saved. Everything starts visible. A hidden kind stays counted in the menu.
// - A kind that is not an error and repeats FOLD_MIN times or more in one list folds into one row.
//   Errors never fold: each one needs its own fix.
import { DIAGNOSIS_CATEGORY_SET } from "./diagnosisCategories";
import { KIND_LABELS } from "./diagnosisLabels";

export interface KindedProblem {
  id: string;
  severity: string;
  branch: string;
}

export const FOLD_MIN = 3;

// Kinds that have a name but no menu item and no tick: they always show. A crashed check is a bug
// of ours, and hiding it would hide that a check did not run.
export const ALWAYS_SHOWN_IDS: ReadonlySet<string> = new Set(["check-crashed"]);

export const kindKey = (p: { id: string; severity: string }): string => `${p.id}:${p.severity}`;

export function kindLabel(id: string, severity: string): string {
  const entry = (KIND_LABELS as Record<string, unknown>)[id];
  if (typeof entry === "string") return entry;
  if (entry && typeof entry === "object") {
    const named = (entry as Record<string, string>)[severity];
    if (named) return named;
  }
  return id;
}

export interface KindEntry {
  key: string;
  label: string;
  count: number;
}

export interface CategoryEntry {
  category: string;
  kinds: KindEntry[];
}

/** The categories and kinds present in the given problems: categories A to Z, kinds A to Z, with counts. */
export function kindsPresent(problems: Iterable<KindedProblem>): CategoryEntry[] {
  const byCategory = new Map<string, Map<string, KindEntry>>();
  for (const p of problems) {
    if (!DIAGNOSIS_CATEGORY_SET.has(p.branch) || ALWAYS_SHOWN_IDS.has(p.id)) continue;
    const kinds = byCategory.get(p.branch) ?? new Map<string, KindEntry>();
    const key = kindKey(p);
    const entry = kinds.get(key) ?? { key, label: kindLabel(p.id, p.severity), count: 0 };
    entry.count++;
    kinds.set(key, entry);
    byCategory.set(p.branch, kinds);
  }
  const collator = (a: string, b: string) => a.localeCompare(b, "en", { sensitivity: "base" });
  return [...byCategory.entries()]
    .sort(([a], [b]) => collator(a, b))
    .map(([category, kinds]) => ({ category, kinds: [...kinds.values()].sort((a, b) => collator(a.label, b.label)) }));
}

/**
 * Does a problem belong to the tab being viewed? "thisfile" holds every severity of the open file;
 * the other tabs hold one severity each. The filter menu lists only the kinds of the current tab.
 */
export function inTab(p: { severity: string }, tab: string, inActiveFile: boolean): boolean {
  return tab === "thisfile" ? inActiveFile : p.severity === tab;
}

export type ParentState = "all" | "none" | "some";

/** The parent tick: all kinds visible, none visible, or a mix. */
export function parentState(keys: readonly string[], hidden: ReadonlySet<string>): ParentState {
  const hiddenCount = keys.filter((k) => hidden.has(k)).length;
  if (hiddenCount === 0) return "all";
  return hiddenCount === keys.length ? "none" : "some";
}

/** A new hidden set with every one of `keys` shown, or every one hidden. */
export function setKindsVisible(hidden: ReadonlySet<string>, keys: readonly string[], visible: boolean): Set<string> {
  const next = new Set(hidden);
  for (const k of keys) {
    if (visible) next.delete(k);
    else next.add(k);
  }
  return next;
}

/** A row passes the filter unless its kind is hidden. A problem outside every category always passes. */
export function passesKindFilter(p: KindedProblem, hidden: ReadonlySet<string>): boolean {
  return !DIAGNOSIS_CATEGORY_SET.has(p.branch) || ALWAYS_SHOWN_IDS.has(p.id) || !hidden.has(kindKey(p));
}

/** The line shown while any kind is hidden. Empty when nothing is hidden. */
export function hiddenNote(count: number): string {
  if (count <= 0) return "";
  return count === 1 ? "1 kind hidden" : `${count} kinds hidden`;
}

export type Segment<T> =
  | { type: "row"; row: T }
  | { type: "group"; key: string; label: string; rows: T[] };

/**
 * Fold repeats. A non-error kind seen `min` times or more becomes one group, placed where its first
 * row was. Every other row stays a row. Order is kept.
 */
export function foldRows<T>(rows: readonly T[], get: (row: T) => KindedProblem, min: number = FOLD_MIN): Segment<T>[] {
  const counts = new Map<string, number>();
  for (const r of rows) {
    const p = get(r);
    if (p.severity === "error") continue;
    counts.set(kindKey(p), (counts.get(kindKey(p)) ?? 0) + 1);
  }
  const out: Segment<T>[] = [];
  const groups = new Map<string, Extract<Segment<T>, { type: "group" }>>();
  for (const r of rows) {
    const p = get(r);
    const key = kindKey(p);
    if (p.severity === "error" || (counts.get(key) ?? 0) < min) {
      out.push({ type: "row", row: r });
      continue;
    }
    let g = groups.get(key);
    if (!g) {
      g = { type: "group", key, label: kindLabel(p.id, p.severity), rows: [] };
      groups.set(key, g);
      out.push(g);
    }
    g.rows.push(r);
  }
  return out;
}
