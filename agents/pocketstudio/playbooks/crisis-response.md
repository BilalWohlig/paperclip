# Pocket Studio 2.0 — Crisis Response Pipeline

> **Workflow**: Oracle-Pulse → Sentinel → CEO → Publicist (Phase 3) / Scribe + Diplomat
> **Trigger**: Oracle-Pulse detects a brand reputation threat (sentiment drop, viral negative mention, media crisis)
> **Owner**: CEO takes command; Oracle-Pulse monitors, Sentinel assesses, Scribe/Publicist draft responses, Diplomat manages client communication

---

## Overview

This playbook governs the agency's response when a client faces a brand reputation crisis — negative press, social media backlash, product controversy, regulatory action, or competitor attacks. Speed matters: the target is first-response messaging within 2 heartbeats of detection. The pipeline prioritizes containment first, then controlled narrative, then recovery.

**Phase 3 note**: Publicist (VP PR) is a Phase 3 hire. Until Publicist is active, Scribe handles crisis response copy and CEO manages media relations directly.

---

## Crisis Severity Levels

| Level | Definition | Example | Response Time Target |
|-------|-----------|---------|---------------------|
| **P1 — Critical** | Existential threat to brand. National media, regulatory action, safety issue. | Product recall, data breach, CEO scandal | Immediate — within 1 heartbeat |
| **P2 — High** | Significant reputation damage. Viral social media, regional media. | Customer injury report, service outage, offensive ad | Within 2 heartbeats |
| **P3 — Medium** | Contained negative attention. Localized backlash, unhappy influencer. | Bad review gone viral, competitor comparison ad | Within 4 heartbeats |
| **P4 — Low** | Minor negative sentiment. Isolated complaints, typical negative comments. | Single bad review, minor factual error in press | Next scheduled heartbeat |

---

## Prerequisites

For this pipeline to function:

- [ ] Oracle-Pulse configured with brand monitoring for the client (social listening, news alerts)
- [ ] Client escalation contacts defined in onboarding brief (Section 8)
- [ ] Pre-approved holding statement templates exist (see Appendix A below)
- [ ] Sentinel has client compliance context loaded (sector-specific rules)
- [ ] CEO has direct communication channel with the board for P1/P2 escalation

---

## Issue Tree Template

### 1. Parent Issue — Crisis Response

```
Title:     [CRISIS] [Client] — [Brief description] — [P1/P2/P3/P4]
Assignee:  CEO
Priority:  critical (P1/P2) or high (P3) or medium (P4)
Status:    in_progress
Parent:    Client project epic (or standalone if no active campaign)
```

**Description template**:
```markdown
## Crisis Detected

**Client**: [Client name]
**Severity**: [P1 / P2 / P3 / P4]
**Detected by**: Oracle-Pulse at [timestamp]
**Detection source**: [social media / news / review platform / regulatory filing]

**Summary**: [2-3 sentence description of what happened]

**Current impact**:
- Sentiment score: [current] (baseline: [normal])
- Volume of mentions: [count] in last [timeframe]
- Media coverage: [none / local / regional / national / international]
- Platforms affected: [list]

**Stakeholders notified**: [list who's been told so far]

## Response Plan
[To be filled by CEO after assessment]
```

---

### 2. Oracle-Pulse — Situation Monitoring

```
Title:     [CRISIS] [Client] Situation monitoring — ongoing
Assignee:  Oracle-Pulse
Priority:  critical
Status:    in_progress
Parent:    Crisis Response (above)
```

**Description template**:
```markdown
Continuous monitoring of the crisis situation.

**Monitoring scope**:
- [ ] Social media sentiment tracking (all platforms)
- [ ] News/media mention tracking
- [ ] Competitor response monitoring
- [ ] Influencer/KOL reaction tracking
- [ ] Comment volume and sentiment trend

**Update cadence**:
- P1/P2: Every heartbeat until stabilized
- P3/P4: Every 2 heartbeats

**Update format** (post in comments each cycle):
```
## Situation Update — [timestamp]

**Sentiment**: [score] ([direction] from last update)
**Mention volume**: [count] (last [period])
**Key developments**:
- [bullet points of new developments]

**Trending narratives**:
1. [what people are saying]
2. [what media is reporting]

**Risk assessment**: [escalating / stable / de-escalating]
```

**Handoff**: If situation escalates (sentiment drops further, national media picks up), @CEO immediately. If de-escalating, note it in update. Continue monitoring until CEO marks the crisis resolved.
```

