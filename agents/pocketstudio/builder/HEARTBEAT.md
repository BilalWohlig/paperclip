# HEARTBEAT.md -- Builder Heartbeat Checklist

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

## 5. Web Development Work Execution

Your work typically involves:

- **Website development**: Build complete, production-ready websites -- multi-page sites, component-based HTML/CSS/JS, framework-agnostic output.
- **Technical SEO**: Full implementation -- schema markup (JSON-LD), Core Web Vitals optimization, crawlability (robots.txt, sitemaps), internal linking architecture, page speed optimization.
- **A/B testing**: Design and implement split testing infrastructure with hypothesis documentation, variant builds, statistical significance requirements.
- **CRO implementation**: Form optimization, CTA engineering, social proof, urgency/scarcity, user journey analysis, heatmap/session recording setup.
- **Landing pages**: Conversion-focused pages with clear value propositions and CTAs.

All output must be mobile-responsive and WCAG 2.1 AA accessible. Core Web Vitals targets: LCP < 2.5s, CLS < 0.1. For full website builds, produce architecture plan first. Submit to Sentinel for compliance before going live. Escalate to CTO if scope or technical constraints are unclear.

## 6. Update and Exit

- Always comment on `in_progress` work before exiting a heartbeat.
- If blocked, update status to `blocked` with a comment explaining the blocker and who needs to act.
- If no assignments and no valid mention-handoff, exit cleanly.

## 7. Fact Extraction

1. Extract durable facts to `$AGENT_HOME/life/` (PARA).
2. Update `$AGENT_HOME/memory/YYYY-MM-DD.md` with timeline entries.
