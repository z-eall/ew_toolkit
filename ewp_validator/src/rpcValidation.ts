// Cross-checks objectRpc:/clientRpc: numbered parameters against Jere's own
// RPC documentation:
// https://github.com/JereKuusela/valheim-expand_world_prefabs/blob/main/docs/RPCs.md
//
// An rpc entry's numbered keys ("1", "2", ...) are a true open string
// dictionary in the schema (see rpcEntry in schema/generate.mjs) — EWP will
// still call the RPC with whatever is given. So a parameter the docs don't
// define, or one whose declared type doesn't match, still *works*; it's
// just worth double-checking. Every issue here is a warning, never a hard
// error — that's the point (the base schema's raw "must be string" ajv
// error is genuinely unclear in exactly this scenario, per the report that
// prompted this module).

export interface RpcParamDoc {
  type: string;
  desc: string;
}

// A handful of RPC names are documented once per component but with
// genuinely different signatures, and an objectRpc entry never says which
// component it's calling — so there's no way to know which shape applies.
// Rather than guess (and risk a false warning either way), these are left
// out of the table entirely: RPC_DestroyAttachment/RPC_DropItem (ArmorStand:
// 1 int param; ItemStand: no parameters) and RPC_Extract (Beehive: no
// parameters; SapCollector: 1 zdo param).

