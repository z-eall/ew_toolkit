// Generates src/schema.generated.json — a JSON Schema for EWP/WEC script YAML.
//
// This is a STATIC schema: the field list, enums, and typing rules below are
// hand-encoded from Jere Kuusela's EWP source (ExpandWorldPrefabs/PrefabData.cs)
// and docs (docs/scripting.md), reconciled per the decisions in
// .scratch/ewp-toolkit/issues/02, 06, 07, 08, 09, 10. On each scheduled run this
// script only re-fetches EWP's publish/manifest.json to stamp the *current*
// EWP version into the output — it does not re-derive the field list from
// live source. If Jere adds a genuinely new field, it won't appear here until
// a human updates this file (a deliberate robustness-over-freshness tradeoff,
// decided at build time — see the scaffold session's handoff notes).
//
// Run: node schema/generate.mjs  (writes ../src/schema.generated.json)

import { writeFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.join(__dirname, "..", "src", "schema.generated.json");
const MANIFEST_URL =
  "https://raw.githubusercontent.com/JereKuusela/valheim-expand_world_prefabs/main/publish/manifest.json";

// ---------- Shared field-kind builders (ticket 09's typing policy) ----------

// Enum fields (type, paint, ...): validate strictly against the known list —
// this is where a typo is exactly what the tool should catch.
const enumStrict = (values) => ({ enum: values });

// Bool/number-with-alt-syntax fields (chance, admin, day, ...): accept the
// native type OR an unconstrained string, never a narrow function-only regex —
// these fields support comma-lists, min;max ranges, and <function> calls that
// haven't been fully catalogued, and a too-narrow pattern risks false positives.
const boolOrString = { anyOf: [{ type: "boolean" }, { type: "string" }] };
const numberOrString = { anyOf: [{ type: "number" }, { type: "string" }] };

const str = { type: "string" };
const strArray = { type: "array", items: { type: "string" } };

// filter/bannedFilter singular forms are real (live-tested, not a typo — see
// ticket 08) even though the current C# source only declares the plural
// filters/bannedFilters array fields. Singular = one value, plural = array of
// the same value type, same underlying property.
function withFilterFields(properties) {
  return {
    ...properties,
    filter: str,
    filters: strArray,
    bannedFilter: str,
    bannedFilters: strArray,
    filterLimit: numberOrString,
  };
}

// EWP's own type enum (docs/scripting.md, "type:" section) — 13 values.
const TYPE_ENUM = [
  "create",
  "destroy",
  "change",
  "state",
  "say",
  "command",
  "poke",
  "globalkey",
  "key",
  "custom",
  "event",
  "time",
  "realtime",
];
// `type` (and each item of `types`) is documented as `"type, param1 param2"` —
// the enum word optionally followed by trigger parameters after a comma.
const typeValue = {
  type: "string",
  pattern: `^(${TYPE_ENUM.join("|")})(\\s*,.*)?$`,
};

// Two unrelated paint enums share the field name "paint" in different
// locations — scoped per-location, not shared (ticket 08).
const TOP_LEVEL_PAINT_ENUM = [
  "cultivated",
  "dirt",
  "grass",
  "grass_dark",
  "patches",
  "paved",
  "paved_dark",
  "paved_dirt",
  "paved_moss",
];
// paint/minPaint/maxPaint also accept a numeric r,g,b,a value (docs/scripting.md).
const topLevelPaintValue = {
  anyOf: [{ enum: TOP_LEVEL_PAINT_ENUM }, { type: "string" }],
};
// Not a bare enum despite ticket 09's "enum fields validate strictly" policy:
// Terrain.Get's paint parsing (PrefabData.cs) is Enum.TryParse(name) ->
// int.TryParse(numeric) -> default Reset, so a numeric string is also valid,
// same escape hatch as the top-level paint fields just below.
const TERRAIN_PAINT_ENUM = ["ClearVegetation", "Cultivate", "Dirt", "Paved", "Reset"];
const terrainPaintValue = {
  anyOf: [{ enum: TERRAIN_PAINT_ENUM }, { type: "string" }],
};

// objectRpc/clientRpc items are a true open Dictionary<string,string> in C#
// (PrefabData.cs) — not a fixed class. Known keys are documented, but any
// other key (including positional "1","2","3",... for call parameters) is
// legitimate, so this must stay open rather than additionalProperties:false.
const rpcEntry = {
  type: "object",
  properties: {
    name: str,
    target: str,
    chance: numberOrString,
    weight: numberOrString,
    delay: numberOrString,
    repeat: numberOrString,
    repeatInterval: numberOrString,
    repeatChance: numberOrString,
    overwrite: boolOrString,
    source: str,
    packaged: boolOrString,
  },
  additionalProperties: { type: "string" },
};

// ---------- Nested shapes (PrefabData.cs: SpawnData, ObjectData, PokeData, TerrainData) ----------

const spawnData = {
  title: "Spawn/swap entry",
  type: "object",
  properties: {
    prefab: str,
    snap: boolOrString,
    pos: str,
    position: str,
    rot: str,
    rotation: str,
    data: str,
    delay: numberOrString,
    removeDelay: numberOrString,
    repeat: numberOrString,
    repeatInterval: numberOrString,
    repeatChance: numberOrString,
    chance: numberOrString,
    weight: numberOrString,
    owner: numberOrString,
    attach: str,
    connect: str,
    triggerRules: boolOrString,
    condition: str,
  },
  additionalProperties: false,
};

const objectDataBaseProperties = withFilterFields({
  prefab: str,
  maxDistance: numberOrString,
  minDistance: numberOrString,
  maxHeight: numberOrString,
  minHeight: numberOrString,
  position: str,
  offset: str,
  data: str,
  weight: numberOrString,
  self: boolOrString,
  condition: str,
});

const objectData = {
  title: "Object filter entry",
  type: "object",
  properties: objectDataBaseProperties,
  additionalProperties: false,
};

// PokeData extends ObjectData in C#.
const pokeData = {
  title: "Poke entry",
  type: "object",
  properties: {
    ...objectDataBaseProperties,
    delay: numberOrString,
    repeat: numberOrString,
    repeatInterval: numberOrString,
    repeatChance: numberOrString,
    chance: numberOrString,
    connected: boolOrString,
    target: str,
    parameter: str,
    pars: str,
    limit: numberOrString,
    random: boolOrString,
    evaluate: boolOrString,
  },
  additionalProperties: false,
};

const terrainData = {
  title: "Terrain entry",
  type: "object",
  properties: {
    delay: numberOrString,
    pos: str,
    position: str,
    square: boolOrString,
    resetRadius: numberOrString,
    levelRadius: numberOrString,
    levelOffset: numberOrString,
    raiseRadius: numberOrString,
    raisePower: numberOrString,
    raiseDelta: numberOrString,
    smoothRadius: numberOrString,
    smoothPower: numberOrString,
    paintRadius: numberOrString,
    paintHeightCheck: boolOrString,
    paint: terrainPaintValue,
  },
  additionalProperties: false,
};

// objects/bannedObjects array items accept either a nested ObjectData object
// or a legacy single-line string (Object(string line) constructor in
// PrefabData.cs) — a true per-item dual-format union.
const objectOrLegacyString = { oneOf: [objectData, { type: "string" }] };

// ---------- EWP rule entry (PrefabData.cs: Data class, ~70 fields) ----------
// Grouped to mirror docs/scripting.md's own section headers.

const ewpRuleEntry = {
  title: "EWP rule entry",
  type: "object",
  properties: withFilterFields({
    // Identity/trigger
    prefab: str,
    excludePrefab: str,
    type: typeValue,
    types: { type: "array", items: typeValue },

    // Selection
    chance: numberOrString,
    weight: numberOrString,
    fallback: boolOrString,
    separate: boolOrString,

    // Scalar filters
    admin: boolOrString,
    day: boolOrString,
    night: boolOrString,
    biomes: str,
    bannedBiomes: str,
    minDistance: numberOrString,
    maxDistance: numberOrString,
    minAltitude: numberOrString,
    maxAltitude: numberOrString,
    minY: numberOrString,
    maxY: numberOrString,
    minX: numberOrString,
    maxX: numberOrString,
    minZ: numberOrString,
    maxZ: numberOrString,
    minPaint: topLevelPaintValue,
    maxPaint: topLevelPaintValue,
    paint: topLevelPaintValue,
    minTerrainHeight: numberOrString,
    maxTerrainHeight: numberOrString,
    terrainHeight: numberOrString,
    environments: str,
    bannedEnvironments: str,
    globalKeys: str,
    bannedGlobalKeys: str,
    keys: str,
    bannedKeys: str,
    events: str,
    eventDistance: numberOrString,
    locations: str,
    locationDistance: numberOrString,
    bannedLocations: str,
    bannedLocationDistance: numberOrString,
    playerEvents: str,
    bannedPlayerEvents: str,
    groups: str,
    bannedGroups: str,

    // Object filters
    objects: { type: "array", items: objectOrLegacyString },
    bannedObjects: { type: "array", items: objectOrLegacyString },
    objectsLimit: numberOrString,
    bannedObjectsLimit: numberOrString,

    // Actions
    data: str,
    injectData: boolOrString,
    drops: boolOrString,
    addItems: str,
    removeItems: str,
    remove: boolOrString,
    removeDelay: numberOrString,
    command: str,
    commands: strArray,
    exec: str,
    owner: numberOrString,
    attach: str,
    connect: str,
    cancel: boolOrString,
    triggerRules: boolOrString,

    // Spawns
    spawn: { type: "array", items: spawnData },
    swap: { type: "array", items: spawnData },
    spawns: strArray,
    swaps: strArray,
    spawnDelay: numberOrString,

    // Pokes
    poke: { type: "array", items: pokeData },
    pokes: strArray,
    pokeLimit: numberOrString,
    pokeParameter: str,
    pokeDelay: numberOrString,

    // RPCs
    objectRpc: { type: "array", items: rpcEntry },
    clientRpc: { type: "array", items: rpcEntry },

    // Terrain
    terrain: { type: "array", items: terrainData },

    // Condition
    condition: str,
  }),
  additionalProperties: false,
};

// ---------- WEC shapes (README_data.md; entry-key resolved by ticket 07) ----------

const itemEntry = {
  type: "object",
  properties: {
    pos: str,
    chance: numberOrString,
    prefab: str,
    stack: numberOrString,
    quality: numberOrString,
    variant: numberOrString,
    durability: numberOrString,
    crafterID: numberOrString,
    crafterName: str,
    worldLevel: numberOrString,
    equipped: boolOrString,
    pickedUp: boolOrString,
    customData: str,
  },
  additionalProperties: false,
};

// name: is the only valid entry-name key — data: in this position is a
// confirmed doc typo in WEC's own README, not a real alias (ticket 07).
// Deliberately not listing "data" as an accepted property here: a `data:`-
// keyed entry should fail this schema so the structural pre-check (which
// still recognizes it via its typed-list siblings) can surface a targeted
// "did you mean name:" hint instead of a generic unknown-property error.
const wecDataEntry = {
  title: "WEC data entry",
  type: "object",
  properties: {
    name: str,
    ints: strArray,
    floats: strArray,
    strings: strArray,
    longs: strArray,
    vecs: strArray,
    quats: strArray,
    bytes: strArray,
    bools: strArray,
    hashes: strArray,
    items: { type: "array", items: itemEntry },
    containerSize: str,
    itemAmount: numberOrString,
  },
  required: ["name"],
  additionalProperties: false,
};

const valueEntry = {
  title: "Value entry",
  type: "object",
  properties: { value: str },
  required: ["value"],
  additionalProperties: false,
};

const valueGroup = {
  title: "Value group",
  type: "object",
  properties: { valueGroup: str, values: strArray },
  required: ["valueGroup", "values"],
  additionalProperties: false,
};

// ---------- Assemble ----------

export function buildSchema(meta) {
  return {
    $schema: "http://json-schema.org/draft-07/schema#",
    _meta: meta,
    definitions: {
      ewpRuleEntry,
      wecDataEntry,
      valueEntry,
      valueGroup,
      spawnData,
      objectData,
      pokeData,
      terrainData,
    },
    // The discriminator-less array (ticket 02/10): EWP rule entries, WEC data
    // entries, value entries, and value groups are legally mixed in one list
    // with no tag field. oneOf here is the *acceptance* mechanism only — the
    // app's structural pre-check (ticket 10), not this union, is what
    // produces user-facing errors.
    type: "array",
    items: {
      oneOf: [
        { $ref: "#/definitions/ewpRuleEntry" },
        { $ref: "#/definitions/wecDataEntry" },
        { $ref: "#/definitions/valueEntry" },
        { $ref: "#/definitions/valueGroup" },
      ],
    },
  };
}

async function fetchEwpVersion() {
  try {
    const res = await fetch(MANIFEST_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const manifest = await res.json();
    return manifest.version_number ?? null;
  } catch (err) {
    console.warn(`generate.mjs: couldn't fetch EWP version (${err.message}); continuing without it.`);
    return null;
  }
}

// Guarded so tests can `import { buildSchema } from './generate.mjs'` without
// triggering a network fetch and file write as a side effect of the import —
// this block only runs when the file is executed directly (`node generate.mjs`).
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const ewpVersion = await fetchEwpVersion();
  const schema = buildSchema({
    ewpVersion,
    generatedAt: new Date().toISOString(),
    source: "https://github.com/JereKuusela/valheim-expand_world_prefabs",
  });

  await writeFile(OUT_PATH, JSON.stringify(schema, null, 2) + "\n", "utf-8");
  console.log(`generate.mjs: wrote ${OUT_PATH}${ewpVersion ? ` (EWP ${ewpVersion})` : ""}`);
}
