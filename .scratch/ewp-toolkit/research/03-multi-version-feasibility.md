# Can EWP schema generation support multiple mod versions?

Research for issue `03-multi-version-feasibility.md`. All findings below are sourced directly from `github.com/JereKuusela/valheim-expand_world_prefabs` (web UI and unauthenticated REST API) — no secondary write-ups used as source of truth.

## 1. Tagged releases / version branches on GitHub

**There are none.**

- Tags API: `https://api.github.com/repos/JereKuusela/valheim-expand_world_prefabs/tags?per_page=100` → empty array `[]`.
- Tags web page: `https://github.com/JereKuusela/valheim-expand_world_prefabs/tags` → "There aren't any releases here" empty state, no tags listed.
- Releases API: `https://api.github.com/repos/JereKuusela/valheim-expand_world_prefabs/releases?per_page=100` → empty array `[]`.
- Releases web page: `https://github.com/JereKuusela/valheim-expand_world_prefabs/releases` → explicitly states "There aren't any releases here."
- Branches API: `https://api.github.com/repos/JereKuusela/valheim-expand_world_prefabs/branches?per_page=100` → exactly one branch, `main`.
- Repo metadata (`https://api.github.com/repos/JereKuusela/valheim-expand_world_prefabs`): `default_branch: main`, `created_at: 2023-09-27`, `pushed_at: 2026-08-16T19:25:01Z`.

Conclusion: Jere does not use GitHub's native versioning primitives at all. Everything lives on a single continuously-updated `main` branch. Any "per-version" mechanism has to be built from commit history, not from tags/releases/branches.

## 2. Is there another version signal in the repo, and does it correspond to GitHub history?

Yes — **`publish/manifest.json`**, a Thunderstore package manifest, is the authoritative version source:

```json
// https://raw.githubusercontent.com/JereKuusela/valheim-expand_world_prefabs/main/publish/manifest.json
{
  "name": "Expand_World_Prefabs",
  "version_number": "1.58.0",
  "website_url": "https://discord.gg/VFRJcPwUdm",
  "description": "Allows creating rules for objects being spawned, destroyed and more.",
  "dependencies": [
    "denikson-BepInExPack_Valheim-5.4.2333",
    "ValheimModding-YamlDotNet-16.3.0"
  ]
}
```

This confirms the ticket's premise that Jere versions via Thunderstore, not GitHub tags — `version_number` here (`1.58.0`) is what actually ships to players, and it lives in a file, not a git ref.

**The C# project file has no version info at all.** `ExpandWorldPrefabs/ExpandWorldPrefabs.csproj` (fetched raw at `main`) contains no `<Version>`, `<AssemblyVersion>`, or `<FileVersion>` elements. `manifest.json` is the only version-of-record in the repo.

**Crucially, this file's own commit history reconstructs a de-facto tag list**, because `version_number` is bumped once per released version. Query: `https://api.github.com/repos/JereKuusela/valheim-expand_world_prefabs/commits?path=publish/manifest.json&per_page=100` (page 2 confirmed empty, so this is the complete history of that file) returns **30 commits**, spanning **2024-12-31 → 2026-08-15**, e.g.:

| sha (short) | message | date |
|---|---|---|
| `352b0996e9` | Release | 2024-12-31 |
| `63cb747e95` | 1.43 release | 2025-07-13 |
| `a2018d7c78` | Release | 2025-09-11 |
| `b8cffe871f` | Release | 2025-11-24 |
| `fb4b168782` | Release + docs | 2026-07-19 |
| `feb16719fc` | Release | 2026-08-15 |

(Full 30-row table available via the same API call; omitted here for brevity.)

Each of these 30 commit SHAs can be resolved to an exact `version_number` via `raw.githubusercontent.com/.../<sha>/publish/manifest.json`, giving a reliable **sha ↔ version** mapping — effectively a hand-rolled tag list, going back to whatever version was current on 2024-12-31 (commit message "Reverts the underscore mess from v1.29-1.31" from a nearby commit, `ba2f665807`, dated 2025-01-05, implies the repo was around v1.29–v1.31 at that point).

**Caveat:** the repo itself dates to 2023-09-27, over a year before `publish/manifest.json`'s earliest commit. Versions before ~v1.29 (pre–Dec 2024) are not resolvable this way — either the Thunderstore manifest didn't exist yet, or version tracking worked differently before then. Practically this doesn't matter much: nobody is scripting against a 2023-era EWP build, and 30 clean, dated versions covering the last ~20 months is more than enough range for a version picker.

## 3. Does the schema actually change meaningfully across that range?

**Yes, substantially.** Compared the current schema doc against the same doc at the oldest resolvable version-bump commit.

