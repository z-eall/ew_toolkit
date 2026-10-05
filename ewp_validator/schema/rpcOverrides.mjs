/** Hand-maintained RPC table overrides — see validation-maintenance research 01. */

/** Same name, incompatible arity or types across components — never validate. */
export const OMIT_RPCS = new Set([
  "RPC_AddItem", // CookingStation: string name; Fermenter: hash name (docs, 2026-10-03)
  "RPC_Damage", // MineRock5: hit + part index; every other component: hit only (docs, 2026-10-03)
  "RPC_DestroyAttachment",
  "RPC_DropItem",
  "RPC_Extract",
]);

/** Docs show `...` after a fixed prefix; table stores prefix only. */
export const VARIADIC_RPCS = new Set(["DestroyZDO", "LocationIcons"]);

export const RPCS_MD_URL =
  "https://raw.githubusercontent.com/JereKuusela/valheim-expand_world_prefabs/main/docs/RPCs.md";

/** Minimum unique RPC names parsed from doc before we trust the fetch. */
export const MIN_RPC_NAME_COUNT = 130;
