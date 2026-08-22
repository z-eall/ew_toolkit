# How far should Cursor auto-advance after wayfinder charts a map?

Type: grilling
Status: resolved

## Question

Wayfinder skill: charting session stops without resolving tickets; work-through session resolves one ticket. `AGENTS.md` already says “automatically continue after charting.” In practice Cursor often stops and asks “want me to build it?” or “which ticket?”

Lock the auto-advance rule: what happens immediately after `/wayfinder` creates a new map?

## Answer

**Scripter:** agent decides automation level; adjust over time; remove rigid standing rule if it fights the skill.

- Removed standalone **Wayfinder workflow** section from `AGENTS.md`.
- Light guidance lives under **When a skill is active** → `/wayfinder`: claim first frontier ticket, continue same session, parallel AFK research, stop at HITL or map edge — not a separate hard rule block.