// ---------- Object RPCs (objectRpc:) ----------
export const OBJECT_RPC_PARAMS: Record<string, RpcParamDoc[]> = {
  RPC_DropItemByName: [{ type: "string", desc: "name of the item" }],
  RPC_RequestOwn: [],
  RPC_SetPose: [{ type: "int", desc: "number of the pose" }],
  RPC_SetVisualItem: [
    { type: "int", desc: "item slot index" },
    { type: "string", desc: "item name" },
    { type: "int", desc: "variant" },
    { type: "int", desc: "orientation: 0/1/2/3" },
  ],
  Alert: [],
  OnNearProjectileHit: [
    { type: "vec", desc: "projectile location" },
    { type: "float", desc: "trigger range" },
    { type: "zdo", desc: "attacker" },
  ],
  SetAggravated: [
    { type: "bool", desc: "is aggravated" },
    { type: "enum_reason", desc: "0=Damage, 1=Building, 2=Theft" },
  ],
  SetOwner: [
    { type: "long", desc: "player id" },
    { type: "name", desc: "owner name" },
  ],
  RPC_AddNoise: [{ type: "float", desc: "noise level" }],
  RPC_AddAdrenaline: [{ type: "float", desc: "amount" }],
  RPC_Damage: [{ type: "hit", desc: "hit data" }],
  RPC_FreezeFrame: [{ type: "float", desc: "freeze duration" }],
  RPC_Heal: [
    { type: "float", desc: "health amount" },
    { type: "bool", desc: "show text" },
  ],
  RPC_Stagger: [{ type: "vec", desc: "stagger direction" }],
  RPC_ResetCloth: [],
  RPC_SetTamed: [{ type: "bool", desc: "is tamed" }],
  RPC_TeleportTo: [
    { type: "vec", desc: "teleport location" },
    { type: "quat", desc: "rotation" },
    { type: "bool", desc: "distant teleport" },
  ],
  RequestOpen: [{ type: "long", desc: "player id" }],
  OpenRespons: [{ type: "bool", desc: "can be opened" }],
  RPC_RequestStack: [{ type: "long", desc: "player id" }],
  RPC_StackResponse: [{ type: "bool", desc: "can be stacked" }],
  RequestTakeAll: [{ type: "long", desc: "player id" }],
  TakeAllRespons: [{ type: "bool", desc: "can be taken" }],
  RPC_AddFuel: [],
  RPC_AddItem: [{ type: "string", desc: "item name" }],
  RPC_SetSlotVisual: [
    { type: "int", desc: "slot index" },
    { type: "name", desc: "item name" },
  ],
  RPC_RemoveDoneItem: [
    { type: "vec", desc: "spawn position" },
    { type: "int", desc: "spawn multiplier" },
  ],
  RPC_CreateFragments: [],
  UseDoor: [{ type: "bool", desc: "forward or backward" }],
  RPC_EatConfirmation: [],
  RPC_OnEat: [],
  RPC_TryEat: [{ type: "int", desc: "item slot index" }],
  RPC_Tap: [],
  RPC_AddFuelAmount: [{ type: "float", desc: "fuel amount" }],
  RPC_SetFuelAmount: [{ type: "float", desc: "fuel amount" }],
  RPC_ToggleOn: [],
  Pickup: [],
  RequestPickup: [],
  RPC_Nibble: [
    { type: "zdo", desc: "fish id" },
    { type: "bool", desc: "correct bait" },
  ],
  Step: [
    { type: "int", desc: "effect index" },
    { type: "vec", desc: "position" },
  ],
  RPC_AnimateLever: [],
  RPC_AnimateLeverReturn: [],
  RPC_RequestIncinerate: [],
  RPC_IncinerateRespons: [{ type: "int", desc: "result: 0/1/2/3" }],
  RPC_MakePiece: [],
  RPC_UpdateVisual: [],
  SetVisualItem: [
    { type: "string", desc: "item name" },
    { type: "int", desc: "variant" },
    { type: "int", desc: "level" },
  ],
  MapData: [{ type: "bytes", desc: "unusable" }],
  Hit: [
    { type: "hit", desc: "hit data" },
    { type: "int", desc: "part index" },
  ],
  Hide: [{ type: "int", desc: "part index" }],
  RPC_Hit: [
    { type: "hit", desc: "hit data" },
    { type: "int", desc: "part index" },
  ],
  RPC_SetAreaHealth: [
    { type: "int", desc: "part index" },
    { type: "float", desc: "health" },
  ],
  RPC_Sleep: [],
  RPC_Wakeup: [],
  SetPlayed: [],
  RPC_PlayMusic: [],
  RPC_BossSpawnInitiated: [],
  RPC_RemoveBossSpawnInventoryItems: [],
  RPC_SpawnBoss: [
    { type: "vec", desc: "spawn position" },
    { type: "bool", desc: "remove items" },
  ],
  RPC_Pick: [{ type: "int", desc: "extra amount" }],
  RPC_SetPicked: [{ type: "bool", desc: "is picked" }],
  Pick: [],
  Message: [
    { type: "enum_message", desc: "1=TopLeft, 2=Center" },
    { type: "string", desc: "message" },
    { type: "int", desc: "amount" },
  ],
  OnDeath: [],
  OnTargeted: [
    { type: "bool", desc: "is sensed" },
    { type: "bool", desc: "is targeted" },
  ],
  UseStamina: [{ type: "float", desc: "stamina amount" }],
  RPC_HitWhileDodging: [],
  ToggleEnabled: [{ type: "long", desc: "player id" }],
  TogglePermitted: [
    { type: "long", desc: "player id" },
    { type: "string", desc: "player name" },
  ],
  FlashShield: [],
  RPC_Attach: [{ type: "zdo", desc: "attached zdo" }],
  RPC_OnHit: [],
  RPC_SetStayTTL: [{ type: "float", desc: "seconds to stay" }],
  RPC_Drain: [{ type: "float", desc: "amount" }],
  Controls: [
    { type: "vec", desc: "direction" },
    { type: "int", desc: "speed" },
    { type: "float", desc: "ride skill" },
  ],
  RequestControl: [{ type: "long", desc: "player id" }],
  ReleaseControl: [{ type: "long", desc: "player id" }],
  RequestRespons: [{ type: "bool", desc: "request ok" }],
  RemoveSaddle: [{ type: "vec", desc: "position" }],
  RPC_UpdateEffects: [],
  RPC_AddStatusEffect: [
    { type: "hash", desc: "status effect" },
    { type: "bool", desc: "reset time" },
    { type: "int", desc: "item level" },
    { type: "float", desc: "skill level" },
  ],
  RPC_SetFuel: [{ type: "float", desc: "fuel amount" }],
  RPC_Attack: [],
  RPC_HitNow: [],
  Stop: [],
  Forward: [],
  Backward: [],
  Rudder: [{ type: "float", desc: "rudder angle" }],
  RPC_AddOre: [{ type: "string", desc: "item name" }],
  RPC_EmptyProcessed: [],
  Say: [
    { type: "int", desc: "0=Whisper, 1=Normal, 2=Shout" },
    { type: "userinfo", desc: "sender name" },
    { type: "string", desc: "message" },
  ],
  AddSaddle: [],
  Command: [
    { type: "zdo", desc: "commanding player" },
    { type: "bool", desc: "show message" },
  ],
  SetName: [
    { type: "string", desc: "creature name" },
    { type: "string", desc: "author name" },
  ],
  RPC_UnSummon: [],
  SetSaddle: [{ type: "bool", desc: "is saddled" }],
  RPC_SetConnected: [{ type: "zdo", desc: "target object" }],
  RPC_SetTag: [
    { type: "string", desc: "tag" },
    { type: "string", desc: "author name" },
  ],
  ApplyOperation: [
    { type: "vec", desc: "position" },
    { type: "float", desc: "level offset" },
    { type: "bool", desc: "is level" },
    { type: "float", desc: "level radius" },
    { type: "bool", desc: "is square" },
    { type: "bool", desc: "is raise" },
    { type: "float", desc: "raise radius" },
    { type: "float", desc: "raise power" },
    { type: "float", desc: "raise delta" },
    { type: "bool", desc: "is smooth" },
    { type: "float", desc: "smooth radius" },
    { type: "float", desc: "smooth power" },
    { type: "bool", desc: "paint clear" },
    { type: "bool", desc: "paint height check" },
    { type: "enum_terrainpaint", desc: "0=Dirt, 1=Cultivate, 2=Paved, 3=Reset, 4=ClearVegetation" },
    { type: "float", desc: "paint radius" },
  ],
  RPC_RequestStateChange: [{ type: "enum_trap", desc: "0=Armed, 1=Disarmed, 2=Triggered" }],
  RPC_OnStateChanged: [{ type: "enum_trap", desc: "0=Armed, 1=Disarmed, 2=Triggered" }],
  RPC_Grow: [],
  RPC_Shake: [],
  Trigger: [],
  RPC_AddAmmo: [{ type: "name", desc: "ammo name" }],
  RPC_SetTarget: [{ type: "zdo", desc: "target zdo" }],
  RPC_RequestDenied: [],
  RPC_ClearCachedSupport: [],
  RPC_HealthChanged: [{ type: "float", desc: "health amount" }],
  RPC_Remove: [],
  RPC_Repair: [],
  SetTrigger: [{ type: "name", desc: "trigger name" }],
};

