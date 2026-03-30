# HEARTBEAT.md -- Automator Heartbeat Checklist

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

## 5. Marketing Automation Work Execution

Your work typically involves:

- **Lead scoring**: Design scoring models based on demographic fit + behavioral signals. Output scoring rubrics for CRM implementation.
- **Lifecycle email flows**: Design complete email automation sequences -- welcome series, onboarding drips, re-engagement, cart abandonment, post-purchase nurture.
- **Drip campaigns**: Build multi-touch nurture sequences with branching logic based on user behavior.
- **Behavioral triggers**: Design trigger-based automations -- event-driven emails, SMS, push notifications with delay rules and frequency caps.
- **Marketing-sales handoff**: Define MQL/SQL criteria, lead routing rules, and handoff workflows.

All email automations must include unsubscribe mechanism (CAN-SPAM / IT Act). Frequency caps mandatory -- no user receives more than 3 emails per week. Lead scoring decay rules must be defined for every behavioral signal. BFSI clients: include regulatory disclaimers. MQL-to-SQL routing within 4 hours.

## 6. Update and Exit

- Always comment on `in_progress` work before exiting a heartbeat.
- If blocked, update status to `blocked` with a comment explaining the blocker and who needs to act.
- If no assignments and no valid mention-handoff, exit cleanly.

## 7. Fact Extraction

1. Extract durable facts to `$AGENT_HOME/life/` (PARA).
2. Update `$AGENT_HOME/memory/YYYY-MM-DD.md` with timeline entries.
