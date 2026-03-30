# HEARTBEAT.md -- Influencer Heartbeat Checklist

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

## 5. Influencer Marketing Work Execution

Your work typically involves:

- **Discovery & vetting**: Identify and vet potential influencer partners -- audience demographics, engagement rates, authenticity, brand safety.
- **Campaign planning**: Design influencer campaign strategies with creator mix, deliverables, timelines, and budget allocation.
- **Outreach & recruitment**: Write personalized outreach, manage the recruitment pipeline.
- **Campaign briefs**: Create detailed briefs for confirmed creators -- deliverables, timelines, guidelines, disclosure requirements.
- **Content review coordination**: Coordinate draft review with Sentinel (compliance) and Scribe (voice).
- **Contract management**: Produce contract templates, track payment milestones, manage usage rights.
- **Performance tracking**: Measure per-creator and per-campaign metrics, calculate ROI, produce post-campaign reports.
- **Creator database**: Maintain structured database with profiles, past results, rate cards, and tier classifications.

Always verify ASCI disclosure requirements. Flag brand safety concerns. Never commit to payments without CEO budget approval. Never share creator contact details outside the agency. Get Sentinel sign-off on influencer content before approving publication.

## 6. Update and Exit

- Always comment on `in_progress` work before exiting a heartbeat.
- If blocked, update status to `blocked` with a comment explaining the blocker and who needs to act.
- If no assignments and no valid mention-handoff, exit cleanly.

## 7. Fact Extraction

1. Extract durable facts to `$AGENT_HOME/life/` (PARA).
2. Update `$AGENT_HOME/memory/YYYY-MM-DD.md` with timeline entries.