- Latest (`main`): schema docs live in `docs/scripting.md`, `docs/functions.md`, `docs/RPCs.md`, `docs/legacy.md`, `docs/hacks.md`, `docs/RPCs_mods.md` (`https://api.github.com/repos/JereKuusela/valheim-expand_world_prefabs/contents/docs`).
- Old (commit `352b0996e94c531515889302751df876bb0e8b2c`, 2024-12-31, ~v1.29–31 era): **no `docs/` folder exists at all.** Root listing at that ref (`.../contents/?ref=352b09...`) shows `README.md`, `RPCs.md`, `examples*.md` at the repo root instead — the doc reorganization into `docs/` happened at some point after Dec 2024. The full schema (trigger types, filters, actions, spawn/poke/RPC fields) at that commit lived directly in `README.md`.

Concrete schema deltas, old (`README.md` @ 2024-12-31) vs. new (`docs/scripting.md` @ latest):

- **Trigger `type` enum changed.** Old: `create, destroy, repair, damage, state, say, command, poke, globalkey, event` (10 values). New: `create, destroy, change, state, say, command, poke, globalkey, key, custom, event, time, realtime` (13 values). `repair` and `damage` are gone from the current enum; `change`, `key`, `custom`, `time`, `realtime` are new.
- **New whole field groups added since then**, per the `docs/CHANGELOG.md` and confirmed present in current `scripting.md` but absent from the old `README.md`: `connect`/`attach` (object linking, added v1.54), `groups`/`bannedGroups`, `keys`/`bannedKeys`, `filterLimit`, `minTerrainHeight`/`maxTerrainHeight`, `minX`/`maxX`/`minZ`/`maxZ` coordinate filters, server-side-only data (`ewp_`-prefixed keys, v1.55), NPC persistence support.
- **Documented breaking changes exist in commit history**, not just additive changes — e.g. commit `a60e9e1f1c` (2025-12-17): *"Breaking change: Changes the parameter `<pid>` to return only the user id instead of the full platform user id"*; changelog entry for v1.54: *"BREAKING CHANGE: Removes basic arithmetic support from data entries. Use parameters instead."* (`https://raw.githubusercontent.com/.../main/publish/CHANGELOG.md`).
- Note: `publish/CHANGELOG.md` is a **rolling log**, currently holding only the 5 most recent versions (v1.54–v1.58) — it is not a full history and can't be used alone to enumerate all past versions. The manifest.json commit history (section 2) is the reliable enumeration mechanism instead.

