# Doc-example schema hook, injectData/triggerRules corrections

Type: task
Status: resolved
Blocked by: none

## Question

Maintainer flagged two real EWP mechanics missing from the wiki: `injectData:`'s real respawn-vs-inject-in-place behavior, and `data:` entries needing `triggerRules: true` to fire another rule's `type: change` (not documented in EWP's own `scripting.md`, which only mentions `spawn:`/`remove:`). Source-verify both, then add them to the wiki. Separately, after an agent-written `type: change` example shipped with a missing `prefab:` line, maintainer asked: since we already hook to `ewp_validator`, shouldn't that hook catch shape mistakes like this in general, not just the one bug that slipped through?

## Answer

Source-verified both mechanics directly against EWP's C# (`PrefabManager.cs` lines 105-160, `PrefabData.cs`'s `TriggerRules`/`InjectData` fields) — `scripting.md`'s prose is incomplete on `triggerRules:` (doesn't mention `data:` at all), the C# is the real ground truth. Added a `triggerRules:` section to `advanced-triggers-change.mdx` (with a caution noting the docs gap), a beginner-tone `injectData:` blurb to `basic-data.mdx` (corrected once by the maintainer — `false` is for changes that need to visibly rebuild, like a monster's star, not the default-safe option I first wrote), and registered both C# files in `docs/sources.md`.

Added a new hook, `guard-doc-example-schema.cjs` (registered in `.claude/settings.json`, shared fence-extraction logic factored into `lib/yaml-fences.cjs` alongside the existing field-order hook): runs every `\`\`\`yaml` fence in an edited `.md`/`.mdx` through `ewp_validator`'s own prebuilt CLI (`ewp_validator/dist/cli.mjs`) — the same schema/RPC/shape-arbitration pipeline the browser app uses, not a narrow prefab-only check. Deliberately does **not** wire in cross-file reference validation (undefined `data:` references, unmatched saved-key read/write pairs) — that check needs the whole loaded script pack as context, and a single isolated doc snippet would false-positive on almost every reference. Also does not and cannot catch semantic/mechanic mistakes (valid-but-wrong-behavior, like the `triggerRules:` gap itself) — only real shape/schema mistakes. Tested live against a deliberately broken example (missing `prefab:`) and a fixed one — flags the former, silent on the latter.

Uses the already-built `dist/cli.mjs` rather than rebuilding per edit, since a rebuild calls out to the network (`schema/generate.mjs` re-stamps the EWP version) and would slow down every markdown edit in the repo; if the CLI isn't built, the hook silently skips rather than blocking.
