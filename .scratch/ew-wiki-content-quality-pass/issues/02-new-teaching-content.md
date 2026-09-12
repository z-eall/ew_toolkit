Type: grilling
Status: resolved

## Question

Add two new pieces of teaching content to `ew_wiki`. Decide where each belongs and the exact wording (matching wiki voice, see `ew_wiki/AGENTS.md`), then write it directly.

1. **`#comment` syntax** — teach that YAML comments exist and why to use them. Suggested framing (not final wording): "It's good practice to write a comment above the script describing what it does and why — helps you when you look back later, helps someone else read your script, and helps with Ctrl+F search across a project." Likely belongs in [start-scripting.mdx](../../../ew_wiki/src/content/docs/ewp/concepts/start-scripting.mdx) or wherever basic script anatomy is first taught — confirm the best spot.
2. **Recommended YAML editors**, as a tiered list (exact tiers from the maintainer):
   - Can be: Notepad
   - Better: Notepad++, Atom
   - Good to have: Sublime, VS Code with Haloa's schema
   - Best practice: also use the hub's own EWP validator (`ewp_validator` Tool)

   Confirm the best page for this (likely the Preparation/"How to Start" page, or wherever tooling is first mentioned).

## Answer

Both pieces written, plus this grew two extra deliverables along the way (with sign-off at each expansion):

1. **`#comment` syntax** — new "Add comments so future-you remembers why" section in [start-scripting.mdx](../../../ew_wiki/src/content/docs/ewp/concepts/start-scripting.mdx), teaching both the existing trailing per-field comment style and a new whole-block purpose-header style. Also added a second, separate tip in the same page's "Getting your script running" section: commenting out blocks to isolate a bug while testing, including an editor-shortcut callout (Notepad++'s `Ctrl+K`/`Ctrl+Shift+K`).
2. **Recommended YAML editors** — new "Picking a YAML editor" section in [preparation.mdx](../../../ew_wiki/preparation.mdx), tiered Basic/Commonly used/Alternative/Best practice, linking the real "EWP Schema" resource (`valheimtools.stream/ewp-schema/`, confirmed via fetch — works with both VS Code and Sublime Text, not just VS Code as originally assumed) and the hub's own EWP validator.
3. **Retrofit** — added a one-line purpose header comment to the main script block on 6 existing chained-example pages (auto-upgrade-station, bee-ecosystem, world-progression, village-cargo, advanced-triggers-time, advanced-poke-creative-systems), demonstrating the new convention live.
4. **Standing rule + hook** (check-reach step) — since "should future chained examples follow this too" outlives this one map, added a rule to `ew_wiki/AGENTS.md` (right after the sibling "Comment the first occurrence" rule) plus a new advisory hook, `guard-script-block-header-comment.cjs`, wired in both `ew_toolkit`/`ew_toolkit-cursor` worktrees and documented in the repo's `docs/agents/hooks-vs-rules.md`. Drafted via `writing-for-agents` self-invocation per standing practice.
