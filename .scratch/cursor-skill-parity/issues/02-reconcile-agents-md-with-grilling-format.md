# How should AGENTS.md talk rules coexist with grilling's ❓/➡️ format?

Type: grilling
Status: resolved

## Question

`AGENTS.md` tells Cursor “one simple question at a time.” The grilling skill tells the agent to ask the **whole frontier in one round**, each question as ❓ **Qn** with ➡️ recommendation. When both apply, Cursor follows `AGENTS.md` and drops the skill format — which is what you noticed.

Pick how these two should interact.

## Answer

**Scripter chose A (agree with recommendation):** skill format wins when grilling is active; plain chat only outside skills.

- New **When a skill is active** section in `AGENTS.md` — skill steps beat plain-chat rules.
- Plain-chat "one simple question at a time" scoped to normal chat only.
