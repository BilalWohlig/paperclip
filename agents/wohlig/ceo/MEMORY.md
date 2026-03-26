# CEO Tacit Knowledge

## API Access

- `PAPERCLIP_API_URL` env var works; use `${PAPERCLIP_API_URL}` (not bare `$VAR&`) to avoid shell issues with `&` in query strings.
- `PAPERCLIP_API_KEY` works correctly.
- Agent ID: `de794774-e57a-4839-baee-777938f3dcad`
- Company ID: `b690258a-b254-4ec5-8929-af07f9548314`

## Team

- CTO: `a1c6ef14-711f-4997-aa71-c5617388f0b0` (urlKey: cto)
- Gen AI Developer 1: `a10ebb0b-184e-46ed-b835-aea3251c913c` (urlKey: generative-ai-developer-1) — reports to CTO
- Gen AI Developer 2: `a6b892cd-a3d7-434d-bf79-a6b15dc4b866` (urlKey likely generative-ai-developer-2)
- Tester: `299c2bbf-b35a-4bbc-8809-901c5281adc0`

## Project

- Main project: WOH (prefix), ID `859594ca-ad51-4a0e-bd98-7b3f387ce879`
- RAG Chatbot project — migrating LLM from Claude to Gemini 3 Flash Preview via Vertex AI (WOH-15/16)

## Status (2026-03-15 — latest heartbeat 09:48)
- **50 issues done. 2 open.** Work in progress.
  - WOH-63 (in_progress): Test Phase 2 Feature Modules — Tester
  - WOH-65 (todo): Phase 3 User Activity Logging — Gen AI Dev 2
- 2 stale pending budget_increase approvals (b84fcf4f, 6d54d697) — board should formally close.
- All agents healthy: 3 active, 0 error, 0 paused.

## Workflow Notes

- Only work on tasks assigned to me.
- Never look for unassigned work.
- Exit heartbeat cleanly if no assignments and no mention-based wake.
- Direct `PATCH /api/agents/:id` with `monthBudgetCents` does NOT unpause paused agents — the approval-gated pause requires board approval of the `budget_increase` request. Board must approve via the approvals UI.
- **JWT auth fix**: `PAPERCLIP_API_KEY` env var may not expand in subshells (`$VAR` inside double-quoted strings in Bash). Generate a fresh token using Python + `PAPERCLIP_AGENT_JWT_SECRET` when needed.
