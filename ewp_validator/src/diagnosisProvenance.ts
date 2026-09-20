// Where each diagnosis came from: did someone read the mod's C# (source), the mod docs (docs),
// or is it our own guess (heuristic)? Decided in round 6 ticket 06; one entry per registered id,
// and the type below makes a missing id a compile error. Nothing here is checked by machine
// against the mod: a person edits an entry when they re-check the rule.
//
// Levels:
//   source      read from the mod's real C# code.
//   docs        taken from the mod's documentation only. Never promote to an error (AGENTS.md rule 5).
//   heuristic   our own guess about what the scripter meant; `note` says why.
//   library     comes from the YAML or schema library, not from EWP behavior.
//   unrecorded  nobody wrote down how this was verified. Check it, then change the level.
//
// `files` are paths inside the mirrored mod repos (valheim-modding/upstream/<repo>/...). The
// mirror's `changes` report reads them to
// list the rules to re-check when one of those files changes.
// `checked` is a date (YYYY-MM-DD) when someone last compared the rule with the mod, or null if
// it is not recorded. `ewpVersion` is the EWP version at that check, or null.
import type { DiagnosisId } from "./diagnosisKinds";

export type ProvenanceLevel = "source" | "docs" | "heuristic" | "library" | "unrecorded";

export interface Provenance {
  level: ProvenanceLevel;
  files: readonly string[];
  checked: string | null;
  ewpVersion: string | null;
  /** Why (required for heuristic, unrecorded and library; optional detail otherwise). */
  note?: string;
}

const EWP = "valheim-expand_world_prefabs/";
const WEC = "valheim-world_edit_commands/";
const PREFAB_DATA = `${EWP}ExpandWorldPrefabs/PrefabData.cs`;
const PREFAB_LOADING = `${EWP}ExpandWorldPrefabs/PrefabLoading.cs`;
const FILE_LOADING = `${EWP}ExpandWorldPrefabs/service/FileLoading.cs`;
const DATA_LOADING = `${EWP}ExpandWorldPrefabs/service/data/DataLoading.cs`;
const FUNCTIONS = `${EWP}ExpandWorldPrefabs/service/data/Functions.cs`;
const OBJECT_FUNCTIONS = `${EWP}ExpandWorldPrefabs/service/data/ObjectFunctions.cs`;
const PARSE = `${EWP}ExpandWorldPrefabs/service/Parse.cs`;
const DATA_STORAGE = `${EWP}ExpandWorldPrefabs/service/DataStorage.cs`;
const RPC_INFO = `${EWP}ExpandWorldPrefabs/RpcInfo.cs`;
const RPCS_MD = `${EWP}docs/RPCs.md`;
const SCRIPTING_MD = `${EWP}docs/scripting.md`;
const CONDITIONS = `${EWP}ExpandWorldPrefabs/service/data/Conditions.cs`;
const HANDLE_CHANGED = `${EWP}ExpandWorldPrefabs/HandleChanged.cs`;
const PREFAB_MANAGER = `${EWP}ExpandWorldPrefabs/PrefabManager.cs`;
const INFO_MANAGER = `${EWP}ExpandWorldPrefabs/InfoManager.cs`;
const HANDLE_GLOBAL_KEY = `${EWP}ExpandWorldPrefabs/HandleGlobalKey.cs`;
const FILTER_SHORTHAND = `${EWP}ExpandWorldPrefabs/service/FilterShorthand.cs`;
const YAML_LOADER = `${EWP}ExpandWorldPrefabs/service/Yaml.cs`;
const WEC_DATA_MD = `${WEC}README_data.md`;

// The schema audit (map "Schema Source Audit", tickets 01-07) compared all 8 strict shapes with
// the C# at EWP 1.60.0 / WEC 1.77.0 on this date.
const AUDIT = { checked: "2026-09-18", ewpVersion: "1.60.0" } as const;
const NOT_DATED = { checked: null, ewpVersion: null } as const;

