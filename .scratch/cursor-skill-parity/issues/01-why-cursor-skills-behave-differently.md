# Why do Matt Pocock skills behave differently in Cursor vs Claude Code?

Type: research
Status: resolved

## Question

Audit the concrete causes of workflow drift when the same skill files run in Cursor Agent vs Claude Code. Cover: grilling format, wayfinder auto-advance, prototype/terminal cleanup, subagent/research dispatch, and anything in `AGENTS.md` that overrides skill instructions.

Deliverable: a gap table Claude Code vs Cursor with recommended fix per row — not implementation.

## Answer

Same skill **files** on disk; different **always-on instructions** and **platform habits** make Cursor drift.

| Gap | Claude Code | Cursor today | Why | Recommended fix |
|-----|-------------|--------------|-----|-----------------|
| **Grilling format** | ❓ **Qn** + ➡️ recommendation per round | Plain questions, often one at a time | `AGENTS.md` says “one simple question at a time” — always loaded, overrides grilling skill body | When `/grilling` runs or a wayfinder ticket is Type: grilling → **skill format wins**. Normal chat keeps plain language. |
| **Wayfinder after charting** | Often stops (skill says charting session resolves nothing) | `AGENTS.md` says auto-continue — but agents still stop and ask | Competing instructions; “one ticket per session” in skill vs “keep going” in AGENTS.md | Explicit rule: after chart → claim first frontier ticket immediately; run AFK research in parallel; stop only at HITL grilling or map edge. |
| **Prototype servers** | Same risk | Vite left on 5174 from prior session | Only recent AGENTS.md rule; agents skip cleanup | Expand lifecycle: kill servers after choice **and** at session end; track PIDs started this session. |
| **Skill loading** | `.claude/skills` junction + CLAUDE.md | `.cursor/skills` copy + AGENTS.md | User-invoked skills (`disable-model-invocation: true`) only load full body when picked from `/` menu — easy to half-follow | Re-read skill file at start of every `/` invocation; put non-negotiable format rules in AGENTS.md. |
| **Research subagents** | `claude --bg` / native subagents in charting step 5 | Task tool exists but often skipped | No standing rule to fire research tickets in parallel | Add AGENTS.md line: wayfinder charting → dispatch Task subagents for each `research` ticket. |
| **Background handoff** | `claude-handoff` skill launches `claude --bg` | No equivalent | Platform gap | Out of scope for parity; use HANDOFF.md + commit/push instead. |
| **Terminal visibility** | Similar | Cursor keeps shells in terminals folder; easy to forget | No cleanup discipline | Before ending session: check terminals folder, kill orphan dev servers. |

**Evidence this session:** port 5174 Vite still running from confirm-modal prototype debug (`running_for_ms: 2240135` in terminals folder).

**Highest-leverage fix:** update `AGENTS.md` with a **“When a skill is active”** section that explicitly overrides the plain-language chat rules — not changing upstream skill files.
