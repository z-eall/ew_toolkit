# Is EWP's YAML key (property name) matching case-sensitive or case-insensitive?

Research for round 9, following on from round 8 (`type:` field *value* parsing, confirmed
case-insensitive via `Enum.TryParse(..., true, ...)`). This round asks the different question:
does the YAML *key* itself (e.g. `prefab:` vs `Prefab:` vs `PREFAB:`) bind to the same C# property,
or is key matching case-sensitive? This determines whether `additionalProperties: false` in
`ewp_validator/schema/generate.mjs` — which does exact-string property-name matching — is safe as
written, or needs the same case-insensitive treatment `type` got.

Fetched directly from primary sources on 2026-08-19 via `raw.githubusercontent.com`:

- `ExpandWorldPrefabs/service/Yaml.cs` (Jere Kuusela's `valheim-expand_world_prefabs`, branch `main`) — re-fetched in full for this round.
- `YamlDotNet/Serialization/TypeInspectors/ReadablePropertiesTypeInspector.cs` (aaubry/YamlDotNet, branch `master`).
- `YamlDotNet/Serialization/NodeDeserializers/ObjectNodeDeserializer.cs` (same repo).
- `YamlDotNet/Serialization/DeserializerBuilder.cs` (same repo).

---

## 1. EWP's `Yaml.cs`: no case-insensitivity opt-in

`Yaml.cs` builds two deserializers, both via `DeserializerBuilder`:

```csharp
// "standard" deserializer
new DeserializerBuilder()
  .WithNamingConvention(CamelCaseNamingConvention.Instance)
  .Build()

// "unsafe" / fallback deserializer
new DeserializerBuilder()
  .WithNamingConvention(CamelCaseNamingConvention.Instance)
  .IgnoreUnmatchedProperties()
  .Build()
```

`Deserialize<T>` tries the standard (strict) deserializer first and falls back to the
`IgnoreUnmatchedProperties()` variant on failure — this is EWP's general error-tolerance strategy
(malformed/unknown keys don't hard-crash the whole file), not a case-sensitivity mechanism.

Neither builder calls `.WithCaseInsensitivePropertyMatching()` — the one and only YamlDotNet API
that affects key-to-property matching case sensitivity (see §2). `.WithNamingConvention(...)` is a
different, unrelated knob: it transforms the *expected* name derived from the C# property (PascalCase
`Prefab` → `prefab`), it does not affect how the *actual* YAML key found in the document is compared
against that expected name.

## 2. YamlDotNet's own default: case-sensitive, opt-in only

Traced the matching logic through three files in `aaubry/YamlDotNet`:

**`ObjectNodeDeserializer.cs`** — this is where a YAML mapping key is actually resolved to a
property, once per key encountered:

```csharp
var propertyName = parser.Consume<Scalar>();
var property = typeInspector.GetProperty(implementationType, null,
    propertyName.Value, ignoreUnmatched, caseInsensitivePropertyMatching);
```

`caseInsensitivePropertyMatching` is a constructor parameter threaded in from the builder — it is
not derived from the naming convention, it's an independent flag.

**`DeserializerBuilder.cs`** — the flag's default and only setter:

```csharp
// field default: false (never explicitly assigned in the constructor)
public DeserializerBuilder WithCaseInsensitivePropertyMatching()
{
    caseInsensitivePropertyMatching = true;
    return this;
}
```

and it's threaded into the `ObjectNodeDeserializer` constructor as the 8th positional argument
alongside `ignoreUnmatched`, `duplicateKeyChecking`, `enumNamingConvention`, etc. — confirming it's
a real, independent constructor parameter, not dead code.

**`ReadablePropertiesTypeInspector.cs`** — the underlying `GetProperties()`/property-name source
uses plain reflection (`type.GetProperties(...)`), and each `IPropertyDescriptor.Name` is just
`propertyInfo.Name` (transformed by the naming convention at the `NamingConventionTypeInspector`
wrapping layer) — no built-in case-folding at this layer either; case handling is entirely
delegated to the `caseInsensitivePropertyMatching` flag checked in `GetProperty`.

**Conclusion: YamlDotNet's default `DeserializerBuilder` is case-sensitive for key matching.**
Case-insensitive matching is opt-in only, via `.WithCaseInsensitivePropertyMatching()`. EWP calls
neither the case-insensitive builder method nor anything equivalent.

## 3. Verdict

**EWP's YAML key matching is case-sensitive.** A key like `Prefab:` or `PREFAB:` does **not** bind
to the `Prefab` C# property the way `prefab:` does.

What actually happens to a wrong-case key depends on which of the two deserializers is active for
that parse:

- **Standard deserializer** (`.WithNamingConvention(...)`, no `IgnoreUnmatchedProperties()`): an
  unrecognized key throws a `YamlException` (unmatched property), which is exactly the failure mode
  `Deserialize<T>`'s try/fallback is designed to catch.
- **Fallback "unsafe" deserializer** (adds `.IgnoreUnmatchedProperties()`): the mismatched key is
  silently dropped — no exception, but also no binding. The property keeps its C# default (often
  `null`/`0`/`false`), and depending on the property, an unset "prefab" or "minDistance" is anything
  from a validation warning to silent data loss.

