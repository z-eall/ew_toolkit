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

export interface RpcParamIssue {
  /** The numbered key (e.g. "4") the issue is about — used to locate its range in the source. */
  key: string;
  kind: RpcIssueKind;
  message: string;
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

function describeJsType(v: unknown): string {
  if (typeof v === "boolean") return "a boolean";
  if (typeof v === "number") return "a number";
  if (Array.isArray(v)) return "a list";
  if (v && typeof v === "object") return "a mapping";
  return "a different value";
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
      const countDesc = doc.length === 0 ? "no parameters" : `${doc.length} parameter${doc.length === 1 ? "" : "s"}`;
      issues.push({
        key,
        kind: "extra",
        message: `RPC '${rpcName}' doesn't document a parameter '${key}' (it defines ${countDesc}) — this still works, but worth double-checking it's intentional.`,
      });
      continue;
    }

    if (typeof raw !== "string") {
      issues.push({
        key,
        kind: "not-a-string",
        message:
          `RPC '${rpcName}' parameter '${key}' should be written as "${docParam.type}, <value>" (a string), ` +
          `got ${describeJsType(raw)} instead. This may still work, but is worth writing out explicitly.`,
      });
      continue;
    }

    const declaredType = raw.split(",")[0].trim();
    if (declaredType !== "") {
      if (
        declaredType.toLowerCase() === docParam.type.toLowerCase() &&
        declaredType !== docParam.type
      ) {
        issues.push({
          key,
          kind: "type-mismatch",
          message:
            `RPC '${rpcName}' parameter '${key}' uses type prefix '${declaredType}', but EWP matches types ` +
            `case-sensitively — use '${docParam.type}' (${docParam.desc}).`,
        });
      } else if (!rpcTypesCompatible(declaredType, docParam.type)) {
        issues.push({
          key,
          kind: "type-mismatch",
          message: `RPC '${rpcName}' parameter '${key}' is declared as '${declaredType}', but the documented type is '${docParam.type}' (${docParam.desc}).`,
        });
      }
    }
  }

  for (let i = 0; i < doc.length; i++) {
    const key = String(i + 1);
    if (key in entry) continue;
    issues.push({
      key,
      kind: "missing",
      message:
        `RPC '${rpcName}' is missing documented parameter '${key}' (${doc[i]!.type}: ${doc[i]!.desc}) — ` +
        `EWP will still send the RPC with fewer args, but this is worth checking.`,
    });
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

function unrecognizedRpcKeyMessage(key: string): string {
  const onRuleEntry = RULE_ENTRY_FIELDS.has(key);
  const onSpawnData = SPAWN_DATA_FIELDS.has(key);
  if (onRuleEntry || onSpawnData) {
    const where =
      onRuleEntry && onSpawnData
        ? "the rule entry itself or a spawn:/swap: entry"
        : onRuleEntry
          ? "the rule entry itself"
          : "a spawn:/swap: entry";
    return (
      `RPC entries don't recognize '${key}:' — it does nothing here, even once its value is written ` +
      `correctly (it's a field on ${where}, not on an objectRpc:/clientRpc: entry). Move it there, or remove it.`
    );
  }
  return (
    `RPC entries don't recognize '${key}:' — it does nothing here, even once its value is written ` +
    `correctly. If this is meant as a numbered call parameter, use "1", "2", etc. instead.`
  );
}

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
    issues.push({ key, kind: "unrecognized-key", message: unrecognizedRpcKeyMessage(key) });
  }
  return issues;
}
