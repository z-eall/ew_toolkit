# Build the Astro Starlight prototype

Type: prototype
Status: resolved

## Question

Build a throwaway Astro Starlight site (local-only, outside `ew_toolkit`, no git repo needed) covering:

- A **Start Here** page: ≤2 short paragraphs on what EWP/WEC is and what this toolkit does.
- Two **Concepts** pages, using terminology verbatim from [CONTEXT.md](../../../CONTEXT.md): **Scripter** and **Schema**, ≤150 words each.
- Use only Starlight's built-in components (Tabs, Steps, Asides, Cards) — no custom/hand-built components, no Monaco.

This ticket exists to answer: does Starlight's built-in component set make this content easy to build, and does the resulting reading experience feel right (progressive disclosure, not a wall of text)?

Use the `/prototype` skill to build it. Link the resulting local folder path from this ticket's Answer.

## Answer

**Local folder**: `C:\Users\Ultimate\Claude\ew_toolkit_wiki_prototype\starlight\`

**Run it**:

```
cd C:\Users\Ultimate\Claude\ew_toolkit_wiki_prototype\starlight
npm run dev
```

(deps already installed via `npm install`; `npm run build` also verified clean — 4 pages, no errors)

**What was built**:

- Scaffolded with `npm create astro@latest -- starlight --template starlight --yes --no-install=false --git=false` (the `--git=false` flag was silently ignored by this create-astro version — it initialized a git repo anyway, so I deleted `.git` afterward to keep the prototype detached and unversioned as instructed).
- **Start Here** (`src/content/docs/index.mdx`, the site's landing/root page): two paragraphs defining EW, EWP, and WEC, and what the toolkit does — terms and avoid-lists taken verbatim from CONTEXT.md. A `<Steps>` walkthrough ("Your first script") with 4 collapsible-feeling numbered steps and a sample EWP rule entry, plus a closing `<Aside type="tip">`.
- **Concepts → Scripter** (`src/content/docs/concepts/scripter.md`) and **Concepts → Schema** (`src/content/docs/concepts/schema.md`): each ≤150 words (well under, ~90 words of prose each), definitions and avoid-lists verbatim from CONTEXT.md, each with a `<Tabs>` block contrasting a minimal EWP YAML example against a common mistake (case-sensitive `type` key for Scripter; wrong value type for `amount` on Schema — both invented but plausible).
- Removed the scaffold's default Guides/Reference example pages and pointed `astro.config.mjs`'s sidebar at Start Here + Concepts only, per the map's scope (no Reference/Recipes/Troubleshooting here).
- Only built-in Starlight components used: `Steps`, `Aside`, `Tabs`/`TabItem`. No custom components, no Monaco.

**Notes on the built-in components**:

- `Steps` and `Tabs` worked with zero friction — import from `@astrojs/starlight/components`, wrap content, done. No config needed beyond the import line.
- `Tabs` reads well for "minimal example vs. common mistake" specifically — it's a natural fit for that pairing and keeps the page from becoming a wall of code blocks.
- The one rough edge: `create-astro`'s `--git=false` flag didn't take (still git-initialized); had to clean up manually. Not a Starlight issue, just the scaffold CLI.
- Overall the built-in set covers this content shape well; nothing here needed a hand-built component.
