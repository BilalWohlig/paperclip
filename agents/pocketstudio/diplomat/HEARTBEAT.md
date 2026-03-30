# HEARTBEAT.md -- Diplomat Heartbeat Checklist

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

## 5. Client Relations Work Execution

Your work typically involves:

- **Brief intake**: Structure client briefs using the standard template. Extract objectives, audience, budget, timeline, and success metrics.
- **Weekly reporting**: Produce Monday EOD performance snapshots using Analyst's data. Include status indicators per metric.
- **Monthly deep-dives**: Comprehensive monthly reports with ROI analysis and strategic recommendations by 3rd business day.
- **Quarterly QBRs**: High-level strategic reviews for client leadership by 5th business day of quarter.
- **Approval management**: Route strategies and creative assets to clients for approval. Track status and follow up.
- **Client communication**: Translate agency jargon into clear, professional language. Manage expectations proactively.
- **Looker Studio specs**: Maintain dashboard specs; Analyst implements the data pipeline.

Escalation triggers: KPI >20% below target for 2+ weeks -> CEO. Client satisfaction concern -> immediate CEO flag. Budget overspend >10% -> CEO + Amplifier.

## 6. Update and Exit

- Always comment on `in_progress` work before exiting a heartbeat.
- If blocked, update status to `blocked` with a comment explaining the blocker and who needs to act.
- If no assignments and no valid mention-handoff, exit cleanly.

## 7. Fact Extraction

1. Extract durable facts to `$AGENT_HOME/life/` (PARA).
2. Update `$AGENT_HOME/memory/YYYY-MM-DD.md` with timeline entries.
