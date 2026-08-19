import { describe, expect, it } from "vitest";
import { parseParamLine, parseRpcsMarkdown } from "./parse-rpcs.mjs";
import { OMIT_RPCS } from "./rpcOverrides.mjs";

describe("parseParamLine", () => {
  it("normalizes string list to string type", () => {
    expect(parseParamLine('string list, "unusable"')).toEqual({
      type: "string",
      desc: "unusable",
    });
  });

  it("preserves name type prefix", () => {
    expect(parseParamLine('name, "owner name"')).toEqual({ type: "name", desc: "owner name" });
  });
});

describe("parseRpcsMarkdown", () => {
  it("parses a minimal objectRpc fence with CRLF line endings", () => {
    const md = [
      "## Object RPCs",
      "",
      "```yaml",
      "  objectRpc:",
      "  - name: RPC_SetVisualItem",
      '    1: int, "index of the item slot"',
      '    2: string, "name of the item"',
      '    3: int, "variant number of the item"',
      '    4: int, "orientation of the item (0 = none, 1 = vertical, 2 = horizontal, 3 = all)"',
      "```",
      "",
      "## Client rpcs",
      "",
      "```yaml",
      "  clientRpc:",
      "  - name: Ping",
      "```",
    ].join("\r\n");

    const { objectRpcParams, clientRpcParams } = parseRpcsMarkdown(md, { minCount: 1 });
    expect(objectRpcParams.RPC_SetVisualItem.map((p) => p.type)).toEqual(["int", "string", "int", "int"]);
    expect(clientRpcParams.Ping).toEqual([]);
  });

  it("merges orphan - N: param line after empty name entry", () => {
    const md = [
      "## Object RPCs",
      "",
      "```yaml",
      "  objectRpc:",
      "  - name: RPC_AddFuelAmount",
      '  - 1: float, "amount of fuel"',
      "```",
      "",
      "## Client rpcs",
      "",
      "```yaml",
      "  clientRpc:",
      "  - name: Ping",
      "```",
    ].join("\n");

    const { objectRpcParams } = parseRpcsMarkdown(md, { minCount: 1 });
    expect(objectRpcParams.RPC_AddFuelAmount).toEqual([{ type: "float", desc: "amount of fuel" }]);
  });

  it("omits ambiguous RPC names from object table output", () => {
    expect(OMIT_RPCS.has("RPC_Extract")).toBe(true);
  });
});
