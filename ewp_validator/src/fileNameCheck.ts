// Ticket 13 (round 4): a filename gate that runs before the shape-based
// diagnosis passes. EWP only loads YAML whose name marks it as one of its
// structural files, so a name is worth checking on its own:
//   - `expand_prefabs*.yaml` / `data*.yaml` — current formats, scanned as usual.
//   - `expand_data*.yaml`      — the legacy data-processor name. It still works,
//     so it's scanned too, but carries a blue "rename to data<suffix>.yaml"
//     notice under the shared Legacy-format category.
//   - anything else            — allegedly not an EWP structural file: a hard
//     "Invalid file" error, and the diagnosis passes are skipped for it
//     entirely (see FileManager.revalidateAll).
import { INVALID_FILE_CATEGORY, LEGACY_CATEGORY } from "./diagnosisCategories";
import type { Problem } from "./structuralPrecheck";

export { INVALID_FILE_CATEGORY };

export type FileNameVerdict = "valid" | "legacy" | "invalid";

const REQUIRED_EXT = ".yaml";
const LEGACY_PREFIX = "expand_data";
/**
 * Current-format prefixes; the legacy `expand_data` prefix is handled separately.
 *
 * Note on `"data"`: EWP's real source rule for data files is folder-based
 * (any `.yaml` under its `config/data` folder, any name), not a name prefix —
 * see ticket 08 (validator-round2). This tool has no reliable access to a
 * scripter's real disk folder (our own `folder` field is a UI-only label for
 * export organization, not their EWP install path), so a folder-based check
 * isn't buildable here. The `"data"` prefix stays as a deliberate practical
 * heuristic — scripters conventionally don't name data-entry files anything
 * else — not a source-verified EWP rule. Revisit if that habit turns out to
 * be unreliable in practice.
 */
const VALID_PREFIXES = ["expand_prefabs", "data"];

export function classifyFileName(name: string): FileNameVerdict {
  const lower = name.toLowerCase();
  if (!lower.endsWith(REQUIRED_EXT)) return "invalid";
  const base = lower.slice(0, -REQUIRED_EXT.length); // name without its `.yaml`
  if (base.startsWith(LEGACY_PREFIX)) return "legacy";
  if (VALID_PREFIXES.some((p) => base.startsWith(p))) return "valid";
  return "invalid";
}

/**
 * The recommended current-format name for a legacy `expand_data<suffix>.yaml`:
 * `data<suffix>.yaml`, preserving the original suffix's casing but canonicalising
 * the prefix and extension. Only meaningful for a name that classifies as legacy.
 */
function legacyRenameTarget(name: string): string {
  // LEGACY_PREFIX and REQUIRED_EXT have fixed lengths, so slice by position to
  // keep the suffix verbatim regardless of the original's casing.
  const suffix = name.slice(LEGACY_PREFIX.length, name.length - REQUIRED_EXT.length);
  return `data${suffix}${REQUIRED_EXT}`;
}

export interface FileNameCheck {
  verdict: FileNameVerdict;
  /** The notice to surface: legacy → info, invalid → error, valid → none. */
  problem: Problem | null;
}

export function checkFileName(name: string): FileNameCheck {
  const verdict = classifyFileName(name);
  if (verdict === "valid") return { verdict, problem: null };

  if (verdict === "legacy") {
    const target = legacyRenameTarget(name);
    return {
      verdict,
      problem: {
        severity: "info",
        branch: LEGACY_CATEGORY,
        message:
          `Legacy filename: 'expand_data*.yaml' is the old data file name. It still works, ` +
          `but we recommend renaming it to '${target}' and move into the '/config/data' directory ` +
          `— click the filename above to rename it.`,
        range: [0, 0],
      },
    };
  }

  return {
    verdict,
    problem: {
      severity: "error",
      branch: INVALID_FILE_CATEGORY,
      message:
        `Invalid file: '${name}' doesn't match an EWP structural filename ` +
        `(expand_prefabs*.yaml, expand_data*.yaml, or data*.yaml). ` +
        `Allegedly not an EWP structural file — use the "Clear invalid files" trash icon ` +
        `to remove it.`,
      range: [0, 0],
    },
  };
}
