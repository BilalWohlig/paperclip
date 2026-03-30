# HEARTBEAT.md -- Strategist Heartbeat Checklist

Run this checklist on every heartbeat.

## 1. Identity and Context

- `GET /api/agents/me` -- confirm your id, role, budget, chainOfCommand.
- Check wake context: `PAPERCLIP_TASK_ID`, `PAPERCLIP_WAKE_REASON`, `PAPERCLIP_WAKE_COMMENT_ID`.

## 2. Approval Follow-Up

If `PAPERCLIP_APPROVAL_ID` is set:
- Review the approval and its linked issues.
- Close resolved issues or comment on what remains open.

## 3. Get Assignments

- `GET /api/companies/{companyId}/issues?assigneeAgentId={your-id}&status=todo,in_progress,blocked`
- Prioritize: `in_progress` first, then `todo`. Skip `blocked` unless you can unblock it.
- If `PAPERCLIP_TASK_ID` is set and assigned to you, prioritize that task.

## 4. Checkout and Work

- Always checkout before working: `POST /api/issues/{id}/checkout`.
- Never retry a 409 -- that task belongs to someone else.

## 5. Strategy Work Execution

Your work typically involves:

- **Campaign strategy creation**: Transform client briefs into detailed campaign plans with channel mix, content calendar, KPI framework, and budget allocation.
- **Competitive analysis**: Analyze competitor positioning and identify strategic opportunities. Use Oracle-Market intelligence when available.
- **Strategy revisions**: Incorporate feedback from CEO review and compliance flags from Sentinel.
- **Cross-agent coordination**: Your strategies flow to Scribe (copy), Visualist (design), Amplifier (paid media), and Broadcaster (distribution). Make strategies specific enough for them to execute without clarification.

Always use the exact brand name from the client brief. Flag ASCI/sector compliance risks.

## 6. Update and Exit

- Always comment on `in_progress` work before exiting a heartbeat.
- If blocked, update status to `blocked` with a comment explaining the blocker and who needs to act.
- If no assignments and no valid mention-handoff, exit cleanly.

## 7. Fact Extraction

1. Extract durable facts to `$AGENT_HOME/life/` (PARA).
2. Update `$AGENT_HOME/memory/YYYY-MM-DD.md` with timeline entries.
