# Map: Cursor skill workflow parity with Claude Code

Labels: `wayfinder:map`

## Destination

When you invoke Matt Pocock skills in Cursor (`/wayfinder`, `/grilling`, `/prototype`, etc.), the agent follows the **same workflow shape** you get in Claude Code: grilling shows ❓ questions with ➡️ recommendations, wayfinder charts then **keeps going** on frontier tickets without stopping to ask what’s next, prototype servers **shut down** when you’re done, and background terminals started for throwaway work don’t linger. Standing rules live in `AGENTS.md` so every Cursor session picks them up — not buried only in skill files Cursor may half-read.

## Notes

- **Domain**: dual-agent setup (Cursor + Claude Code), not EWP product code.
- **Skills every session should consult**: `grilling`, `writing-for-agents`, `handoff`
- **Standing preferences**: plain language in normal chat; skill-specific formats win when a skill is explicitly invoked or a wayfinder ticket type demands it.
- **Root suspicion**: `AGENTS.md` “one simple question at a time” **fights** the grilling skill’s round-based ❓/➡️ format — Cursor always loads `AGENTS.md`, so it overrides skill bodies.

## Decisions so far

- [Why do Matt Pocock skills behave differently in Cursor vs Claude Code?](issues/01-why-cursor-skills-behave-differently.md) — same skill files; `AGENTS.md` plain-language rules override grilling/wayfinder skill bodies; orphan terminals prove lifecycle gap; fix = explicit “when skill is active” section in AGENTS.md.
- [How should AGENTS.md talk rules coexist with grilling's ❓/➡️ format?](issues/02-reconcile-agents-md-with-grilling-format.md) — skill format wins when grilling active; plain chat elsewhere.
- [When should Cursor kill background terminals and dev servers?](issues/03-terminal-and-server-lifecycle.md) — agent judgment, not niche per-skill rules; general background-process line in AGENTS.md.
- [How far should Cursor auto-advance after wayfinder charts a map?](issues/04-wayfinder-auto-advance-in-cursor.md) — no rigid standing rule; light wayfinder guidance under “When a skill is active”.
- [Implement AGENTS.md standing rules for Cursor skill parity](issues/05-implement-agents-md-skill-parity-rules.md) — AGENTS.md updated; map complete.

## Not yet specified

- Whether Cursor needs `.cursor/rules/` files in addition to `AGENTS.md` for skill fidelity (Cursor loads both; rules may be higher salience).
- Whether to add a Cursor-specific `cursor-handoff` skill (Claude has `claude-handoff` with `claude --bg`; no direct equivalent).
- How research subagents should fire in Cursor wayfinder charting (Task tool vs inline).
- Whether “one ticket per session” from the wayfinder skill should relax in Cursor when tickets are AFK research.

## Out of scope

- Rewriting Matt Pocock skill source files (upstream lives in `mattpocock/skills`).
- Cursor product feature requests to Anthropic/Cursor (hooks UI, skill UI parity).
- Making user-invoked skills (`disable-model-invocation: true`) auto-fire without `/` pick — that’s by design.