// ---------- Client RPCs (clientRpc:) ----------
export const CLIENT_RPC_PARAMS: Record<string, RpcParamDoc[]> = {
  ChatMessage: [
    { type: "vec", desc: "text position" },
    { type: "int", desc: "type" },
    { type: "userinfo", desc: "sender name" },
    { type: "string", desc: "message" },
  ],
  RPC_DamageText: [
    { type: "enum_damagetext", desc: "0=Normal through 7=Bonus" },
    { type: "vec", desc: "position" },
    { type: "string", desc: "text" },
    { type: "bool", desc: "self damage" },
  ],
  DestroyZDO: [{ type: "int", desc: "amount of ids" }],
  GlobalKeys: [{ type: "string", desc: "string list (unusable)" }],
  LocationIcons: [{ type: "int", desc: "amount of icons" }],
  Ping: [],
  Pong: [],
  RequestZDO: [{ type: "zdo", desc: "requested zdo" }],
  RemoveGlobalKey: [{ type: "string", desc: "key" }],
  ShowMessage: [
    { type: "enum_message", desc: "1=TopLeft, 2=Center" },
    { type: "string", desc: "message" },
  ],
  SetEvent: [
    { type: "string", desc: "event name" },
    { type: "float", desc: "timer" },
    { type: "vec", desc: "position" },
  ],
  SetGlobalKey: [{ type: "string", desc: "key" }],
  SleepStart: [],
  SleepStop: [],
  SpawnObject: [
    { type: "vec", desc: "position" },
    { type: "quat", desc: "rotation" },
    { type: "hash", desc: "prefab id" },
  ],
  RPC_DiscoverLocationResponse: [
    { type: "string", desc: "pin name" },
    { type: "int", desc: "pin type" },
    { type: "vec", desc: "position" },
    { type: "bool", desc: "open map" },
  ],
  RPC_DiscoverClosestLocation: [
    { type: "string", desc: "location name" },
    { type: "vec", desc: "position" },
    { type: "string", desc: "pin name" },
    { type: "int", desc: "pin type" },
    { type: "bool", desc: "open map" },
    { type: "bool", desc: "discover all" },
  ],
  RPC_SetConnection: [
    { type: "zdo", desc: "source zdo" },
    { type: "zdo", desc: "target zdo" },
  ],
  RPC_TeleportPlayer: [
    { type: "vec", desc: "teleport location" },
    { type: "quat", desc: "rotation" },
    { type: "bool", desc: "distant teleport" },
  ],
};

// These two document a fixed prefix followed by an open-ended "2+" repeat
// (DestroyZDO: zdo ids; LocationIcons: position+name pairs) — anything past
// the fixed prefix is expected, not an "extra parameter".
export const VARIADIC_RPCS = new Set(["DestroyZDO", "LocationIcons"]);

export type RpcIssueKind = "extra" | "not-a-string" | "type-mismatch";

export interface RpcParamIssue {
  /** The numbered key (e.g. "4") the issue is about — used to locate its range in the source. */
  key: string;
  kind: RpcIssueKind;
  message: string;
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
  table: Record<string, RpcParamDoc[]>,
  rpcName: string,
  entry: Record<string, unknown>,
): RpcParamIssue[] {
  const doc = table[rpcName];
  if (!doc) return [];
  const variadic = VARIADIC_RPCS.has(rpcName);
  const issues: RpcParamIssue[] = [];

  for (const key of Object.keys(entry)) {
    if (!/^[1-9][0-9]*$/.test(key)) continue; // only numbered call parameters, not name/target/delay/etc.
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
    if (declaredType !== "" && declaredType.toLowerCase() !== docParam.type.toLowerCase()) {
      issues.push({
        key,
        kind: "type-mismatch",
        message: `RPC '${rpcName}' parameter '${key}' is declared as '${declaredType}', but the documented type is '${docParam.type}' (${docParam.desc}).`,
      });
    }
  }

  return issues;
}
