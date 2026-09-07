# ew_wiki — Agent Notes

Rules specific to this wiki's own content (`src/content/docs/`). Hub-wide rules (cost, tooling, UI/UX, dual-agent workflow) live one level up — see [../AGENTS.md](../AGENTS.md).

## Content voice and depth

- **Warm, not clinical.** This is a reader-facing interactive guide, not spec text. Don't overcorrect into fluff.
- **Simple words, full depth.** Keep language simple, but never compress the step-by-step — spell out the actual thought process, especially on beginner/starter topics. A reader new to EWP/WEC needs to see *why* a step happens, not just the step itself.
- **Dedicated server is the default setting.** Every guide assumes a dedicated server as the reader's working environment, unless a topic genuinely forks by mode. Singleplayer gets a short callout only where its behavior actually differs from a server — never a parallel full walkthrough.
- **Mod installation is out of scope.** Assume EWP, WEC, and BepInEx are already installed — GitHub, Thunderstore, and Gale each already document that. Content starts at "you already have the mods," never "here's how to install a mod manager."
- **Mod tagline = the mod's own GitHub description.** On the Home page, each mod's guide-picker row uses that mod's GitHub repo "About" line as its description text, word for word — not a custom summary. Keeps every mod's blurb straight from Jere, and consistent if a new mod guide gets added later.

## YAML indent in examples

Nested list items align with their parent key, not indented further:

```yaml
- prefab: Player
  type: say, open
  poke:
  - prefab: wood_door
    parameter: openDoor
```

not:

```yaml
  poke:
    - prefab: wood_door
```

Both parse identically — this is the convention scripters actually use, not a schema requirement. Applies to every YAML snippet in this wiki.

## Page and section naming

Name pages and headings by what the reader does or learns, not by what the thing is called internally. "Start Here" is banned as a label — it says nothing about what's inside; every page name should. Test: could two different pages both honestly be called "Start Here"? If yes, the name is too generic.

- Good: "Understanding Fields", "Start Writing a Script", root nav: "Home".
- Bad: "Start Here", "Overview", "Anatomy of X" (clinical, not conversational).

## Comment the first occurrence

The first time a YAML example uses a field, key, or value whose meaning isn't obvious from the word itself, add a trailing `#` comment explaining it inline. Later examples reusing the same key don't need it repeated.

## Say when a list isn't the whole list

When naming a few members of a larger set (value kinds, keys, types), say so explicitly ("...and others", "(not a complete list)") rather than presenting 3-4 examples as if that were all of them.

## Complexity badge per page

Every content page (Concepts, ported guides) sets `complexity: beginner | intermediate | advanced` in its frontmatter. The `PageTitle` override (`src/components/PageTitle.astro`) renders it as a `<Badge>` directly under the H1 automatically — don't hand-add a `<Badge>` in the page body, and don't skip the frontmatter field on a new page.

## Never guess

**No key, value, enum, or mechanic reaches a page until it's been checked against a real source in this session.** Not "sounds right," not "other mods do it this way," not "the schema probably allows this" — checked. `type: spawn` shipped in two pages this way before anyone checked it against real EWP behavior; the actual value is `type: create` (confirmed in `ewp_validator`'s own schema and test fixtures). This is the same bar `ewp_validator` itself holds code to — the wiki doesn't get a looser one just because it's prose.

If a fact can't be verified in the current session (source unreachable, ambiguous, or genuinely undocumented), it does not get written as if true. Either leave it out, or mark it explicitly as unverified (e.g. an `<Aside type="caution">` naming exactly what's unconfirmed) — never smooth it over with confident-sounding wording.

## Source-verify every guide fact — real source first

Check, in order:

1. **`ewp_validator/src/schema.generated.json`** and its `*.test.ts` fixtures — already in this repo, generated from EWP's real schema, and the fastest ground truth for valid keys/values/types.
2. The mod's own source, when the schema doesn't settle it: [expand_world_prefabs](https://github.com/JereKuusela/valheim-expand_world_prefabs) (EWP) and [world_edit_commands](https://github.com/JereKuusela/valheim-world_edit_commands) (WEC) — both pre-approved, listed in `docs/sources.md`. WEC commands it doesn't register itself (e.g. `search_component`) live in its dependency, [ServerDevcommands](https://github.com/JereKuusela/valheim-dev) — check there before assuming a command doesn't exist.
3. **Any Component or field name** (`TeleportWorld`, `activationRange`, `m_allowAllItems`, etc.) — none of the sources above document Valheim's own game components field-by-field. Check [valheimtools.stream/wiki/components](https://valheimtools.stream/wiki/components) (per-component field dumps). Never write a Component/field name from memory or a source guide's say-so alone — this exact mistake shipped `activationDistance` (invented) instead of the real `activationRange` on `TeleportWorld`.
4. [docs/sources.md](docs/sources.md) for everything else (community write-ups, hosting/install facts) — every source listed there is pre-approved, no signoff needed to consult it. A source not yet listed needs signoff first (hub-wide rule, see [../AGENTS.md](../AGENTS.md)); once approved, add it to `docs/sources.md` so the next guide doesn't re-ask.

Tag each claim by its source's tier, per `docs/sources.md`'s own labels (official / community). A true fact with no single citable source doesn't get dropped, and doesn't get stated as if it were sourced — file it under that document's "Community-observed, no single source" section instead, and mark it as such in the page itself (e.g. an `<Aside>`).

## Media placeholders, never guessed media

Static screenshots/diagrams are fair game per-guide (see the map's Not yet specified — this is deliberately per-spot, not blanket); embedded video stays deferred, don't add it without separate signoff. Never generate, source, or guess at an actual image — when a spot in a guide would clearly benefit from one, leave a placeholder for the maintainer to review and capture instead:

```mdx
<Aside type="tip" title="Media placeholder #N">
**Recommended: [short name of the shot].**
- Shows: [exactly what should be in frame]
- How to capture: [the concrete steps to get that shot]
</Aside>
```

Number placeholders in reading order, per page (`#1`, `#2`, ...), so the maintainer can say "here's the file for #2 on the Preparation page" without re-describing the spot. Renumber a page's placeholders only when one is added or removed on it; once real media replaces a placeholder, that number is retired, not reused. One supplied image can satisfy more than one placeholder (or one placeholder can need more than one image) — the maintainer will say so, no separate scheme needed for that case.

Leave the placeholder in place until the maintainer replaces it with a real image — don't strip it silently. Sweep and clear any remaining placeholders before ticket 08 (deploy); a placeholder is a working TODO, not reader-facing content.

## Cross-link on first use

The first time any page uses a term with its own page elsewhere in the wiki (`data`, `script`, a field, another guide's topic), link it there rather than assuming the reader already knows it. Applies wiki-wide, not just newly-written pages — when a new page defines a term, sweep existing pages for that term's first use and add the link.
