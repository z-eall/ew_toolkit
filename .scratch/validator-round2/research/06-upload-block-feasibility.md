# Ticket 06 — source-verification of our filename/extension gates against EWP's C# source

Purpose: before building upload-time blocking logic on top of `fileNameCheck.ts`'s
prefix/extension rules, confirm those rules against EWP's actual current C# source
(per the standing rule: source-verify before hand-encoding a strict/rejecting
validation rule from docs prose).

Source checked out: `https://github.com/JereKuusela/valheim-expand_world_prefabs`,
default branch `main`, shallow clone taken 2026-08-19. The relevant logic lives in
`ExpandWorldPrefabs/service/FileLoading.cs` (file-scanning), which calls into
`ExpandWorldPrefabs/service/Yaml.cs` (base directory constant, generic file
reading) and hands already-filtered file lists to
`ExpandWorldPrefabs/service/data/DataLoading.cs` (which has no filename logic of
its own — confirmed by reading it in full).

## Question 1 — filename prefix gate

**Answer: our three-prefix list is not correct.** EWP's own file-scanning code
recognizes prefab/data files two different ways depending on *which directory*
the file sits in, and only one of those ways is prefix-based.

Source, `ExpandWorldPrefabs/service/FileLoading.cs`:

```csharp
private const string PrefabFileName = "expand_prefabs.yaml";
public static readonly string DataGamePath = Path.GetFullPath(Path.Combine("BepInEx", "config", "data"));
public static readonly string DataProfilePath = Path.GetFullPath(Path.Combine(Paths.ConfigPath, "data"));
public const string DataPattern = "expand_data*.yaml";
public const string PrefabPattern = "expand_prefabs*.yaml";
```

and the actual scan (`GetDataSourceFiles`, lines 69–85):

```csharp
public static List<string> GetDataSourceFiles(string gamePath, string profilePath, string baseDirectory, string dataPattern, string prefabPattern)
{
  ...
  return Directory.GetFiles(gamePath, "*.yaml", SearchOption.AllDirectories)
    .Concat(Directory.GetFiles(profilePath, "*.yaml", SearchOption.AllDirectories))
    .Concat(Directory.GetFiles(baseDirectory, dataPattern, SearchOption.AllDirectories))
    .Concat(Directory.GetFiles(baseDirectory, prefabPattern, SearchOption.AllDirectories))
    .Select(NormalizePath)
    .Distinct(StringComparer.OrdinalIgnoreCase)
    .ToList();
}
```

Reading this precisely:

- **`expand_prefabs*.yaml`** (`PrefabPattern`) — matched by prefix, inside the base
  `expand_world` config folder (`Yaml.BaseDirectory = Path.Combine(Paths.ConfigPath, "expand_world")`,
  `Yaml.cs` line 28). Our `VALID_PREFIXES` includes `"expand_prefabs"` — **correct**.
- **`expand_data*.yaml`** (`DataPattern`) — matched by prefix, *also* inside that
  same base `expand_world` folder. Our `LEGACY_PREFIX = "expand_data"` — **correct**.
- **There is no `"data*.yaml"` prefix pattern anywhere in EWP's source.** I grepped
  the whole repo for `data*.yaml` and for any `StartsWith("data"...)` check — zero
  hits outside the two constants above. Instead, EWP scans **every** `.yaml` file
  (glob `"*.yaml"`, no prefix restriction at all) inside two dedicated directories:
  `DataGamePath` (`BepInEx/config/data`) and `DataProfilePath` (`<ConfigPath>/data`).
  Any filename qualifies there — `foo.yaml`, `stuff.yaml`, `mydata123.yaml` — as
  long as it's `.yaml` and physically inside that `data` subfolder.

So EWP's real rule is **folder-location-based** for the "data" case, not
filename-prefix-based. The `data*.yaml` naming convention our validator enforces
doesn't exist in EWP's code; it's likely inferred from doc prose (`docs/scripting.md`,
`docs/legacy.md`, `README.md` link to WEC's `README_data.md`) that colloquially
calls the concept "`data.yaml`" without describing the folder-based mechanism
underneath.

