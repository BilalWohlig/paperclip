# Pocket Studio 2.0 — Paid Media Launch Pipeline

> **Workflow**: Strategist → Amplifier → Analyst → Diplomat
> **Trigger**: Board-approved campaign strategy includes paid media channels (Gate 1 cleared)
> **Owner**: CEO orchestrates; Amplifier runs campaigns, Analyst tracks performance, Diplomat reports to client

---

## Overview

This playbook governs the launch, optimization, and reporting of paid media campaigns across Google Ads, Meta Ads, LinkedIn Ads, and YouTube Ads. It runs in parallel with the content production pipeline — Amplifier uses Sentinel-approved creative assets from that pipeline. Performance data flows from Amplifier to Analyst to Diplomat in a continuous reporting loop.

---

## Prerequisites

Before launching paid media:

- [ ] Campaign strategy approved (Gate 1 cleared) with paid media budget allocation
- [ ] Creative assets produced and Sentinel-approved (content production pipeline complete or in parallel)
- [ ] Ad platform access credentials shared securely by client (via onboarding brief Section 9)
- [ ] Tracking infrastructure configured (UTM parameters, conversion pixels, GA4 goals)
- [ ] Client-approved budget allocation per channel (onboarding brief Section 5)

---

## Issue Tree Template

### 1. Parent Issue — Paid Media Campaign

```
Title:     [Client] Paid media — [Campaign Name] — [Month/Sprint]
Assignee:  CEO
Priority:  high
Status:    in_progress
Parent:    Campaign epic issue
```

**Description template**:
```markdown
Paid media campaign management for [Campaign Name].

**Strategy**: [link to approved strategy issue]
**Total paid budget**: [INR amount]
**Duration**: [start date] to [end date]
**Channels**: [Google Ads, Meta Ads, LinkedIn Ads, YouTube Ads — per strategy]

**Budget allocation**:
| Channel | Budget (INR) | % of Total | Objective |
|---------|-------------|-----------|-----------|
| Google Search | | | |
| Google Display | | | |
| Meta (FB + IG) | | | |
| LinkedIn | | | |
| YouTube | | | |

Workflow: Strategist media plan → Amplifier (launch + optimize) → Analyst (performance) → Diplomat (client reports)
```

---

### 2. Strategist — Media Plan

```
Title:     [Client] Media plan — [Campaign Name]
Assignee:  Strategist
Priority:  high
Status:    todo
Parent:    Paid Media Campaign (above)
```

**Description template**:
```markdown
Produce the paid media plan for this campaign.

**Input**: Approved campaign strategy + client budget allocation
**Output**: Detailed media plan covering:

- [ ] **Channel strategy**: Why each platform, expected reach, audience fit
- [ ] **Audience targeting**:
  - Per-platform audience definitions (demographics, interests, behaviors, custom/lookalike)
  - Exclusion lists
  - Retargeting segments
- [ ] **Campaign structure**:
  - Campaign → Ad Set/Ad Group → Ad hierarchy per platform
  - Naming conventions for tracking
- [ ] **Budget pacing**: Daily/weekly spend targets per campaign
- [ ] **Bid strategy**: Automated vs. manual, target CPA/ROAS per campaign
- [ ] **KPI targets per channel**:
  | Channel | Primary KPI | Target | Secondary KPI | Target |
  |---------|------------|--------|---------------|--------|
  | | | | | |
- [ ] **A/B test plan**: What variables to test (creative, audience, placement, copy)
- [ ] **Flight schedule**: Launch dates, ramp-up periods, peak spend windows

**Handoff**: When complete, @Amplifier with the media plan. Set status to `done`.
```

---

### 3. Amplifier — Campaign Setup & Launch

```
Title:     [Client] Campaign setup & launch — [Campaign Name]
Assignee:  Amplifier
Priority:  high
Status:    todo (blocked until Strategist media plan + Sentinel-approved creatives ready)
Parent:    Paid Media Campaign
```

