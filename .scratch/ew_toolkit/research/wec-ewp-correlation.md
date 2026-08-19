# WEC ↔ EWP correlation — source-verified dependency and file-loading relationship

Purpose: pin down precisely how WEC (`valheim-world_edit_commands`) and EWP
(`valheim-expand_world_prefabs`) relate at the code level, specifically for
the `data`-folder file-loading rule being rebuilt in `fileNameCheck.ts`
(ticket [08-data-filename-folder-rule.md](../../validator-round2/issues/08-data-filename-folder-rule.md)).

Sources checked: both repos' `main` branch via GitHub API/raw content,
2026-08-19 (`gh api repos/JereKuusela/valheim-expand_world_prefabs/git/trees/main?recursive=true`
and same for `valheim-world_edit_commands`, plus `curl` of individual raw files).

## Q1 — Is EWP's `data`-folder loading implemented in EWP's own source, or does it call into WEC?

**Entirely EWP's own source. No WEC reference anywhere.**

`ExpandWorldPrefabs/service/FileLoading.cs` (already found in prior research,
re-confirmed here) does the scanning itself:

```csharp
public static readonly string DataGamePath = Path.GetFullPath(Path.Combine("BepInEx", "config", "data"));
public static readonly string DataProfilePath = Path.GetFullPath(Path.Combine(Paths.ConfigPath, "data"));
public const string DataPattern = "expand_data*.yaml";
public const string PrefabPattern = "expand_prefabs*.yaml";
```

`GetDataSourceFiles` (lines 69–85, prior research) globs `*.yaml` inside
`DataGamePath`/`DataProfilePath` directly via `Directory.GetFiles`, no
delegation to any other assembly. The already-filtered file list is then
handed to EWP's own `ExpandWorldPrefabs/service/data/DataLoading.cs`
(`DataLoading.LoadFromFiles(files, fileEntries)`), which has no filename
logic of its own (confirmed by reading it in full — see below).

I grepped every `.cs` file in the EWP repo (55 files) for `WorldEditCommands`
and `world_edit_commands` (case-insensitive): **zero matches, anywhere.**
EWP's `.csproj` (`ExpandWorldPrefabs/ExpandWorldPrefabs.csproj`) references
only BepInEx/Unity/Harmony/`assembly_valheim`/`assembly_utils`/`SPlatform`/
`YamlDotNet` — no WEC DLL, no shared helper-library DLL either. EWP's YAML
file-watching/reading utility (`ExpandWorldPrefabs/service/Yaml.cs`) is
EWP's own implementation on top of `YamlDotNet`, not borrowed from WEC or
anywhere else.

**Conclusion: the `data`-folder concept is 100% native to EWP's own code.
It is not borrowed from or dependent on WEC in any way.**

## Q2 — Does WEC have its own independent file-loading logic for `data.yaml`-shaped files?

**Yes — and it's a fully separate, independently-scanning implementation,
not a consumer of EWP's loaded files.**

`WorldEditCommands/service/data/DataLoading.cs` (WEC's own file, different
content from EWP's same-named file, in the same C# namespace `Data` by pure
convention/coincidence — they are two different assemblies, so the shared
namespace name causes no coupling):

```csharp
private static readonly string GamePath = Path.GetFullPath(Path.Combine("BepInEx", "config", "data"));
private static readonly string ProfilePath = Path.GetFullPath(Path.Combine(Paths.ConfigPath, "data"));
...
public static void LoadEntries()
{
  ...
  Yaml.LoadListsFromDirectory<DataData>(GamePath, "*.yaml", LoadEntry);
  if (ProfilePath != GamePath)
    Yaml.LoadListsFromDirectory<DataData>(ProfilePath, "*.yaml", LoadEntry);
  ...
}
public static void SetupWatcher()
{
  if (!Directory.Exists(GamePath)) Directory.CreateDirectory(GamePath);
  if (!Directory.Exists(ProfilePath)) Directory.CreateDirectory(ProfilePath);
  Yaml.SetupWatcher(GamePath, "*", LoadEntries);
  if (GamePath != ProfilePath) Yaml.SetupWatcher(ProfilePath, "*", LoadEntries);
}
```

Called from WEC's plugin entry point (`WorldEditCommands/WorldEditCommands.cs`):
`DataLoading.SetupWatcher()` in `Start()`, and `DataLoading.LoadEntries()` in
a Harmony postfix on `ZoneSystem.Start`.