**Case sensitivity:** every comparison in `FileLoading.cs` (`IsYaml`, `IsInFolder`,
`MatchesPattern`) explicitly passes `StringComparison.OrdinalIgnoreCase`. EWP's own
matching is fully case-insensitive, consistent with `fileNameCheck.ts`'s
`name.toLowerCase()` approach.

**So what:** this is a real, confirmed discrepancy, not just imprecise docs. Two
concrete failure modes follow from it:
- A file named e.g. `mydata.yaml` placed in `<config>/expand_world/data/` or
  `BepInEx/config/data/` **would load correctly in EWP** but our
  `classifyFileName` would mark it `"invalid"` (false rejection) because it
  doesn't start with `expand_prefabs`, `data`, or `expand_data`.
- A file named `data123.yaml` sitting directly in the base `expand_world` folder
  (not the `data` subfolder) is currently accepted as `"valid"` by our
  `VALID_PREFIXES.includes("data")` check, but **EWP would never load it** — it
  doesn't match `dataPattern` or `prefabPattern`, and it isn't inside either data
  directory. False acceptance.

Since the validator (per `ew_toolkit/.scratch/ew_toolkit/map.md`, ticket 04/06)
is currently scoped to flat single/batch-file upload rather than folder trees,
this discrepancy may not be exploitable today if the tool has no notion of a
`data/` subdirectory at all — but it means the `"data"` prefix entry in
`VALID_PREFIXES` is not standing in for EWP's real rule, and should not be relied
on as ground truth if folder-aware upload is ever added. This is worth flagging
back to ticket 06/04 authors as a separate, scoped follow-up rather than folding
into the upload-block feasibility answer.

## Question 2 — file extension gate

**Answer: EWP only ever loads `.yaml`, never `.yml`.**

Source, `ExpandWorldPrefabs/service/FileLoading.cs` line 32:

```csharp
public static bool IsYaml(string path) => path.EndsWith(".yaml", StringComparison.OrdinalIgnoreCase);
```

This is the single extension gate used throughout the file (also embedded as the
literal `.yaml` suffix in `PrefabPattern`, `DataPattern`, and the `"*.yaml"` glob
strings passed to `Directory.GetFiles` in `GetDataSourceFiles`). I grepped every
`.cs` file in the repo for `yml` (case-insensitive) and got zero matches anywhere
— not in `FileLoading.cs`, not in `Yaml.cs`, not in any other service file.

**So what:** our `fileNameCheck.ts`'s `REQUIRED_EXT = ".yaml"` (no `.yml`) is
correct and matches EWP exactly. `main.ts`'s upload-intake filter —
`const isYaml = (name: string) => /\.ya?ml$/i.test(name);` (main.ts line 1046) —
is the wrong one. A `.yml` file can never be a valid EWP structural file
regardless of its prefix, so letting it into the file list at all is looser than
reality. It isn't silently mis-validated today — `checkFileName` in
`fileNameCheck.ts` still correctly flags any `.yml` file as `"invalid"`
downstream, since `classifyFileName`'s `REQUIRED_EXT` check fails first — but it
is functionally dead code in `main.ts`: no `.yml` file can ever pass through to a
`"valid"` or `"legacy"` verdict. It exists purely as an extra intake step that a
`.yaml`-only filter would handle identically (reject `.yml` immediately, same end
state as today's "loaded, then flagged invalid").

**Recommendation for the `.yaml`/`.yml` inconsistency:** tighten `main.ts`'s
`isYaml` to `.yaml`-only (`/\.yaml$/i`), not loosen `fileNameCheck.ts` to accept
`.yml`. `main.ts`'s broader acceptance is the incorrect gate; it doesn't reflect
any real EWP behavior it was trying to accommodate. Making the two gates agree on
`.yaml`-only removes the inconsistency without changing observable behavior for
end users (a `.yml` file is invalid either way today), and it's the correct
groundwork if ticket 06 goes on to block invalid extensions at upload time —
right now a `.yml` file gets ingested, incurs a read pass, and only then gets
flagged; a tightened `main.ts` gate could reject it at intake instead, which is
exactly what ticket 06 is asking about for filename-detectable cases.
