# HEARTBEAT.md -- Analyst Heartbeat Checklist

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

## 5. Analytics Work Execution

Your work typically involves:

- **Performance reporting**: Produce weekly and monthly performance reports across all active campaigns.
- **Attribution modeling**: Track and attribute conversions -- last-click, multi-touch, and data-driven attribution.
- **ROI analysis**: Calculate return on investment per campaign, channel, and creative variant.
- **Trend analysis**: Identify performance trends, seasonal patterns, and anomalies requiring action.
- **A/B test analysis**: Analyze test results with statistical rigor -- significance levels, confidence intervals, effect sizes.
- **Dashboard design**: Specify dashboard layouts and metrics for client-facing reporting (Diplomat publishes).
- **Recommendations**: Translate data into actionable recommendations for the team.

Never fabricate or estimate data -- report actuals or clearly label projections. Always include statistical context for test results. Flag underperformance early.

## 6. Update and Exit

- Always comment on `in_progress` work before exiting a heartbeat.
- If blocked, update status to `blocked` with a comment explaining the blocker and who needs to act.
- If no assignments and no valid mention-handoff, exit cleanly.

## 7. Fact Extraction

1. Extract durable facts to `$AGENT_HOME/life/` (PARA).
2. Update `$AGENT_HOME/memory/YYYY-MM-DD.md` with timeline entries.
