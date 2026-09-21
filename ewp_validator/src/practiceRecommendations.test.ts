import { describe, expect, it } from "vitest";
import { PRACTICE_GROUPS, practiceMessages } from "./practiceRecommendations";

// One sample per catalog entry. A new entry must be added here, so the wording
// rules below cover it (ewp_validator/AGENTS.md rule 6).
const SAMPLES: Record<keyof typeof practiceMessages, string[]> = {
  legacyDelay: [practiceMessages.legacyDelay()],
  legacySpawn: [practiceMessages.legacySpawn("spawn")],
  legacyFilename: [practiceMessages.legacyFilename("data_x.yaml")],
  legacyDataAlias: [practiceMessages.legacyDataAlias("poke")],
  filterAsList: [practiceMessages.filterAsList("filter", "filters", "objects")],
  dataIgnored: [
    practiceMessages.dataIgnored("poke", "filter", "filters", false),
    practiceMessages.dataIgnored("objects", "filters", "filters", false),
    practiceMessages.dataIgnored("objects", "bannedFilter", "bannedFilters", true),
    practiceMessages.dataIgnored("objects", "filters", "filters", false, true),
    practiceMessages.dataIgnored("objects", "filter", "filters", false, true),
  ],
  conditionOperator: [practiceMessages.conditionOperator("=="), practiceMessages.conditionOperator("<>")],
  changeNeedsTriggerRules: [practiceMessages.changeNeedsTriggerRules("level")],
  pokeWorldCentre: [practiceMessages.pokeWorldCentre()],
  filterWeightPart: [practiceMessages.filterWeightPart("int, level, 2,3")],
  keyStoreMix: [practiceMessages.keyStoreMix("raidRank", "globalkey"), practiceMessages.keyStoreMix("raidRank", "globalKeys"), practiceMessages.keyStoreMix("raidRank", "key")],
  terrainPaintName: [practiceMessages.terrainPaintName("Dirtt")],
  ownerDropped: [practiceMessages.ownerDropped()],
  iterOperation: [practiceMessages.iterOperation("ad")],
  filterBothForms: [practiceMessages.filterBothForms("filter", "filters", "poke"), practiceMessages.filterBothForms("filter", "filters", null)],
};

describe("practice recommendation catalog wording", () => {
  it("has a sample for every catalog entry", () => {
    expect(Object.keys(SAMPLES).sort()).toEqual(Object.keys(practiceMessages).sort());
  });

  const all = Object.entries(SAMPLES).flatMap(([id, msgs]) => msgs.map((m) => [id, m] as const));

  it.each(all)("%s starts with a known group lead-in", (_id, msg) => {
    expect(PRACTICE_GROUPS.some((g) => msg.startsWith(`${g}: `))).toBe(true);
  });
  it.each(all)("%s avoids the word 'set' and menu-style '(or ...)'", (_id, msg) => {
    expect(msg).not.toMatch(/\bset\b/i);
    expect(msg).not.toMatch(/\(or\b/i);
  });
  it.each(all)("%s stays short (under 200 characters)", (_id, msg) => {
    expect(msg.length).toBeLessThan(200);
  });
  it.each(all)("%s has no emoji or pictograph", (_id, msg) => {
    expect(msg).not.toMatch(/\p{Extended_Pictographic}/u);
  });
  it.each(all)("%s never calls the input an error or invalid", (_id, msg) => {
    expect(msg).not.toMatch(/\b(invalid|error|wrong)\b/i);
  });
});
