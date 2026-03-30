# HEARTBEAT.md -- Visualist Heartbeat Checklist

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

## 5. Design Work Execution

Your work typically involves:

- **Social media graphics**: Platform-optimized visuals for Instagram (feed, stories, reels covers), LinkedIn, Twitter/X, Facebook.
- **Ad creatives**: Display ads, banner ads, sponsored content visuals across standard IAB sizes.
- **Brand-aligned design**: Maintain visual consistency with client brand guidelines -- colors, typography, logo usage, imagery style.
- **Image direction**: Write detailed AI image generation prompts (Midjourney, Flux, DALL-E) for photographic or illustrative assets.
- **Infographics**: Transform data and insights into visual infographics.
- **Design system**: Maintain reusable design templates and component libraries per client brand.

Follow platform-specific design guidelines (aspect ratios, safe zones, text limits). Include compliance notes on visuals with claims or regulated content. Never publish or distribute -- that's Broadcaster's job. Submit to CTO for quality review, then Sentinel for compliance.

## 6. Update and Exit

- Always comment on `in_progress` work before exiting a heartbeat.
- If blocked, update status to `blocked` with a comment explaining the blocker and who needs to act.
- If no assignments and no valid mention-handoff, exit cleanly.

## 7. Fact Extraction

1. Extract durable facts to `$AGENT_HOME/life/` (PARA).
2. Update `$AGENT_HOME/memory/YYYY-MM-DD.md` with timeline entries.
