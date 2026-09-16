# RichText tags — small teaching section, where does it go?

Type: grilling
Status: resolved

## Question

EWP text fields (`objectRpc: Message`, `Container.m_name`, and similar string fields) accept Valheim's own RichText tags (`<color=#FF0000>...</color>`, `<size=17>`, `<br>`, etc.) — used throughout the guide-source examples (maze guide's kneel warning, ship guide's hover-text naming) but never explained anywhere on the live wiki. Source-verified for the validator across a full round (`.scratch/validator-round5`), never carried to the wiki. Surfaced by a `/wayfinder` review, 2026-09-14.

This should be a **small section, not a solo page** (maintainer's call) — decide exactly where it lives and what it covers.

**Candidate spot**: [basic-rpcs.mdx](../../ew_wiki/src/content/docs/ewp/concepts/basic-rpcs.mdx)'s "Passing parameters" section (`2: string, ...` is exactly where message text gets written) is the most natural single home, since RichText tags are most commonly hit while writing an `objectRpc`/`clientRpc` message. Counter-consideration: RichText also shows up in non-RPC string fields (`Container.m_name` on the Ship page) — worth checking whether a short, linkable callout (rather than folded prose) serves both call sites better than committing it to one page's narrative.

## Notes

Source-verify the exact tag list and behavior against `.scratch/validator-round5/research/02-valheim-richtext-tag-source-audit.md` (already-done research — cite it, don't re-derive) before writing; per `ew_wiki/AGENTS.md`'s "never guess" rule, confirm nothing has drifted since that round if it's more than a routine cite.

## Answer

Checked the live wiki first for actual RichText call sites, not just the guide-source files: only two exist today — `basic-rpcs.mdx`'s `ShowMessage` example (the natural "writing string text" home) and one `Beehive.m_name` value on `bee-ecosystem.mdx` (an Examples/advanced-tier page, RichText incidental to its actual teaching point there). The guide-source examples that use RichText more heavily (Ship guide's `Container.m_name`, the Village Cargo/Station `data.yaml` banners) were never carried over verbatim during their porting tickets, so they aren't live call sites today.

That two-site, unequal-weight split settled the shape: built one shared snippet, `ew_wiki/src/components/snippets/richtext-tags-note.mdx` (a small table covering `<color=#RRGGBB>`/`<#RRGGBB>` shorthand, `<br>`, `<size=N>`, plus a note that a bad tag just fails silently like bad HTML, and a link to Unity's TMP manual for the full set — all cited from `.scratch/validator-round5/research/02-valheim-richtext-tag-source-audit.md` sections 1c and 1d), then used it two different ways rather than restating it:

- `basic-rpcs.mdx` gets the full teaching moment: a new "Coloring and formatting a message: RichText tags" subsection under "Passing parameters," importing the snippet in full. This is the spot a reader actually writing message text first needs it.
- `bee-ecosystem.mdx` gets a one-line tip-style Aside at its `Beehive.m_name` example, pointing back to that subsection's anchor instead of re-teaching the table on a page where formatting isn't the point.

Build verified clean via WSL, 33 pages (same count as before — no new route).
