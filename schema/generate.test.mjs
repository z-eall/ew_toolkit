// Tests buildSchema directly (no network call — see generate.mjs's import guard).
import { describe, expect, it } from "vitest";
import { buildSchema } from "./generate.mjs";

const schema = buildSchema({ ewpVersion: "1.58.0", generatedAt: "2026-08-17T00:00:00.000Z", source: "test" });
const { ewpRuleEntry, wecDataEntry, valueEntry, valueGroup, spawnData, objectData, pokeData, terrainData } =
  schema.definitions;

describe("buildSchema", () => {
  it("stamps the given meta through unchanged", () => {
    expect(schema._meta).toEqual({
      ewpVersion: "1.58.0",
      generatedAt: "2026-08-17T00:00:00.000Z",
      source: "test",
    });
  });

  it("defines all four discriminator-less-array branches plus the nested shapes", () => {
    expect(Object.keys(schema.definitions).sort()).toEqual(
      ["ewpRuleEntry", "objectData", "pokeData", "spawnData", "terrainData", "valueEntry", "valueGroup", "wecDataEntry"].sort(),
    );
  });

  it("keeps oneOf as the acceptance mechanism over the four entry shapes, ticket 10", () => {
    expect(schema.type).toBe("array");
    expect(schema.items.oneOf.map((r) => r.$ref)).toEqual([
      "#/definitions/ewpRuleEntry",
      "#/definitions/wecDataEntry",
      "#/definitions/valueEntry",
      "#/definitions/valueGroup",
    ]);
  });
});

describe("ewpRuleEntry", () => {
  it("rejects unknown properties, so a typo'd key is catchable", () => {
    expect(ewpRuleEntry.additionalProperties).toBe(false);
  });

  it("has the 13 documented type enum values as a prefix match, not just a bare enum (compact 'type, param' form)", () => {
    const typeSchema = ewpRuleEntry.properties.type;
    for (const value of ["create", "destroy", "change", "state", "say", "command", "poke", "globalkey", "key", "custom", "event", "time", "realtime"]) {
      expect(new RegExp(typeSchema.pattern).test(value)).toBe(true);
      expect(new RegExp(typeSchema.pattern).test(`${value}, someParam`)).toBe(true);
    }
    expect(new RegExp(typeSchema.pattern).test("nonsense")).toBe(false);
  });

  it("accepts filter/bannedFilter singular alongside filters/bannedFilters plural (ticket 08)", () => {
    expect(ewpRuleEntry.properties.filter).toEqual({ type: "string" });
    expect(ewpRuleEntry.properties.bannedFilter).toEqual({ type: "string" });
    expect(ewpRuleEntry.properties.filters).toEqual({ type: "array", items: { type: "string" } });
    expect(ewpRuleEntry.properties.bannedFilters).toEqual({ type: "array", items: { type: "string" } });
  });

  it("types chance/day/admin as native-type-or-string, not a narrow function pattern (ticket 09)", () => {
    expect(ewpRuleEntry.properties.chance).toEqual({ anyOf: [{ type: "number" }, { type: "string" }] });
    expect(ewpRuleEntry.properties.day).toEqual({ anyOf: [{ type: "boolean" }, { type: "string" }] });
    expect(ewpRuleEntry.properties.admin).toEqual({ anyOf: [{ type: "boolean" }, { type: "string" }] });
  });

  it("scopes the top-level paint enum separately from terrain's paint enum (ticket 08)", () => {
    const topPaint = ewpRuleEntry.properties.paint.anyOf[0].enum;
    expect(topPaint).toContain("cultivated");
    expect(topPaint).not.toContain("Reset");
    const terrainPaint = terrainData.properties.paint.anyOf[0].enum;
    expect(terrainPaint).toContain("Reset");
    expect(terrainPaint).not.toContain("cultivated");
  });

  it("includes fields confirmed only in live source, missed by docs (ticket 02: separate, terrainHeight)", () => {
    expect(ewpRuleEntry.properties.separate).toBeDefined();
    expect(ewpRuleEntry.properties.terrainHeight).toBeDefined();
  });

  it("lets objectRpc/clientRpc items carry arbitrary string keys, since C# types them as an open Dictionary<string,string>", () => {
    const rpcItem = ewpRuleEntry.properties.objectRpc.items;
    expect(rpcItem.additionalProperties).toEqual({ type: "string" });
    expect(rpcItem.properties.name).toBeDefined();
  });

  it("lets objects/bannedObjects items be either a nested object or a legacy single-line string", () => {
    const itemSchema = ewpRuleEntry.properties.objects.items;
    expect(itemSchema.oneOf).toBeDefined();
    expect(itemSchema.oneOf.some((s) => s.type === "string")).toBe(true);
    expect(itemSchema.oneOf.some((s) => s.type === "object")).toBe(true);
  });
});

describe("wecDataEntry", () => {
  it("requires name and does not accept data as a property (ticket 07)", () => {
    expect(wecDataEntry.required).toEqual(["name"]);
    expect(wecDataEntry.properties.data).toBeUndefined();
    expect(wecDataEntry.additionalProperties).toBe(false);
  });

  it("has the documented typed-value-list properties", () => {
    for (const key of ["ints", "floats", "strings", "longs", "vecs", "quats", "bytes", "bools", "hashes"]) {
      expect(wecDataEntry.properties[key]).toEqual({ type: "array", items: { type: "string" } });
    }
  });
});

describe("valueEntry and valueGroup", () => {
  it("requires value on a value entry", () => {
    expect(valueEntry.required).toEqual(["value"]);
  });
  it("requires valueGroup and values on a value group", () => {
    expect(valueGroup.required).toEqual(["valueGroup", "values"]);
  });
});

describe("object/poke filter fields (ticket 08)", () => {
  it("gives objectData and pokeData the same filter/bannedFilter singular+plural fields as top level", () => {
    for (const shape of [objectData, pokeData]) {
      expect(shape.properties.filter).toEqual({ type: "string" });
      expect(shape.properties.filters).toEqual({ type: "array", items: { type: "string" } });
    }
  });

  it("has pokeData extend objectData's fields plus its own poke-only fields", () => {
    expect(pokeData.properties.prefab).toBeDefined(); // inherited from objectData
    expect(pokeData.properties.target).toBeDefined(); // poke-only
    expect(objectData.properties.target).toBeUndefined();
  });
});
