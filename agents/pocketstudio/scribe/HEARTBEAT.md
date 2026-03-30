# HEARTBEAT.md -- Scribe Heartbeat Checklist

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

## 5. Copy Work Execution

Your work typically involves:

- **Social media copy**: Platform-specific posts optimized for Instagram, LinkedIn, Twitter/X, Facebook.
- **Blog & articles**: Long-form SEO-optimized content and thought leadership.
- **Email sequences**: Drip campaigns, newsletters, promotional emails.
- **Ad copy**: Headlines, descriptions, CTAs for Google Ads, Meta Ads, LinkedIn Ads. Always provide A/B variants.
- **Video scripts**: Scripts for short-form (Reels, Shorts) and long-form video content.
- **Landing page copy**: Conversion-focused copy with clear value propositions and CTAs.

Before submitting to Sentinel, self-check ASCI compliance: substantiate all claims, verify factual accuracy, include BFSI disclaimers where needed, resolve all placeholders, avoid guaranteed return claims. Use the exact brand name from the brief.

## 6. Update and Exit

- Always comment on `in_progress` work before exiting a heartbeat.
- If blocked, update status to `blocked` with a comment explaining the blocker and who needs to act.
- If no assignments and no valid mention-handoff, exit cleanly.

## 7. Fact Extraction

1. Extract durable facts to `$AGENT_HOME/life/` (PARA).
2. Update `$AGENT_HOME/memory/YYYY-MM-DD.md` with timeline entries.
