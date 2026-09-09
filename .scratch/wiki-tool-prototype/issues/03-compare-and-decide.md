# Compare both prototypes and decide

Type: grilling
Blocked by: 01, 02, 04, 05
Status: resolved

## Question

With both the [Starlight prototype](01-starlight-prototype.md) and the [VitePress prototype](02-vitepress-prototype.md) built, decide:

1. **Which framework** — Starlight or VitePress — for Tool #2, and why (reading experience, built-in components vs. hand-building, toolchain fit with the rest of the hub).
2. **Go/no-go** — does the wiki concept hold up well enough, based on this small slice, to justify building Tool #2 for real in the hub? Or does something about the concept itself need rethinking first?

Use the `/grilling` and `/domain-modeling` skills. Record both answers; if "go," note that the actual hub-integrated build needs its own future map (see the parent map's "Not yet specified").

## Answer

Decided via a `/grilling` session (see full transcript for the round-by-round reasoning). Both calls, plus several conditions surfaced along the way:

**1. Framework: Starlight.** Decisive on the evidence: built-in Tabs/Steps/Aside/Cards, `autogenerate` folder-driven sidebar, Zod-schema-validated Content Collections, multi-framework islands for future interactive pieces — all confirmed Starlight-only against VitePress in [ticket 04](04-maintenance-scale-comparison.md)'s research. VitePress's stable 1.x line has been stalled since January 2025 (development moved to an unreleased 2.0-alpha) — a materially different and larger risk than Starlight's own pre-1.0 breaking-change history.

**2. Go/no-go: Go.** The expanded prototype ([ticket 05](05-expanded-starlight-prototype.md)) proved a full 5-section site plus a working Monaco+monaco-yaml playground with no Starlight-specific blockers — the one bug hit (a dev-only Vite/CJS interop issue) was fixed and wasn't framework-specific. Three follow-up content-review reports (`ew-toolkit-wiki-content-review-theory-fundamental.md`, `-basic-use-cases.md`, `-advanced-use-cases.md`) audited the real 9 source guide files against this prototype's patterns and found the wiki concept still holds up — the guides need editing work, not a rethink of the plan.

**Conditions attached to "go," to be the first work in the next map** ("Real content/IA build-out for Tool #2" — not yet charted):

- **Two Foundations pages, built before porting any real guide content:**
  1. A **"Preparation / How to Start"** page — where EWP/WEC YAML files live on disk, and singleplayer vs. dedicated-server differences. Both are "know this before you touch anything" environment facts, so they share one page.
  2. A **"Core Vocabulary" page inside the existing Concepts section** — one heading per term for `data`, `f=`, `par`, `poke`, `WEC`, `fallback`, and the save/load keys, all found undefined-but-load-bearing across all 9 audited guides. Mirrors how `CONTEXT.md` already handles this shape of content (one file, many dictionary-style entries) rather than one page per term. Any term is free to be promoted to its own page later if it outgrows a section — start compact, split when proven too small, not the reverse.
- **A house-style ticket**, right after the two Foundations pages, recording the reusable conventions the content reviews surfaced: `<Steps>` for sequential builds, `<Aside>` for warnings/trust-caveats, `<Tabs>` only for true side-by-side alternatives (never sequential content), shared snippets for repeated boilerplate, code-fence language tags, splitting overly long/heterogeneous pages, and a playground-suitability rule (small self-contained snippets are good live-editing candidates; chained/stateful multi-rule scripts are not, since shape-validity isn't behavior-correctness and risks false confidence).
- **One reader-facing "How to use this guide" page** (not a run of chapters) — explains the colored callout boxes and the "Try it" live-editing box, plus a one-line reading-order pointer. Deeper authoring reasoning (why we pick Steps vs. Tabs) stays in an internal, non-reader-facing doc — different audience, different need. Open to revisiting if one page proves too thin.
- **Scope has grown** since this map was charted: no longer "port the 9 sample guides," but "cover the whole EWP + WEC system, beginner → intermediate → advanced" — an ongoing "ultimate guide," not a fixed content set. Sizing and phasing that ambition is explicitly deferred to the next map's own destination-setting `/grilling` session, mirroring how this map's own destination got pinned down before any tickets were opened.

The actual hub-integrated build (subpath registration, real IA, `/wiki/` deployment) needs its own future map, per the parent map's "Not yet specified" — this ticket's job (pick a framework, decide go/no-go) is done.
