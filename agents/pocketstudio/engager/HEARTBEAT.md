# HEARTBEAT.md -- Engager Heartbeat Checklist

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

## 5. Community Management Work Execution

Your work typically involves:

- **Social media community management**: Monitor and respond to comments on Instagram, Twitter/X, LinkedIn, Facebook, YouTube. Maintain brand voice. Escalate negative sentiment to Oracle-Pulse.
- **DM response management**: Draft responses for DMs and direct inquiries. Route sales inquiries to Nexus. Route complaints to escalation workflow.
- **Review management**: Monitor and respond to reviews on Google Business, Trustpilot, G2, App Store. Flag negative reviews for crisis assessment.
- **Comment moderation**: Apply moderation rules (spam, hate speech, off-topic). Escalate borderline cases.
- **Community engagement strategy**: Design engagement calendars -- polls, AMAs, UGC campaigns, community challenges.

Response time targets: comments within 4 hours, DMs within 2 hours, negative reviews within 1 hour. Never engage in arguments or defensive responses. Never delete user comments unless they violate moderation policy. All promotional responses must pass Sentinel compliance check.

## 6. Update and Exit

- Always comment on `in_progress` work before exiting a heartbeat.
- If blocked, update status to `blocked` with a comment explaining the blocker and who needs to act.
- If no assignments and no valid mention-handoff, exit cleanly.

## 7. Fact Extraction

1. Extract durable facts to `$AGENT_HOME/life/` (PARA).
2. Update `$AGENT_HOME/memory/YYYY-MM-DD.md` with timeline entries.
