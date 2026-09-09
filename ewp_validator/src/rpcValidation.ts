// Cross-checks objectRpc:/clientRpc: numbered parameters against Jere's own
// RPC documentation:
// https://github.com/JereKuusela/valheim-expand_world_prefabs/blob/main/docs/RPCs.md
//
// Param tables are generated at build time (schema/parse-rpcs.mjs →
// rpcParams.generated.ts). This module owns checkRpcParams() logic only.

import { CLIENT_RPC_PARAMS, OBJECT_RPC_PARAMS } from "./rpcParams.generated";
import schemaJson from "./schema.generated.json";

export interface RpcParamDoc {
  type: string;
  desc: string;
}

export { CLIENT_RPC_PARAMS, OBJECT_RPC_PARAMS };

// Fixed prefix + open repeat tail — must stay in sync with schema/rpcOverrides.mjs.
export const VARIADIC_RPCS = new Set(["DestroyZDO", "LocationIcons"]);

export type RpcIssueKind = "extra" | "not-a-string" | "type-mismatch" | "missing" | "unrecognized-key";

/** Coarse JS type tag for a wrongly-typed RPC param value — shapeMismatchDiagnosis.ts phrases it. */
export type RpcActualType = "boolean" | "number" | "list" | "mapping" | "other";

/** Where an unrecognized RPC-entry key actually belongs, if it's a known field elsewhere. */
export type RpcKeyOwner = "rule-entry" | "spawn-data" | "both" | null;

export interface RpcParamIssue {
  /** The numbered key (e.g. "4") the issue is about — used to locate its range in the source. */
  key: string;
  kind: RpcIssueKind;
  /** "extra": how many parameters the RPC documents. */
  docParamCount?: number;
  /** "not-a-string" | "type-mismatch" | "missing": the documented param this issue is about. */
  docParam?: RpcParamDoc;
  /** "not-a-string": coarse type of the value actually given. */
  actualType?: RpcActualType;
  /** "type-mismatch": the type prefix actually written. */
  declaredType?: string;
  /** "type-mismatch": true when declaredType differs from the documented type only in case. */
  caseOnlyMismatch?: boolean;
  /** "unrecognized-key": where the key belongs instead, if known. */
  belongsTo?: RpcKeyOwner;
}

/** EWP runtime treats these declared type prefixes as interchangeable (RpcInfo.cs + Parse.Enum*). */
function rpcTypesCompatible(declared: string, documented: string): boolean {
  if (declared === documented) return true;
  const pair = new Set([declared, documented]);
  if (pair.has("name") && pair.has("string")) return true;
  if (documented.startsWith("enum_") && declared === "int") return true;
  if (declared.startsWith("enum_") && documented === "int") return true;
  return false;
}

function describeJsType(v: unknown): RpcActualType {
  if (typeof v === "boolean") return "boolean";
  if (typeof v === "number") return "number";
  if (Array.isArray(v)) return "list";
  if (v && typeof v === "object") return "mapping";
  return "other";
}

/**
 * Checks one rpc entry's numbered parameters (already-parsed plain JS
 * values, e.g. from a YAMLMap's toJSON()) against `table`'s documented
 * shape for `rpcName`. Returns [] when the name isn't in the table (nothing
 * to check against — including the deliberately-omitted ambiguous names)
 * or when every present parameter matches.
 */
export function checkRpcParams(
  table: Record<string, { type: string; desc: string }[]>,
  rpcName: string,
  entry: Record<string, unknown>,
): RpcParamIssue[] {
  const doc = table[rpcName];
  if (!doc) return [];
  const variadic = VARIADIC_RPCS.has(rpcName);
  const issues: RpcParamIssue[] = [];

  for (const key of Object.keys(entry)) {
    if (!/^[1-9][0-9]*$/.test(key)) continue;
    const index = Number(key);
    const raw = entry[key];
    const docParam = doc[index - 1];

    if (!docParam) {
      if (variadic && index > doc.length) continue;
      issues.push({ key, kind: "extra", docParamCount: doc.length });
      continue;
    }

    if (typeof raw !== "string") {
      issues.push({ key, kind: "not-a-string", docParam, actualType: describeJsType(raw) });
      continue;
    }

    const declaredType = raw.split(",")[0].trim();
    if (declaredType !== "") {
      if (
        declaredType.toLowerCase() === docParam.type.toLowerCase() &&
        declaredType !== docParam.type
      ) {
        issues.push({ key, kind: "type-mismatch", docParam, declaredType, caseOnlyMismatch: true });
      } else if (!rpcTypesCompatible(declaredType, docParam.type)) {
        issues.push({ key, kind: "type-mismatch", docParam, declaredType, caseOnlyMismatch: false });
      }
    }
  }

  for (let i = 0; i < doc.length; i++) {
    const key = String(i + 1);
    if (key in entry) continue;
    issues.push({ key, kind: "missing", docParam: doc[i]! });
  }

  return issues;
}