export const DIAGNOSIS_PROVENANCE: Record<DiagnosisId, Provenance> = {
  "filename-invalid": { level: "heuristic", files: [FILE_LOADING], ...NOT_DATED, note: "expand_prefabs* and expand_data* follow EWP's file loading; the data* prefix is a chosen guess (this tool cannot see the scripter's install folder)" },
  "filename-legacy": { level: "source", files: [FILE_LOADING], ...NOT_DATED, note: "expand_data* is the old processor name that EWP still loads" },

  "yaml-syntax-error": { level: "library", files: [], ...NOT_DATED, note: "reported by the YAML parser; wording is ours" },
  "yaml-warning": { level: "library", files: [], ...NOT_DATED, note: "reported by the YAML parser; wording is ours" },
  "yaml-no-active-content": { level: "library", files: [], ...NOT_DATED, note: "a file with everything commented out parses to nothing; a warning, not an error" },
  "yaml-top-level-not-list": { level: "library", files: [SCRIPTING_MD], ...NOT_DATED, note: "EWP files are a YAML list of entries" },
  "yaml-entry-not-map": { level: "library", files: [SCRIPTING_MD], ...NOT_DATED, note: "each EWP entry is key: value pairs" },

  "format-bad-key": { level: "heuristic", files: [], ...NOT_DATED, note: "a real EWP key never contains a colon, so a double colon is a typo" },
  "wec-data-key-name-typo": { level: "heuristic", files: [WEC_DATA_MD], ...NOT_DATED, note: "guess: a data entry with data: but no name: was meant to have name:" },
  "prefab-requiredness": { level: "source", files: [PREFAB_LOADING, `${EWP}ExpandWorldPrefabs/InfoManager.cs`], checked: "2026-09-20", ewpVersion: "1.60.0", note: "PrefabLoading.cs logs a warning (not an error) for a prefab-less rule of any other type, then InfoManager.Add still loads it; verified 2026-09-20 against the local mirror" },

  "shape-scalar-field-as-list": { level: "source", files: [PREFAB_DATA], ...AUDIT, note: "these fields are single strings in the C# class" },
  "shape-list-field-as-inline-triple": { level: "heuristic", files: [PREFAB_DATA], ...NOT_DATED, note: "guess about intent from the shape of the line" },
  "shape-filter-as-list": { level: "source", files: [FILTER_SHORTHAND, YAML_LOADER], checked: "2026-09-20", ewpVersion: "1.60.0", note: "FilterShorthand.cs renames every filter:/bannedFilter: key to the plural and keeps a list as a list, so a list under the singular name works" },
  "rpc-orphan-sibling-param": { level: "heuristic", files: [RPC_INFO], ...NOT_DATED, note: "guess that a numbered parameter split from its name entry was a mis-indented list" },
  "rpc-missing-name": { level: "heuristic", files: [RPC_INFO], ...NOT_DATED, note: "guess that an entry with numbered parameters and no name lost its name" },
  "rpc-param-mismatch": { level: "docs", files: [RPCS_MD, RPC_INFO], ...NOT_DATED, note: "the parameter table is rebuilt from docs/RPCs.md on every schema run; warning only" },
  "rpc-unrecognized-key": { level: "source", files: [PREFAB_DATA], ...NOT_DATED, note: "known key sets come from the Data and SpawnData classes" },

  "practice-legacy-delay": { level: "docs", files: [SCRIPTING_MD], ...NOT_DATED, note: "live-tested to work; the docs call it Legacy format" },
  "practice-legacy-spawn": { level: "docs", files: [SCRIPTING_MD], ...NOT_DATED, note: "live-tested to work; the docs call it Legacy format" },

  "ajv-scalar-field-type": { level: "source", files: [PREFAB_DATA], ...AUDIT },
  "ajv-commented-out-list": { level: "heuristic", files: [], ...NOT_DATED, note: "guess: a list whose only item is commented out was disabled on purpose" },
  "ajv-type-value-enum": { level: "source", files: [PREFAB_DATA, PREFAB_LOADING], ...AUDIT, note: "type words are read case-insensitively (Enum.TryParse with ignoreCase)" },
  "ajv-unknown-key": { level: "source", files: [PREFAB_DATA, PREFAB_LOADING, WEC_DATA_MD], ...AUDIT, note: "the schema's key lists match the C# classes for the 8 strict shapes" },
  "ajv-required": { level: "source", files: [PREFAB_DATA, WEC_DATA_MD], ...AUDIT },
  "ajv-value": { level: "source", files: [PREFAB_DATA], ...AUDIT, note: "only the 8 strict shapes were compared; loose fields accept almost anything" },

  "data-reference": { level: "source", files: [DATA_LOADING], ...NOT_DATED, note: "load order and the Duplicate data entry warning were read from DataLoading.cs" },
  "custom-key": { level: "source", files: [DATA_STORAGE, PARSE], ...NOT_DATED, note: "keys are lowercased before lookup; read in the round 5 custom-key research" },
  "template-function": { level: "source", files: [FUNCTIONS, OBJECT_FUNCTIONS], ...NOT_DATED, note: "function-name tables copied from the two files (line numbers in the code comments)" },
  "poke-parameter": { level: "source", files: [PREFAB_DATA], ...NOT_DATED, note: "parameter/pars splitting rules from PrefabData.cs (round 3 research)" },
  "malformed-reference": { level: "source", files: [PARSE], ...NOT_DATED, note: "key/value split is a plain first-underscore find (round 5 research)" },
  "legacy-object-data": { level: "source", files: [PREFAB_DATA], checked: "2026-09-20", ewpVersion: "1.60.0", note: "Object(ObjectData) uses data: as a one-entry filter when neither filters nor bannedFilters is written" },
  "ignored-data-with-filter": { level: "source", files: [PREFAB_DATA], checked: "2026-09-20", ewpVersion: "1.60.0", note: "in Object(ObjectData) data: is read only in the else branch, so filters or bannedFilters make it unused" },
  "filter-both-forms": { level: "source", files: [FILTER_SHORTHAND, YAML_LOADER], checked: "2026-09-20", ewpVersion: "1.60.0", note: "both become filters: after FilterShorthand.cs; the loader has no duplicate-key check, so the later one wins and the earlier is lost without an error" },

  "silent-condition-operator": { level: "source", files: [CONDITIONS, PREFAB_DATA, PREFAB_LOADING], checked: "2026-09-20", ewpVersion: "1.60.0", note: "Conditions.cs reads a single =; == and <> do not parse; PrefabData.cs and PrefabLoading.cs log a warning and use an always-false condition, so the rule still loads" },
  "silent-change-needs-trigger-rules": { level: "source", files: [PREFAB_LOADING, PREFAB_MANAGER, HANDLE_CHANGED], checked: "2026-09-20", ewpVersion: "1.60.0", note: "TriggerRules defaults to false; while a rule writes data: on its own object PrefabManager sets HandleChanged.IgnoreZdo, and the change handler returns early for that object" },
  "silent-poke-world-centre": { level: "source", files: [PREFAB_DATA, INFO_MANAGER, HANDLE_GLOBAL_KEY], checked: "2026-09-20", ewpVersion: "1.60.0", note: "globalkey, key, time and realtime triggers call HandleGlobal at Vector3.zero; a poke filter is an Object whose maxDistance defaults to 100; event and custom carry a real position, so they are excluded" },
  "silent-filter-weight-part": { level: "source", files: [PREFAB_DATA], checked: "2026-09-20", ewpVersion: "1.60.0", note: "Filter reads a 4th comma part as the weight; the default limit is the number of filters, so a second value is never accepted" },
  "silent-key-store-mix": { level: "source", files: [INFO_MANAGER, HANDLE_GLOBAL_KEY, DATA_STORAGE], checked: "2026-09-20", ewpVersion: "1.60.0", note: "type: key fires from DataStorage (EWP keys); type: globalkey fires from ZoneSystem RPC_SetGlobalKey (Valheim keys); setkey is the vanilla console command for Valheim keys (vanilla code not opened)" },

  "check-crashed": { level: "library", files: [], ...NOT_DATED, note: "our own safety net, not a mod rule" },
};
