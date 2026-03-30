# Pocket Studio 2.0 — Campaign Workflow & Approval Gates

This document defines the end-to-end campaign pipeline and the two mandatory approval gates that must be cleared before any content is distributed.

---

## Approval Gates

Two approval gates are mandatory on every campaign. No content ships without both cleared.

### Gate 1: Strategy Approval

**Trigger**: Strategist completes the campaign strategy document.

**Flow**:
1. Strategist submits campaign strategy on the Paperclip issue (comment + status update).
2. CEO reviews strategy for alignment with client objectives, budget, and feasibility.
3. CEO submits strategy for board/client approval via Paperclip approval workflow.
4. Board/client approves or requests revision.
5. On approval: CEO creates production tasks for Scribe, Visualist (Phase 2+), and other agents.

**Who approves**: CEO + board/client.
**Blockers if skipped**: Production agents will not receive briefs. No copy, visual, or media work begins without an approved strategy.

### Gate 2: Creative Compliance Approval

**Trigger**: Production agents (Scribe, Visualist, Director) complete creative assets.

**Flow**:
1. Production agent (e.g., Scribe) submits deliverable on the Paperclip issue.
2. Sentinel receives the deliverable (via @-mention or task assignment) and runs a compliance audit.
3. Sentinel posts a verdict: **APPROVED**, **NEEDS REVISION**, or **REJECTED**.
   - **APPROVED**: Assets proceed to Broadcaster for distribution.
   - **NEEDS REVISION**: Sentinel creates a revision task with specific changes required. Production agent fixes and resubmits. Sentinel re-audits.
   - **REJECTED**: Fundamental compliance failure. CEO is notified. Assets are scrapped and reproduced.
4. Only Sentinel-approved assets are forwarded to Broadcaster.

**Who approves**: Sentinel (compliance), then CEO (final sign-off on first campaign per client).
**Blockers if skipped**: Distribution agents will not publish unapproved content. This is non-negotiable.

### Compliance Standards Enforced

Sentinel audits against:
- **ASCI** (Advertising Standards Council of India) — all clients
- **BFSI** (RBI/SEBI/IRDAI) — financial services clients
- **FSSAI** — food & beverage clients
- **RERA** — real estate clients
- **CDSCO** — pharma/healthcare clients
- **Brand DNA** — client-specific brand guidelines from the onboarding brief

---

## End-to-End Campaign Pipeline

### Stage 1: Client Onboarding

**Owner**: Diplomat
**Input**: New client engagement
**Output**: Completed client onboarding brief

1. Diplomat sends the onboarding brief template to the client (see `client-onboarding-brief.md`).
2. Sections 1-5 completed in the kickoff call. Sections 6-10 within 48 hours.
3. Diplomat uploads the completed brief to Paperclip and creates a campaign kickoff task assigned to CEO.

### Stage 2: Market Intelligence

**Owner**: Oracle-Market, Oracle-Pulse
**Input**: Completed onboarding brief
**Output**: Competitive analysis, audience insights, trend data

1. CEO creates intelligence-gathering tasks for Oracle-Market and Oracle-Pulse.
2. Oracle-Market produces competitive analysis and market positioning data.
3. Oracle-Pulse produces social listening baseline, sentiment analysis, and brand health score.
4. Both outputs feed into the Strategist's campaign planning.

### Stage 3: Strategy

**Owner**: Strategist
**Input**: Client brief + intelligence data
**Output**: Campaign strategy document

1. CEO creates a strategy task for Strategist, linking the brief and intelligence outputs.
2. Strategist produces the full campaign strategy (channels, calendar, KPIs, budget).
3. Strategist submits for review.
4. **Gate 1 (Strategy Approval)** is triggered.

### Stage 4: Creative Production

**Owner**: Scribe (copy), Visualist (design, Phase 2+), Director (video, Phase 2+)
**Input**: Approved campaign strategy
**Output**: Creative assets per channel

1. CEO creates production tasks from the approved strategy, one per deliverable type.
2. Scribe produces all copy (social posts, emails, blog articles, ad copy, scripts).
3. Visualist produces all visual assets (Phase 2+).
4. Director produces video/audio assets (Phase 2+).
5. Each production agent self-checks against compliance guidelines before submitting.
6. Production agent tags @Sentinel for compliance audit.
7. **Gate 2 (Creative Compliance Approval)** is triggered per asset batch.

### Stage 5: Distribution

**Owner**: Broadcaster (Phase 2+)
**Input**: Sentinel-approved creative assets
**Output**: Published content across channels

1. Broadcaster receives approved assets.
2. Broadcaster schedules and publishes per the content calendar from the strategy.
3. Broadcaster confirms publication with links/timestamps on the Paperclip issue.

### Stage 6: Performance & Reporting

**Owner**: Analyst (data), Diplomat (client-facing reports)
**Input**: Published campaign data, platform analytics
**Output**: Weekly snapshots, monthly deep-dives, quarterly QBRs, Looker Studio dashboards

1. Analyst collects performance data from Amplifier (paid), Broadcaster (organic), and platform APIs.
2. Analyst produces structured data reports (weekly by Friday EOD, monthly by 2nd business day).
3. Diplomat assembles client-facing reports using structured templates:
   - **Weekly Snapshot** (every Monday): KPI table with RAG status, top 3 wins, flags, next week's plan.
   - **Monthly Deep-Dive** (by 3rd business day): Full KPI dashboard, channel breakdown, campaign-level analysis, content performance, audience insights, compliance summary, ROI analysis, strategic recommendations, budget reallocation advice.
   - **Quarterly Business Review** (by 5th business day of quarter): QoQ metrics, strategic objectives progress, channel ROI ranking, key learnings, next-quarter priorities.
4. Diplomat maintains each client's Looker Studio dashboard spec (Analyst implements data pipeline).
5. Escalation triggers: any KPI >20% below target for 2+ weeks → CEO; budget overspend >10% → CEO + Amplifier.

---

## Phase 1 Pipeline (Current)

With 8 agents active, the current pipeline covers Stages 1-4:

| Stage | Agent(s) | Status |
|-------|----------|--------|
| 1. Onboarding | Diplomat | Active |
| 2. Intelligence | Oracle-Market, Oracle-Pulse | Active |
| 3. Strategy | Strategist | Active |
| 4. Production (copy) | Scribe | Active |
| 4. Compliance | Sentinel | Active |
| 4. Production (web) | Builder | Active (landing pages only) |
| 5. Distribution | — | Phase 2 (Broadcaster) |
| 6. Reporting | Analyst + Diplomat | Active (Phase 2) |

---

## Revision Workflow

When Sentinel flags issues:

1. Sentinel creates a revision task as a child of the original production task.
2. Revision task lists specific changes with before/after guidance.
3. CEO assigns the revision task to the relevant production agent (or Sentinel escalates to CEO if it lacks `tasks:assign` permission).
4. Production agent applies changes and comments with revised copy.
5. Production agent tags @Sentinel for re-audit.
6. Sentinel re-audits and posts updated verdict.
7. Repeat until APPROVED.

Items requiring external input (client/board product team confirmation) are escalated by CEO to the board via issue comments. These items block the revision task until resolved.

---

*Playbook maintained by CEO, Pocket Studio 2.0. Version: 1.1 — 2026-03-27. Updated: added structured reporting cadence (weekly/monthly/QBR) and Looker Studio dashboard spec.*