---

### 3. Sentinel — Crisis Compliance Review

```
Title:     [CRISIS] [Client] Compliance review — crisis response messaging
Assignee:  Sentinel
Priority:  critical
Status:    todo
Parent:    Crisis Response
```

**Description template**:
```markdown
Review all crisis response messaging for compliance before publication.

**Context**: [Brief crisis summary — what happened, why we're responding]

**Compliance review scope**:
- [ ] Holding statement
- [ ] Social media responses
- [ ] Press statement / media response (if applicable)
- [ ] Client-approved talking points
- [ ] Revised/pulled content (if crisis was caused by our content)

**Crisis-specific compliance checks**:
- [ ] No admission of liability without client legal approval
- [ ] No speculation about causes or blame
- [ ] Factual accuracy of all claims in response
- [ ] Regulatory compliance (sector-specific — e.g., BFSI disclosures still required)
- [ ] Brand voice appropriate for crisis tone (empathetic, not defensive)
- [ ] No engagement with trolls or bad-faith actors
- [ ] Platform-specific policies met (no content that could be flagged/removed)

**Fast-track rule**: For P1/P2 crises, Sentinel must complete review within 1 heartbeat of receiving messaging. Flag compliance issues immediately — do not batch.

**Handoff**: Approved messaging → CEO for final sign-off → Scribe/Publicist for publication. Compliance issues → @CEO with specific concerns and recommended changes.
```

---

### 4. Scribe / Publicist — Crisis Messaging

```
Title:     [CRISIS] [Client] Response messaging — [type]
Assignee:  Scribe (Phase 1-2) or Publicist (Phase 3)
Priority:  critical
Status:    todo
Parent:    Crisis Response
```

**Description template**:
```markdown
Draft crisis response messaging per CEO direction.

**Crisis context**: [Brief summary]
**CEO direction**: [Key messages, tone, what to acknowledge, what to avoid]
**Client input**: [Any client-approved talking points or legal guidance]

**Deliverables**:
- [ ] **Holding statement** (immediate — within 30 min of CEO direction):
  "We are aware of [situation]. We are [action being taken]. [Empathy statement]. We will provide an update by [timeframe]."
- [ ] **Social media responses** (per-platform):
  - [ ] Template for direct replies to concerned users
  - [ ] Proactive statement post for each affected platform
  - [ ] DM templates for users who need direct support
- [ ] **Press/media statement** (P1/P2 only):
  - Official statement for media inquiries
  - Q&A preparation (anticipated questions + approved answers)
  - Spokesperson talking points
- [ ] **Internal brief** (for client's internal team):
  - What happened, what we're doing, what to say if asked
- [ ] **Recovery messaging** (post-crisis, when situation stabilizes):
  - Follow-up statement acknowledging resolution
  - "What we've done" accountability message
  - Return-to-normal content transition plan

**Tone guidance**:
- Empathetic, not defensive
- Factual, not speculative
- Accountable where appropriate
- Forward-looking (what we're doing to fix/prevent)

**Handoff**: All messaging → @Sentinel for compliance review before any publication. After Sentinel approval → CEO for final sign-off.
```

---

### 5. Diplomat — Client Communication

```
Title:     [CRISIS] [Client] Client communication — crisis update
Assignee:  Diplomat
Priority:  critical
Status:    todo
Parent:    Crisis Response
```

**Description template**:
```markdown
Manage client communication throughout the crisis.

**Client contacts**:
- Day-to-day: [from onboarding brief]
- Escalation: [from onboarding brief]
- Legal (if applicable): [from client]

**Communication cadence**:
- P1: Update client every heartbeat (or sooner if situation changes)
- P2: Update every 2 heartbeats
- P3/P4: Update at detection, midpoint, and resolution

**Communication log** (update in comments):

| Timestamp | Channel | Recipient | Summary | Response |
|-----------|---------|-----------|---------|----------|
| | | | | |

**Deliverables**:
- [ ] Initial notification to client (within 1 heartbeat of detection)
- [ ] Regular situation updates per cadence
- [ ] Client approval requests for any public statements
- [ ] Post-crisis debrief summary
- [ ] Recommendations for preventing recurrence

**Handoff**: Client feedback/direction → @CEO. Legal concerns → @CEO for board escalation. Resolution confirmation → @CEO to close the crisis.
```

---

## Crisis Response Timeline

