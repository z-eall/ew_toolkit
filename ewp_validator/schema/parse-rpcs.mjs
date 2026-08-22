// Build-time parser for EWP docs/RPCs.md → OBJECT_RPC_PARAMS / CLIENT_RPC_PARAMS.
// Spec: .scratch/validation-maintenance/research/01-rpcs-md-parser-edge-cases.md

import { MIN_RPC_NAME_COUNT, OMIT_RPCS, VARIADIC_RPCS } from "./rpcOverrides.mjs";

const KNOWN_TYPES = new Set([
  "bool",
  "bytes",
  "float",
  "hash",
  "hit",
  "int",
  "long",
  "name",
  "quat",
  "string",
  "string list",
  "userinfo",
  "vec",
  "zdo",
]);

function isKnownType(type) {
  if (KNOWN_TYPES.has(type)) return true;
  if (type.startsWith("enum_")) return true;
  return false;
}

function signatureOf(params) {
  return params.map((p) => p.type).join(",");
}

/** Split on first comma; strip optional quotes from description tail. */
export function parseParamLine(raw) {
  const enumComment = raw.match(/#\s*-\s*(\w+),\s*(.+)$/);
  const noHash = raw.split("#")[0].trim();
  const comma = noHash.indexOf(",");
  let type = (comma === -1 ? noHash : noHash.slice(0, comma)).trim();
  let desc =
    comma === -1
      ? ""
      : noHash
          .slice(comma + 1)
          .trim()
          .replace(/^"(.*)"$/, "$1");

  if (enumComment && type.startsWith("enum_")) {
    const suffix = enumComment[2].trim();
    const slashParts = suffix.split("/").filter(Boolean);
    if (slashParts.length > 1 && /^\d/.test(slashParts[0])) {
      desc = slashParts.map((part, i) => `${i}=${part}`).join(", ");
    } else if (slashParts.length > 1) {
      desc = slashParts.map((label, i) => `${i + 1}=${label}`).join(", ");
    } else {
      desc = suffix;
    }
  } else if (type === "int" && raw.includes("#")) {
    const hashPart = raw.split("#")[1]?.trim() ?? "";
    if (hashPart && !desc) desc = hashPart;
  }

  if (type === "string list") {
    const unusable = /unusable/i.test(raw);
    return {
      type: "string",
      desc: unusable || desc.includes("string list") ? desc || "string list (unusable)" : `${desc} (string list)`,
    };
  }

  if (!isKnownType(type)) {
    throw new Error(`parse-rpcs: unknown type '${type}' in param line: ${raw}`);
  }

  return { type, desc };
}

function parseFenceBlock(fenceText, warnings) {
  const lines = fenceText.replace(/\r\n/g, "\n").split("\n");
  const kindLine = lines.find((l) => /^\s*(objectRpc|clientRpc):\s*$/.test(l));
  if (!kindLine) return null;
  const kind = /objectRpc/.test(kindLine) ? "object" : "client";

  const entries = [];
  let i = 0;
  while (i < lines.length) {
    const nameMatch = lines[i].match(/^(\s*)-\s*name:\s*(\S+)\s*$/);
    if (!nameMatch) {
      i++;
      continue;
    }
    const listIndent = nameMatch[1].length;
    const rpcName = nameMatch[2];
    const params = [];
    let variadic = false;
    i++;

    while (i < lines.length) {
      const line = lines[i];
      const siblingName = line.match(/^(\s*)-\s*name:\s*\S+/);
      if (siblingName && siblingName[1].length === listIndent) break;

      const orphan = line.match(/^(\s*)-\s*(\d+):\s*(.+)$/);
      if (orphan && orphan[1].length === listIndent) {
        if (params.length === 0) {
          params.push(parseParamLine(orphan[3]));
          warnings.push(`parse-rpcs: merged orphan param into ${rpcName}`);
          i++;
          continue;
        }
        throw new Error(`parse-rpcs: orphan param line in ${rpcName} block: ${line.trim()}`);
      }

      const numbered = line.match(/^\s+(\d+):\s*(.+)$/);
      if (numbered) {
        params.push(parseParamLine(numbered[2]));
        i++;
        continue;
      }

      if (/^\s*\.\.\.\s*$/.test(line)) {
        variadic = true;
        i++;
        break;
      }

      if (/^\s*#/.test(line) || /^\s*(objectRpc|clientRpc):\s*$/.test(line)) {
        i++;
        continue;
      }

      if (/^\s*[a-zA-Z_]\w*:\s*/.test(line)) {
        i++;
        continue;
      }

      if (line.trim() === "") {
        i++;
        continue;
      }

      i++;
    }

    if (variadic) {
      if (!VARIADIC_RPCS.has(rpcName)) {
        throw new Error(`parse-rpcs: unexpected variadic marker on ${rpcName}`);
      }
      const prefixLen = rpcName === "DestroyZDO" || rpcName === "LocationIcons" ? 1 : params.length;
      entries.push({ kind, name: rpcName, params: params.slice(0, prefixLen) });
    } else {
      entries.push({ kind, name: rpcName, params });
    }
  }

  return entries;
}

function registerRpc(maps, entry, warnings) {
  const map = entry.kind === "object" ? maps.object : maps.client;
  const sig = signatureOf(entry.params);
  const existing = map.get(entry.name);
  if (!existing) {
    map.set(entry.name, entry.params);
    return;
  }
  if (signatureOf(existing) === sig) return;
  if (OMIT_RPCS.has(entry.name)) {
    return;
  }
  throw new Error(
    `parse-rpcs: ambiguous RPC ${entry.name}: [${signatureOf(existing)}] vs [${sig}]`,
  );
}

/**
 * @param {string} markdown
 * @returns {{ objectRpcParams: Record<string, {type:string,desc:string}[]>, clientRpcParams: Record<string, {type:string,desc:string}[]> }}
 */
export function parseRpcsMarkdown(markdown, { minCount = MIN_RPC_NAME_COUNT } = {}) {
  const text = markdown.replace(/\r\n/g, "\n");
  if (!/^## Object RPCs$/m.test(text)) {
    throw new Error("parse-rpcs: section anchor not found: ## Object RPCs");
  }
  if (!/^## Client rpcs$/m.test(text)) {
    throw new Error("parse-rpcs: section anchor not found: ## Client rpcs");
  }

  const warnings = [];
  const maps = { object: new Map(), client: new Map() };
  const fenceRe = /```yaml\r?\n([\s\S]*?)```/g;
  let match;
  let blockCount = 0;

  while ((match = fenceRe.exec(text)) !== null) {
    const parsed = parseFenceBlock(match[1], warnings);
    if (!parsed) continue;
    blockCount++;
    for (const entry of parsed) {
      for (let j = 0; j < entry.params.length; j++) {
        // params are collected in order 1..N — gaps would mean parser bug
      }
      registerRpc(maps, entry, warnings);
    }
  }

  if (blockCount === 0) {
    throw new Error("parse-rpcs: no RPC blocks parsed");
  }

  const allNames = new Set([...maps.object.keys(), ...maps.client.keys()]);
  if (allNames.size < minCount) {
    throw new Error(`parse-rpcs: suspiciously few RPCs (got ${allNames.size}, expected ~134)`);
  }

  for (const name of OMIT_RPCS) {
    maps.object.delete(name);
  }

  for (const w of warnings) console.warn(w);

  const objectRpcParams = Object.fromEntries([...maps.object.entries()].sort(([a], [b]) => a.localeCompare(b)));
  const clientRpcParams = Object.fromEntries([...maps.client.entries()].sort(([a], [b]) => a.localeCompare(b)));

  return { objectRpcParams, clientRpcParams };
}

export function emitRpcParamsTs({ objectRpcParams, clientRpcParams, sourceUrl }) {
  const header = `// Generated by schema/parse-rpcs.mjs — do not edit.
// Source: ${sourceUrl}

`;
  return (
    header +
    `export const OBJECT_RPC_PARAMS: Record<string, { type: string; desc: string }[]> = ${JSON.stringify(objectRpcParams, null, 2)};\n\n` +
    `export const CLIENT_RPC_PARAMS: Record<string, { type: string; desc: string }[]> = ${JSON.stringify(clientRpcParams, null, 2)};\n`
  );
}

export async function fetchAndParseRpcs(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`parse-rpcs: fetch failed HTTP ${res.status}`);
  const markdown = await res.text();
  return parseRpcsMarkdown(markdown);
}
