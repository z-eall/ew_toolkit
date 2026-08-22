# When should Cursor kill background terminals and dev servers?

Type: grilling
Status: resolved

## Question

Prototype and debug sessions leave Vite/dev servers running (e.g. port 5174 still alive from a prior confirm-modal prototype). Define standing lifecycle rules so throwaway servers and one-off shell jobs don’t linger after the human is done or after a skill completes.

## Answer

**Scripter:** agent should use judgment — no niche per-skill shutdown rule.

- Removed standalone **Prototype workflow** section from `AGENTS.md`.
- Replaced with general **Background processes** line under **When a skill is active**: shut down throwaway servers when the work is done and the conversation moved on; test = "would this still be useful if the scripter closed the chat?"