Two things stand out:

1. **WEC scans the identical two physical paths EWP scans**
   (`BepInEx/config/data` and `<ConfigPath>/data`) — same folder names, same
   `*.yaml` glob, same case-insensitive-by-`OrdinalIgnoreCase` convention
   throughout. This is not a shared code path; it's the same author
   independently re-implementing the same folder convention in both mods so
   that a single `data.yaml`-shaped file dropped in that shared folder gets
   picked up by **both** mods separately (if both are installed), each
   building its **own** in-memory registry (EWP's `DataLoading.Data`
   dictionary vs. WEC's `DataLoading.Data` dictionary — same field name,
   two different static dictionaries in two different assemblies).
2. **WEC's `Yaml` class (`Yaml.LoadListsFromDirectory`, `Yaml.SetupWatcher`)
   is not defined in WEC's own repo at all.** There is no `Yaml.cs` anywhere
   in `valheim-world_edit_commands`. `DataLoading.cs` has
   `using ServerDevcommands;` at the top, and WEC's `.csproj` references
   `ServerDevcommands.dll` (`<Reference Include="ServerDevcommands">`), and
   WEC's plugin attribute is `[BepInDependency("server_devcommands", "1.100")]`.
   So WEC's YAML-loading utility comes from a **third**, separate Jere
   Kuusela mod/library (`ServerDevcommands`) that WEC has a real, declared
   dependency on — not from EWP. EWP has no such dependency; its own
   `Yaml.cs` is self-contained on `YamlDotNet` directly.

**Conclusion: WEC does NOT rely on EWP's loader.** WEC has its own,
completely independent file-scanning/loading pipeline for the exact same
`data` folder, built on a shared third-party-to-both-of-them library
(`ServerDevcommands`) rather than on EWP.

## Q3 — What is the actual dependency direction between the two mods?

**Neither depends on the other. They are fully independent BepInEx plugins
that happen to read the same folder convention by shared authorship, not by
code coupling.**

- EWP's `.csproj`: no reference to WEC, no reference to `ServerDevcommands`
  either. EWP's plugin class (`ExpandWorldPrefabs/ExpandWorldPrefabs.cs`)
  carries no `[BepInDependency]` attribute for WEC (`GUID = "expand_world_prefabs"`,
  no dependency attributes on the class at all besides `[BepInPlugin(...)]`).
  It does a soft runtime check for a *different* mod, `expand_world_events`
  (`Chainloader.PluginInfos.TryGetValue("expand_world_events", ...)`) — not
  WEC.
- WEC's `.csproj`: references `ServerDevcommands.dll`, not EWP. WEC's plugin
  class carries `[BepInDependency("server_devcommands", "1.100")]` — a real,
  hard dependency, but on `ServerDevcommands`, not on EWP. WEC also does a
  soft runtime check, `Chainloader.PluginInfos.ContainsKey("expand_world_factions")`
  (`IsEWFactions`) — that's **Expand World Factions**, a third, separate mod
  in Jere's "Expand World" family, not EWP (`expand_world_prefabs`).
- Full-repo grep both directions confirms zero code coupling: grepping every
  `.cs` file in WEC for `expandworld`/`expand_world`/`ExpandWorldPrefabs`
  (case-insensitive) found exactly one hit, the `expand_world_factions`
  soft-check above — no EWP reference. Grepping every `.cs` file in EWP for
  `worldeditcommands`/`world_edit_commands` found zero hits at all.

**Conclusion: EWP and WEC are fully independent mods with no assembly
reference, no `BepInDependency`, and no code call in either direction.**
Their only relationship is that the same author (Jere Kuusela) chose to
give both mods an identical `data`-folder scanning convention (same two
paths, same `*.yaml` glob, same `name:`/typed-value-list entry shape) —
almost certainly so a scripter can maintain one shared library of
`data.yaml`-style files usable from both mods' `data:`/`data set=`
features. That's a deliberate cross-mod *format* compatibility choice, not
a code dependency. It's also not unique to these two: `ServerDevcommands`
is a genuine third shared library WEC (but not EWP) depends on for its YAML
utility, showing the author does use real code sharing elsewhere when he
intends it — the EWP/WEC relationship specifically is not that.

