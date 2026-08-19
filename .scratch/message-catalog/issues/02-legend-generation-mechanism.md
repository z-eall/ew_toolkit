# Design the legend-generation mechanism and placeholder syntax

Type: grilling
Status: open
Blocked by: (none)

## Question

The catalog file needs a generated inline legend (YAML comments documenting
each entry's placeholders) that can't drift from what the code actually
provides — but naively regenerating the whole file on every run would
clobber the scripter's hand-edited wording. Pin down the actual mechanism
before the extraction ticket starts moving ~40 message templates into it.

Decide:

1. **Placeholder syntax.** A concrete, consistent convention for naming a
   placeholder inside a template string (e.g. `{{name}}`, `{name}`, `%name%`)
   — has to be unambiguous against the message text itself (none of the
   current ~40 templates use `{{`/`}}` today, so that's a safe default, but
   confirm against the full survey).
2. **What "generated" means here, concretely.** Options include: (a) a
   one-time scaffold script that reads a structured TS registry (key →
   expected placeholder names + a short description, no wording) and emits
   the initial `messages.yaml` with legend comments + placeholder-only
   stand-in text, which the scripter then fills in and owns from then on
   (never re-run destructively); (b) a script that can be re-run safely
   because it only ever touches comment lines above each key, never the
   value line itself (needs a real design for how it locates "the comment
   block belonging to key X" without a fragile line-count assumption); (c)
   something else. The chosen approach must guarantee a re-run (if any)
   never overwrites text the scripter typed.
3. **Where the placeholder metadata (which vars each key expects) lives.**
   Likely a small TS registry/module that both the legend generator and the
   build-time validator (bad-edit-handling decision, already made — see the
   map's Decisions so far) read from, so there's exactly one place that
   declares "key X expects vars {a, b}" rather than that fact being implicit
   in scattered call sites.
4. Whether this ticket should produce a **prototype** (a real example
   `messages.yaml` fragment, 3-4 entries, with legend comments rendered) for
   the scripter to react to before the full 40-message extraction commits to
   the format — recommended, given this is exactly the kind of "how should it
   look" question the `/prototype` skill exists for.

## Notes

Not blocked by [Redesign the diagnosis category grouping](01-category-grouping-redesign.md)
— this is about the *mechanism* for any catalog entry, independent of what
the final category list looks like. Both tickets are in the frontier
together.
