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

## Workflow Notes

- Only work on tasks assigned to me.
- Never look for unassigned work.
- Exit heartbeat cleanly if no assignments and no mention-based wake.