This answers the "is it even worth it" question: the schema is not static. Over the ~20 months covered by the 30 resolvable versions, trigger types were added/removed, whole feature areas were added, and there were explicit breaking parameter changes. A scripter targeting an older EWP build (common with Thunderstore, since server owners don't always update immediately) would get meaningfully wrong validation against a "latest-only" schema.

## 4. Feasibility and effort assessment

**Mechanism is buildable, but it's not a trivial tag-loop — it requires one extra layer of indirection because there are no tags.**

What it would take:

1. **Version enumeration**: walk the commit history of `publish/manifest.json` via the GitHub API (`/commits?path=publish/manifest.json&per_page=100`, paginate if it ever exceeds 100 — currently doesn't) to get the ~30 commit SHAs, then fetch `manifest.json` at each SHA to read `version_number`. This produces a `version → sha` table. Straightforward scripted, no auth needed beyond normal unauthenticated rate limits (or a `GITHUB_TOKEN` in Actions, which raises the limit to 5,000/hr).
2. **Doc-path resolution across eras**: the schema-generation script (whatever ticket 02 lands on) needs to know that "recent" SHAs have docs at `docs/scripting.md` + `docs/functions.md` + `docs/RPCs.md`, while older SHAs (pre doc-reorg) have the same content flattened into root `README.md` + `RPCs.md`. This is a real branch in the generator logic (at least two "doc layout eras" to support), not just a path parameter — it's the one non-trivial piece of extra work. It's bounded (2 known layouts observed in this research; there could be a third if the reorg happened in more than one step — would need to bisect a couple more commits to confirm exactly when it changed, not done here).
3. **Generation loop**: for each of the ~30 SHAs, fetch the relevant doc file(s) at that ref (`raw.githubusercontent.com/.../<full-40-char-sha>/<path>` — confirmed working with full SHAs; abbreviated 10-char SHAs 404 on raw.githubusercontent.com, so the script must resolve full SHAs first) and run schema generation, writing `schema-v<version>.json` per version. This is a plain GitHub Actions matrix or a for-loop in one job — no blocker, same shape as any other multi-target CI job.
4. **Hosting**: 30 small JSON files on GitHub Pages alongside the existing "latest" schema, plus a manifest/index listing available versions for the dropdown to read. Free, no new infrastructure.
5. **Re-running on new releases**: same trigger as the "latest" pipeline already needs (poll `main` for changes) — appending one new version each time Jere ships is incremental, not a re-run of the whole matrix, once the initial 30 are generated.

No hard blocker exists. There is no missing-history problem (docs are preserved at every historical commit via normal git blob storage, confirmed by successfully fetching `README.md` and root listing at a 20-month-old commit), and GitHub tags not reflecting Thunderstore versions turned out to be a non-issue in practice because `publish/manifest.json`'s own commit history gives an equally reliable, arguably more accurate, version ↔ commit mapping (it's literally what Jere bumps to cut a Thunderstore release).

**Effort estimate: small-to-moderate, not trivial-trivial.** Rough breakdown:
- Version/SHA resolver script: ~1–2 hours.
- Handling the two (at least) doc-layout eras in the generator: the real cost — depends heavily on how ticket 02's generator is built (if it's a hand-written parser keyed to specific doc file paths/headings, expect a half-day to make it era-aware; if it's something more structural, could be less).
- CI matrix/loop + Pages publishing for N versions + an index file for the dropdown: ~1–2 hours, mechanical.
- Total: roughly **1–2 extra days of work** on top of a working "latest-only" pipeline, not a multi-week undertaking, and not blocked on anything external.

## Bottom line

**A version-picker dropdown is realistically buildable, but not for v1.** The primary-source evidence rules out the one blocker the ticket worried about most (no tags/releases exist, confirmed via both API and web UI — true) but also shows a reliable workaround exists (`publish/manifest.json`'s commit history reconstructs ~30 dated versions back to late 2024, more than enough range), and confirms the schema changes enough between versions (new/removed trigger types, whole new field groups, explicit breaking changes) that multi-version support would be genuinely useful to scripters, not busywork.

Recommendation: **ship latest-only for v1** — it's the simpler, lower-risk path to a working tool, and the "latest" pipeline (ticket 02) is a strict subset of the multi-version work (same generator, just pointed at `main` instead of a loop of historical SHAs). Once latest-only is live and stable, multi-version support is a well-scoped, ~1–2 day follow-on enhancement — not a research question anymore, since this ticket has already resolved the two things that would have blocked it (version enumeration mechanism, and doc-path handling across the one known layout change). Treat it as a fast-follow, not a v1 requirement.

**Open uncertainty**: this research confirmed exactly one doc-layout transition (flat root docs → `docs/` folder, sometime between the 2024-12-31 commit and now) by checking 2 points in history. It's possible there's a second, smaller reorg somewhere in between (e.g. when `functions.md`/`legacy.md` were split out) that would need a quick bisection to pin down before writing the era-aware path logic — a short follow-up check, not a re-scope of this finding.

## Sources consulted

- `https://api.github.com/repos/JereKuusela/valheim-expand_world_prefabs`
- `https://api.github.com/repos/JereKuusela/valheim-expand_world_prefabs/tags?per_page=100`
- `https://api.github.com/repos/JereKuusela/valheim-expand_world_prefabs/releases?per_page=100`
- `https://api.github.com/repos/JereKuusela/valheim-expand_world_prefabs/branches?per_page=100`
- `https://github.com/JereKuusela/valheim-expand_world_prefabs/tags`
- `https://github.com/JereKuusela/valheim-expand_world_prefabs/releases`
- `https://api.github.com/repos/JereKuusela/valheim-expand_world_prefabs/contents/` (root, at `main` and at `ref=352b0996e94c531515889302751df876bb0e8b2c`)
- `https://api.github.com/repos/JereKuusela/valheim-expand_world_prefabs/contents/publish`
- `https://api.github.com/repos/JereKuusela/valheim-expand_world_prefabs/contents/ExpandWorldPrefabs`
- `https://api.github.com/repos/JereKuusela/valheim-expand_world_prefabs/contents/docs`
- `https://api.github.com/repos/JereKuusela/valheim-expand_world_prefabs/commits?path=publish/manifest.json&per_page=100` (and `&page=2`, confirmed empty)
- `https://raw.githubusercontent.com/JereKuusela/valheim-expand_world_prefabs/main/publish/manifest.json`
- `https://raw.githubusercontent.com/JereKuusela/valheim-expand_world_prefabs/main/publish/CHANGELOG.md`
- `https://raw.githubusercontent.com/JereKuusela/valheim-expand_world_prefabs/main/ExpandWorldPrefabs/ExpandWorldPrefabs.csproj`
- `https://raw.githubusercontent.com/JereKuusela/valheim-expand_world_prefabs/main/README.md`
- `https://raw.githubusercontent.com/JereKuusela/valheim-expand_world_prefabs/main/docs/scripting.md`
- `https://raw.githubusercontent.com/JereKuusela/valheim-expand_world_prefabs/352b0996e94c531515889302751df876bb0e8b2c/README.md`
- `https://github.com/JereKuusela/valheim-expand_world_prefabs/commits/main` (spot-check of overall commit cadence)
