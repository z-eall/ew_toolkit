# ew_wiki — Agent Notes

Rules specific to this wiki's own content (`src/content/docs/`). Hub-wide rules (cost, tooling, UI/UX, dual-agent workflow) live one level up — see [../AGENTS.md](../AGENTS.md).

## Content voice and depth

- **Warm, not clinical.** This is a reader-facing interactive guide, not spec text. Don't overcorrect into fluff.
- **Simple words, full depth.** Keep language simple, but never compress the step-by-step — spell out the actual thought process, especially on beginner/starter topics. A reader new to EWP/WEC needs to see *why* a step happens, not just the step itself.
- **Dedicated server is the default setting.** Every guide assumes a dedicated server as the reader's working environment, unless a topic genuinely forks by mode. Singleplayer gets a short callout only where its behavior actually differs from a server — never a parallel full walkthrough.
- **Mod installation is out of scope.** Assume EWP, WEC, and BepInEx are already installed — GitHub, Thunderstore, and Gale each already document that. Content starts at "you already have the mods," never "here's how to install a mod manager."

## Source-verify every guide fact

Before publishing a factual claim (a file path, a mod's behavior, an install/setup step), verify it against [docs/sources.md](docs/sources.md) — every source listed there is pre-approved, no signoff needed to consult it. A source not yet listed needs signoff first (hub-wide rule, see [../AGENTS.md](../AGENTS.md)); once approved, add it to `docs/sources.md` so the next guide doesn't re-ask.

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

The first time any page uses a term with its own page elsewhere in the wiki (a Vocabulary term, `data`, `script`, another guide's topic), link it there rather than assuming the reader already knows it. Applies wiki-wide, not just newly-written pages — when a new page defines a term, sweep existing pages for that term's first use and add the link.
