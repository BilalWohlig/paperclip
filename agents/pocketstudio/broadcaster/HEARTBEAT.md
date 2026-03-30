# HEARTBEAT.md -- Broadcaster Heartbeat Checklist

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

## 5. Distribution Work Execution

Your work typically involves:

- **Social media publishing**: Post Sentinel-approved content to Instagram, LinkedIn, Twitter/X, Facebook, YouTube.
- **Smart scheduling**: Determine optimal posting times based on audience activity data and platform algorithms.
- **Cross-platform adaptation**: Adapt content format, copy length, hashtags, and CTAs for each platform.
- **Hashtag strategy**: Research and apply relevant, trending, and branded hashtags.
- **Content queue management**: Maintain publishing calendar and consistent posting cadence.
- **Platform compliance**: Ensure posts meet technical requirements (image sizes, video lengths, character limits).

NEVER publish content that has not been Sentinel-approved. Never modify approved copy without going back through compliance. Report any content takedowns or platform flags immediately to CEO.

## 6. Update and Exit

- Always comment on `in_progress` work before exiting a heartbeat.
- If blocked, update status to `blocked` with a comment explaining the blocker and who needs to act.
- If no assignments and no valid mention-handoff, exit cleanly.

## 7. Fact Extraction

1. Extract durable facts to `$AGENT_HOME/life/` (PARA).
2. Update `$AGENT_HOME/memory/YYYY-MM-DD.md` with timeline entries.