Either way, wrong-case is never accepted as equivalent to the correctly-cased key. This is the
opposite conclusion from round 8's `type:` *value* finding — the two questions (value parsing vs.
key/property-name matching) are governed by completely different code paths in EWP (`Enum.TryParse`
application code vs. YamlDotNet's deserialization internals), and just happen to behave oppositely.

## 4. Recommendation for `ewp_validator/schema/generate.mjs`

**No change needed.** `additionalProperties: false` with exact-case property names (`"prefab"`,
`"minDistance"`, `"globalKeys"`, etc.) is the *correct* modeling of EWP's real behavior — it's not
an overly strict approximation the way the old `type:` enum was. A YAML author who writes `Prefab:`
or `MinDistance:` is not doing something EWP quietly accepts; they're doing something EWP either
outright rejects (standard deserializer path) or silently no-ops (fallback path), both of which are
worse for the author than the validator flagging it up front. If anything, this strengthens the case
for keeping `additionalProperties: false` on these objects, since a validator catch is strictly
better than EWP's own silent-drop fallback behavior.

One adjacent, optional improvement worth flagging separately (not a case-sensitivity issue, out of
scope for this ticket): since EWP's own fallback behavior for a genuinely unknown/misspelled key is
"silently drop, keep default," it could be worth the schema's error message for
`additionalProperties: false` violations mentioning this explicitly (e.g. "unknown key — EWP will
silently ignore this rather than erroring"), so users understand *why* it matters even though EWP
itself won't crash on it. This is a UX/messaging suggestion, not a schema-correctness one.

## 5. Confidence and what would raise it further

This conclusion rests on reading YamlDotNet's own source for the exact mechanism (not just docs or
inference), plus EWP's `Yaml.cs` confirming it opts into neither case-insensitive flag. That's about
as definitive as source-reading gets short of compiling and running it. The one thing source-reading
alone can't rule out is a YamlDotNet version pin in EWP's `.csproj`/lockfile that predates the
`caseInsensitivePropertyMatching` parameter's existence (in which case case-insensitive matching
wouldn't even be *available* to EWP, reinforcing the same conclusion) — this wasn't checked, but
doesn't change the verdict either way. If anyone wants empirical confirmation to match round 8's
in-game test methodology, the equivalent live test here would be: add a rule with `Prefab:` (capital
P) instead of `prefab:` for an otherwise-valid rule and confirm in-game that the prefab rule is
either rejected at load or silently does nothing (as opposed to round 8's `type: globalkey` test,
which confirmed the *positive* case — both cases working).
