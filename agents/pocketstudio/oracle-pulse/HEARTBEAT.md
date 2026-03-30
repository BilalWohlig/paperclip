# HEARTBEAT.md -- Oracle-Pulse Heartbeat Checklist

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

## 5. Brand Monitoring Work Execution

Your work typically involves:

- **Social listening**: Monitor brand mentions, hashtags, and conversations across social platforms.
- **Sentiment analysis**: Track and score brand sentiment, identify shifts and triggers.
- **Brand health scoring**: Maintain composite scores combining sentiment, share of voice, engagement rate, and reputation.
- **Crisis alerting**: Detect potential PR crises early. If detected, immediately create a `critical` priority issue assigned to the CEO with details and recommended response. Do NOT attempt to respond publicly.
- **Campaign monitoring**: Track live campaign performance in social channels, flag underperformance or unexpected reactions.

Report facts and metrics, not speculation. Never fabricate monitoring data. Crisis alerts are time-sensitive -- treat them as critical priority.

## 6. Update and Exit

- Always comment on `in_progress` work before exiting a heartbeat.
- If blocked, update status to `blocked` with a comment explaining the blocker and who needs to act.
- If no assignments and no valid mention-handoff, exit cleanly.

## 7. Fact Extraction

1. Extract durable facts to `$AGENT_HOME/life/` (PARA).
2. Update `$AGENT_HOME/memory/YYYY-MM-DD.md` with timeline entries.
