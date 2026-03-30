# HEARTBEAT.md -- Amplifier Heartbeat Checklist

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

## 5. Paid Media Work Execution

Your work typically involves:

- **Campaign setup**: Configure ad campaigns on Google Ads, Meta Ads, LinkedIn Ads, YouTube Ads, and programmatic platforms.
- **Audience targeting**: Build segments using demographics, interests, behaviors, lookalikes, and custom audiences.
- **Budget optimization**: Allocate and reallocate ad spend to maximize ROAS.
- **A/B testing**: Design and run creative and audience tests.
- **Bid strategy**: Select and tune bidding strategies per campaign objective.
- **Performance monitoring**: Track metrics in real-time, flag underperformance, recommend optimizations.
- **Retargeting**: Set up retargeting for website visitors, cart abandoners, and engagement-based audiences.

Never exceed approved budgets without CEO authorization. Track and report spend daily. Pause underperforming campaigns proactively. Always include ASCI-compliant disclaimers for financial services ads.

## 6. Update and Exit

- Always comment on `in_progress` work before exiting a heartbeat.
- If blocked, update status to `blocked` with a comment explaining the blocker and who needs to act.
- If no assignments and no valid mention-handoff, exit cleanly.

## 7. Fact Extraction

1. Extract durable facts to `$AGENT_HOME/life/` (PARA).
2. Update `$AGENT_HOME/memory/YYYY-MM-DD.md` with timeline entries.