### Phase 1: Detection & Assessment (Heartbeat 0)

1. **Oracle-Pulse** detects anomaly (sentiment drop, viral mention, media alert)
2. Oracle-Pulse creates the crisis parent issue and assigns to CEO
3. Oracle-Pulse posts initial situation assessment
4. CEO assesses severity (P1-P4) and updates issue priority

### Phase 2: Containment (Heartbeat 1)

5. CEO creates subtasks for Sentinel, Scribe/Publicist, Diplomat
6. CEO provides messaging direction to Scribe/Publicist
7. Scribe/Publicist drafts holding statement
8. Sentinel fast-tracks compliance review of holding statement
9. CEO approves and directs publication of holding statement
10. Diplomat notifies client
11. **If content we produced caused the crisis**: CEO directs Broadcaster to pull/pause affected content immediately

### Phase 3: Controlled Response (Heartbeats 2-3)

12. Scribe/Publicist produces full response messaging suite
13. Sentinel reviews all messaging
14. CEO approves final messaging
15. Broadcaster (or CEO manually) publishes approved responses
16. Oracle-Pulse continues monitoring, reports on response effectiveness
17. Diplomat provides client with updates

### Phase 4: Recovery (Heartbeats 4+)

18. Oracle-Pulse confirms sentiment stabilizing/recovering
19. Scribe/Publicist drafts recovery messaging
20. Normal content pipeline resumes with sensitivity adjustments
21. Analyst produces crisis impact report (reach, sentiment, follower changes)
22. Diplomat delivers post-crisis debrief to client
23. CEO closes crisis issue, documents learnings

---

## Handoff Triggers Summary

| From | To | Trigger | Method |
|------|----|---------|--------|
| Oracle-Pulse | CEO | Crisis detected | Issue creation + @CEO |
| CEO | All crisis agents | Severity assessed | Subtask creation |
| CEO | Scribe/Publicist | Messaging direction given | Issue assignment + comment |
| Scribe/Publicist | Sentinel | Draft ready | @Sentinel + status → `in_review` |
| Sentinel | CEO | Review complete | @CEO with verdict |
| CEO | Broadcaster | Messaging approved | @Broadcaster (or direct publish for P1) |
| Oracle-Pulse | CEO | Situation escalation | @CEO in monitoring task |
| Diplomat | CEO | Client feedback/direction | @CEO in client communication task |
| Analyst | Diplomat | Impact report ready | @Diplomat for client debrief |
| CEO | All | Crisis resolved | Close all crisis subtasks |

---

## Escalation Paths

| Situation | Escalate To | Method |
|-----------|------------|--------|
| P1 crisis detected | CEO + Board | @CEO, CEO escalates to board immediately |
| Legal liability risk | CEO → Board | CEO creates board escalation issue |
| Client demands response CEO disagrees with | Board | CEO consults board before publishing |
| Crisis caused by our content | CEO + Sentinel | Review how it passed compliance |
| Media requesting comment | CEO (Phase 1-2) / Publicist (Phase 3) | @CEO or @Publicist |
| Crisis expands to multiple clients | Board | CEO flags cross-client impact |

---

## Appendix A: Holding Statement Templates

### Template 1 — General Incident
```
We are aware of [brief, factual description of the situation]. We take this matter seriously and are actively [investigating / addressing / reviewing] the circumstances. [Empathy statement appropriate to the situation]. We will share a further update by [specific timeframe — e.g., end of day, within 24 hours].
```

### Template 2 — Product/Service Issue
```
We have been made aware of [issue] affecting [product/service]. The safety and satisfaction of our customers is our top priority. We are working to [action] and will communicate next steps by [timeframe]. Customers who have been affected can [contact method / support channel].
```

### Template 3 — Social Media Backlash (Our Content)
```
We hear you, and we appreciate the feedback on our recent [post/campaign/ad]. We are reviewing the content and will respond thoughtfully. Our intention was [brief context if appropriate]. We are committed to [brand value relevant to the situation].
```

### Template 4 — Third-Party/External Event
```
We are monitoring [the situation / reports regarding X]. While [we are not directly involved / this is outside our control], we want our community to know that [reassurance statement]. We will provide updates as we learn more.
```

---

*Playbook maintained by CEO, Pocket Studio 2.0. Version: 1.0 — 2026-03-27.*
*Phase 3 update pending: Publicist agent will assume primary crisis PR responsibilities once hired.*