## Q4 — Which mod's source is authoritative for the validator's data-folder rule, and does the standing rule need correcting?

**For the specific `data`-folder file-*loading* rule the ticket is rebuilding
(what folder path, what glob, what case-sensitivity), EWP's own
`FileLoading.cs` is fully sufficient and authoritative on its own.** Checking
WEC's source for this specific mechanical rule was not load-bearing — WEC's
independent loader happens to use the identical two paths and the identical
`*.yaml`/case-insensitive glob, so it corroborates EWP's rule rather than
contradicting or supplementing it. Nothing in WEC's `DataLoading.cs` adds a
loading behavior EWP's file doesn't already have (no additional folder, no
different glob, no additional prefix pattern for the shared `data` folder).

**However, the broader standing rule
([EW Toolkit map](../../map.md) Notes, "data.yaml-relevant checks
source-verify against WEC too") should not be read as "always redundant" —
it should be narrowed, not dropped:**

- For rules about **where/how `data.yaml`-shaped files get loaded from disk**
  (folder path, glob, prefix, case-sensitivity) — EWP's `FileLoading.cs`
  alone is authoritative for the validator's purposes, since the validator
  only ever needs to know what EWP itself will accept when a scripter is
  writing EWP `data:` references. Consulting WEC here is a corroboration
  step at best, not a gap-filler, per this research.
- For rules about **the shape of a WEC data entry itself** (what keys are
  valid on a `name:`-keyed entry, what `ints`/`floats`/`strings`/`value`/
  `valueGroup`/`values` mean, whether `data:` vs `name:` is the real key —
  already resolved definitively via WEC's source in ticket
  [07-wec-entry-key-discrepancy](../../issues/07-wec-entry-key-discrepancy.md))
  — WEC's source **is** the authoritative one, since that's WEC's own command
  system (`data/DataCommand.cs`, `data/DataRawCommand.cs`,
  `service/data/DataData.cs`, `service/data/DataEntry.cs`) reading those
  files independently of EWP.
- For **EWP-only features that have no WEC equivalent at all** (custom saved
  keys, `<save_X_Y>` — already confirmed no-WEC-sibling in ticket
  [07-custom-key-validation-rework](../../validator-round2/issues/07-custom-key-validation-rework.md)'s
  research) — WEC is irrelevant by definition; checking it would find
  nothing, as that research already established.

**Recommendation:** correct the standing rule from a blanket "check WEC too"
to: *check whichever of EWP/WEC's source actually implements the feature in
question — determined by which mod's `Awake()`/`Start()` wires up the
loading or command logic for that specific YAML shape, not by assuming
`data.yaml` is inherently a joint concept requiring both repos every time.*
In practice for `fileNameCheck.ts`'s rebuild specifically: EWP's
`FileLoading.cs` is sufficient and WEC's `DataLoading.cs` corroborates it
without adding anything new — this specific ticket does not need to treat
WEC as a second source of truth, though the check was worth doing once to
confirm rather than assume.

## Plain-language summary

EWP and WEC are two completely independent Valheim BepInEx mods by the same
author with **zero code coupling** — no assembly reference, no
`BepInDependency` on each other, no shared helper class between them (WEC
depends on a *third* mod, `ServerDevcommands`, for its YAML utilities; EWP
has its own self-contained YAML code). What looks like a "WEC owns
`data.yaml`, EWP references it" relationship is really: **both mods
independently implement their own file-scanning logic that happens to watch
the identical `data` subfolder convention** (`BepInEx/config/data` and
`<ConfigPath>/data`, `*.yaml`, case-insensitive), so a single physical
`data.yaml` file dropped there gets picked up separately by each mod into
its own separate in-memory registry — EWP's for `data:` reference lookups,
WEC's for `data set=`/`data get=` commands. It's a deliberate
format-compatibility convention shared by the same author across mods, not
a runtime dependency in either direction. This means the project's
`CONTEXT.md` glossary line implying WEC "owns" the data-entry concept with
EWP merely "referencing" it should be corrected to describe two independent
implementations of a shared convention, and the standing rule to always
consult WEC's source for `data.yaml`-relevant checks should be narrowed to
"consult whichever mod's source actually implements the specific behavior
being checked" rather than treated as a blanket requirement — for the
file-*loading* rule specifically, EWP's own source was already sufficient
and authoritative on its own.