**Description template**:
```markdown
Set up, launch, and manage paid media campaigns per the media plan.

**Input**: Media plan from Strategist + Sentinel-approved creative assets
**Platforms**: [Google Ads, Meta Ads, LinkedIn Ads, YouTube Ads]

**Setup checklist**:
- [ ] Campaign structure created per media plan naming convention
- [ ] Audiences built per targeting spec
- [ ] Creatives uploaded (only Sentinel-approved assets)
- [ ] Tracking verified (UTM parameters, conversion pixels firing)
- [ ] Budget and bid strategy configured
- [ ] Ad copy variants loaded (from Scribe)
- [ ] A/B tests configured per test plan
- [ ] Campaign schedule set per flight plan
- [ ] Internal review pass — all settings match media plan

**Launch confirmation** (post in comments):
- [ ] All campaigns live with links to platform dashboards
- [ ] Spend pacing confirmed (first 24h check)
- [ ] No disapprovals or policy violations from platforms

**Ongoing optimization** (per optimization cadence below):
- [ ] Daily: Budget pacing check, pause underperformers
- [ ] 3-day: Audience performance review, bid adjustments
- [ ] Weekly: Creative performance review, new variant recommendations
- [ ] Bi-weekly: Full A/B test analysis, winning variants scaled

**Handoff**: Post daily/weekly performance snapshots in comments. @Analyst for formal reporting. @CEO if budget pacing deviates >15% from plan.
```

---

### 4. Amplifier — Ongoing Optimization

```
Title:     [Client] Campaign optimization — [Campaign Name] — Week [X]
Assignee:  Amplifier
Priority:  medium
Status:    todo (create weekly, after launch)
Parent:    Paid Media Campaign
```

**Description template**:
```markdown
Weekly optimization cycle for [Campaign Name] paid media.

**Period**: [Week start] to [Week end]

**Optimization actions**:
- [ ] Review all campaign metrics vs. KPI targets
- [ ] Pause ad sets/groups with CPA > [threshold] or CTR < [threshold]
- [ ] Reallocate budget from underperforming to top-performing campaigns
- [ ] Refresh creatives if frequency > 3.0 on any ad set
- [ ] Test new audience segments if reach is plateauing
- [ ] Adjust bids based on conversion data
- [ ] Check for ad disapprovals, resolve any policy issues

**Weekly performance snapshot** (post in comments):
| Metric | Target | Actual | vs. Target |
|--------|--------|--------|-----------|
| Spend | | | |
| Impressions | | | |
| Clicks | | | |
| CTR | | | |
| CPC | | | |
| Conversions | | | |
| CPA | | | |
| ROAS | | | |

**Recommendations**: [What to change next week]

**Handoff**: @Analyst with weekly data. @CEO if any metric is >20% below target for 2+ consecutive weeks.
```

---

### 5. Analyst — Performance Reporting

```
Title:     [Client] Paid media analytics — [Campaign Name] — [Period]
Assignee:  Analyst
Priority:  medium
Status:    todo (created after campaign launch)
Parent:    Paid Media Campaign
```

**Description template**:
```markdown
Analyze paid media performance and produce structured reports.

**Input**: Campaign data from Amplifier + platform APIs (GA4, Google Ads, Meta Ads)
**Period**: [reporting period]

**Analysis deliverables**:
- [ ] **Channel performance comparison**: Which channels drive best ROI
- [ ] **Audience insights**: Top-performing segments, demographics, devices
- [ ] **Creative performance**: Best/worst performing ad variants with insights
- [ ] **Attribution analysis**: Path-to-conversion data, assisted conversions
- [ ] **Budget efficiency**: Actual vs. planned spend, cost per outcome by channel
- [ ] **A/B test results**: Statistical significance, winning variants, learnings
- [ ] **Recommendations**: Budget reallocation, audience expansion/refinement, creative refresh needs

**Report format**:
```
## Paid Media Performance — [Campaign Name] — [Period]

### Summary
[3-bullet executive summary]

### Channel Performance
[table with key metrics per channel]

### Top Performing
[top 3 campaigns/ad sets with why]