// objectRpc:/clientRpc: entries are a true open Dictionary<string,string> in
// C# (schema/generate.mjs's rpcEntry comment) — ajv's additionalProperties
// schema can only reject a *wrongly-typed* extra key (e.g. a boolean), never
// an extra key with a string value, since a string is always structurally
// legal there. That means a key like `triggerRules:`/`remove:` — real fields
// on the rule entry itself or a spawn:/swap: entry (PrefabData.cs's Data /
// SpawnData classes), nested here by mistake — silently does nothing at
// runtime whether or not its value happens to be a string. Known-key sets
// are read from the generated schema rather than duplicated here, so they
// can't drift from it.
const RPC_ENTRY_KNOWN_KEYS = new Set(
  Object.keys((schemaJson as any).definitions.ewpRuleEntry.properties.objectRpc.items.properties),
);
const RULE_ENTRY_FIELDS = new Set(Object.keys((schemaJson as any).definitions.ewpRuleEntry.properties));
const SPAWN_DATA_FIELDS = new Set(Object.keys((schemaJson as any).definitions.spawnData.properties));

/**
 * Flags a non-numeric RPC entry key that isn't one of the known RPC fields
 * (name/target/chance/…) — distinct from {@link checkRpcParams}, which only
 * walks numbered call-arg keys. Runs regardless of whether `rpcName` has a
 * documented param table, since this only depends on the entry's own keys.
 */
export function checkRpcUnrecognizedKeys(entry: Record<string, unknown>): RpcParamIssue[] {
  const issues: RpcParamIssue[] = [];
  for (const key of Object.keys(entry)) {
    if (/^[1-9][0-9]*$/.test(key)) continue;
    if (RPC_ENTRY_KNOWN_KEYS.has(key)) continue;
    const onRuleEntry = RULE_ENTRY_FIELDS.has(key);
    const onSpawnData = SPAWN_DATA_FIELDS.has(key);
    const belongsTo: RpcKeyOwner = onRuleEntry && onSpawnData ? "both" : onRuleEntry ? "rule-entry" : onSpawnData ? "spawn-data" : null;
    issues.push({ key, kind: "unrecognized-key", belongsTo });
  }
  return issues;
}

function hasNumberedRpcParamKeys(entry: Record<string, unknown>): boolean {
  return Object.keys(entry).some((k) => /^[1-9][0-9]*$/.test(k));
}

/** The numbered call-parameter keys on one RPC list entry (e.g. ["1", "2"]). */
export function numberedRpcParamKeys(entry: Record<string, unknown>): string[] {
  return Object.keys(entry).filter((k) => /^[1-9][0-9]*$/.test(k));
}

function isNameOnlyRpcEntry(entry: Record<string, unknown>): boolean {
  return typeof entry.name === "string" && !hasNumberedRpcParamKeys(entry);
}

export interface OrphanRpcListItem {
  index: number;
  /** True when the immediately preceding sibling entry is name-only (a likely split point). */
  previousIsNameOnly: boolean;
}

/**
 * Finds objectRpc:/clientRpc: list entries that have numbered call-parameter
 * keys but no `name:` — a likely sign the entry was split from (or never
 * given) its own `name:`. shapeMismatchDiagnosis.ts turns each result into a
 * message and a suppressed ajv range — see diagnosis-arbitration ticket 09.
 */
export function findOrphanRpcListItems(entries: Record<string, unknown>[]): OrphanRpcListItem[] {
  const orphans: OrphanRpcListItem[] = [];
  for (let index = 0; index < entries.length; index++) {
    const entry = entries[index]!;
    if (typeof entry.name === "string" || !hasNumberedRpcParamKeys(entry)) continue;
    const prev = index > 0 ? entries[index - 1]! : null;
    orphans.push({ index, previousIsNameOnly: !!prev && isNameOnlyRpcEntry(prev) });
  }
  return orphans;
}