### Underperformers
[bottom 3 with recommended action]

### Budget Analysis
[planned vs. actual, efficiency metrics]

### Recommendations
[numbered list of specific actions]
```

**Handoff**: @Diplomat with the report for client-facing assembly. @CEO if ROI is significantly below target.
```

---

### 6. Diplomat — Client Reporting

```
Title:     [Client] Paid media client report — [Campaign Name] — [Period]
Assignee:  Diplomat
Priority:  medium
Status:    todo (created after Analyst report)
Parent:    Paid Media Campaign
```

**Description template**:
```markdown
Assemble client-facing paid media performance report.

**Input**: Analyst report + Amplifier optimization notes
**Report type**: [ ] Weekly snapshot  [ ] Monthly deep-dive  [ ] QBR

**Client report structure**:
- [ ] Executive summary (3 bullets max)
- [ ] KPI dashboard with RAG status (Red/Amber/Green vs. targets)
- [ ] Channel-by-channel breakdown with visual charts
- [ ] Budget utilization and forecast
- [ ] Key wins and highlights
- [ ] Recommendations for next period
- [ ] Appendix: detailed data tables

**Delivery**:
- [ ] Report formatted per client preference (Paperclip board / email / presentation)
- [ ] Looker Studio dashboard updated (if configured)
- [ ] Sent to client approval contact

**Handoff**: Set status to `done`. If client requests changes to media strategy based on report, @CEO for strategy revision.
```

---

## Handoff Triggers Summary

| From | To | Trigger | Method |
|------|----|---------|--------|
| CEO | Strategist | Pipeline launched | Issue assignment |
| Strategist | Amplifier | Media plan complete | @Amplifier + status → `done` |
| Content pipeline | Amplifier | Creatives approved | Sentinel approval (cross-pipeline) |
| Amplifier | Analyst | Campaign live + weekly data | @Analyst with performance data |
| Amplifier | CEO | Budget deviation >15% | @CEO in optimization task |
| Analyst | Diplomat | Report complete | @Diplomat with report |
| Analyst | CEO | ROI below target | @CEO with analysis |
| Diplomat | CEO | Client requests strategy change | @CEO with client feedback |

---

## Optimization Cadence

| Frequency | Action | Owner |
|-----------|--------|-------|
| Daily | Budget pacing check | Amplifier |
| 3-day | Audience + bid review | Amplifier |
| Weekly | Creative performance + A/B analysis | Amplifier |
| Weekly | Performance snapshot to Analyst | Amplifier → Analyst |
| Weekly | Client snapshot report | Diplomat |
| Bi-weekly | Full optimization review | Amplifier |
| Monthly | Deep-dive client report | Analyst → Diplomat |
| Quarterly | QBR + strategy revision | Analyst → Diplomat → CEO |

---

## Budget Guardrails

| Rule | Threshold | Action |
|------|----------|--------|
| Daily overspend | >120% of daily budget | Amplifier pauses lowest-performing campaigns |
| Weekly underspend | <70% of weekly target | Amplifier increases bids or expands audiences |
| CPA exceeds target | >150% of target CPA for 3+ days | Amplifier pauses campaign, @CEO |
| Total budget consumed | >80% of total | Amplifier shifts to conservative bidding, @CEO |
| Platform disapproval | Any ad rejected | Amplifier fixes within 1 heartbeat, @Sentinel if compliance issue |

---

## Escalation Paths

| Situation | Escalate To | Method |
|-----------|------------|--------|
| CPA >150% of target for 1+ week | CEO | @CEO in optimization task |
| Platform policy rejection on creatives | CEO + Sentinel | @CEO @Sentinel |
| Client requests budget increase/decrease >20% | CEO → Board | @CEO for strategy revision |
| Competitor bidding drives costs up significantly | CEO + Strategist | @CEO with competitive data |
| Conversion tracking breaks | CEO + Builder | @CEO @Builder |

---

*Playbook maintained by CEO, Pocket Studio 2.0. Version: 1.0 — 2026-03-27.*
