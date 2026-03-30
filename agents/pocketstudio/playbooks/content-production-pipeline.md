# Pocket Studio 2.0 — Content Production Pipeline

> **Workflow**: Strategist → Scribe → Visualist → Director → Sentinel → Broadcaster
> **Trigger**: Board-approved campaign strategy exists (Gate 1 cleared)
> **Owner**: CEO orchestrates; individual agents execute their stages

---

## Overview

This playbook automates the multi-agent content production pipeline from approved strategy to published content. The CEO creates the issue tree below. Each agent completes their stage, tags the next agent via @-mention, and the pipeline flows forward. Sentinel is the hard gate — nothing reaches Broadcaster without Sentinel approval.

---

## Prerequisites

Before launching this pipeline:

- [ ] Campaign strategy approved (Gate 1 cleared — see `campaign-workflow.md`)
- [ ] Client onboarding brief completed (see `client-onboarding-brief.md`)
- [ ] Content calendar defined in the strategy document (channels, dates, formats)
- [ ] Brand guidelines loaded into Sentinel's compliance context

---

## Issue Tree Template

CEO creates the following issues in Paperclip. All issues share the same `projectId` and `goalId` (the campaign goal). The parent issue is the campaign epic.

### 1. Parent Issue — Content Production Batch

```
Title:     [Client] Content Production — [Campaign Name] — [Month/Sprint]
Assignee:  CEO
Priority:  high
Status:    in_progress
Parent:    Campaign epic issue
```

**Description template**:
```markdown
Content production batch for [Campaign Name].

**Strategy**: [link to approved strategy issue]
**Content calendar**: [link or inline summary]
**Channels**: [Instagram, LinkedIn, Blog, Email, YouTube — per strategy]
**Total deliverables**: [X social posts, Y blog articles, Z email sequences, W video scripts]

Workflow: Strategist brief → Scribe (copy) → Visualist (design) → Director (video) → Sentinel (compliance) → Broadcaster (publish)
```

---

### 2. Strategist — Creative Brief

```
Title:     [Client] Creative brief — [Campaign Name]
Assignee:  Strategist
Priority:  high
Status:    todo
Parent:    Content Production Batch (above)
```

**Description template**:
```markdown
Produce creative briefs for each content piece in this production batch.

**Input**: Approved campaign strategy at [link]
**Output**: Per-channel creative briefs with:
- Key message / hook
- CTA
- Target audience segment
- Tone direction
- Format specs (dimensions, duration, word count)
- Reference materials / mood board notes

**Deliverables**:
- [ ] Social posts brief (Instagram + LinkedIn + X)
- [ ] Blog articles brief
- [ ] Email sequences brief
- [ ] Video/audio brief (if applicable)

**Handoff**: When complete, comment on each downstream task (@Scribe, @Visualist, @Director) with the relevant brief section. Set this task to `done`.
```

---

### 3. Scribe — Copy Production

```
Title:     [Client] Copy production — [Campaign Name]
Assignee:  Scribe
Priority:  high
Status:    todo (blocked until Strategist brief is done)
Parent:    Content Production Batch
```

**Description template**:
```markdown
Produce all text/copy deliverables for this campaign batch.

**Input**: Creative brief from Strategist (will be posted in comments)
**Brand voice**: [reference client brand guidelines]

**Deliverables**:
- [ ] Instagram captions ([X] posts)
- [ ] LinkedIn posts ([X] posts)
- [ ] Blog articles ([X] articles, [word count] each)
- [ ] Email sequences ([X] emails)
- [ ] Ad copy variants ([X] variants per platform)
- [ ] Video scripts ([X] scripts — hand off to Director)

**Quality checklist** (self-check before submitting):
- [ ] Brand voice consistent with onboarding brief
- [ ] No unsubstantiated claims
- [ ] CTAs clear and aligned with campaign KPIs
- [ ] SEO keywords incorporated (blog + web copy)
- [ ] Platform-specific formatting (hashtags, character limits, etc.)

**Handoff**: When complete, @Sentinel for compliance audit. Attach all copy in a structured comment (one section per channel). Set status to `in_review`.
```

---

### 4. Visualist — Design Production

```
Title:     [Client] Visual design — [Campaign Name]
Assignee:  Visualist
Priority:  high
Status:    todo (blocked until Strategist brief is done)
Parent:    Content Production Batch
```

**Description template**:
```markdown
Produce all visual assets for this campaign batch.

**Input**: Creative brief from Strategist + final copy from Scribe
**Brand guidelines**: [reference client brand colors, fonts, logo]

**Deliverables**:
- [ ] Instagram post graphics ([X] static, [X] carousel)
- [ ] Instagram story graphics ([X] stories)
- [ ] LinkedIn post graphics ([X] graphics)
- [ ] Blog header images ([X] images)
- [ ] Email header/banner graphics ([X] graphics)
- [ ] Ad creatives ([X] variants, per-platform sizes)

**Format specs**:
| Platform | Format | Dimensions |
|----------|--------|-----------|
| Instagram Feed | JPG/PNG | 1080×1080, 1080×1350 |
| Instagram Story | JPG/PNG | 1080×1920 |
| LinkedIn | JPG/PNG | 1200×627 |
| Blog | JPG/PNG | 1200×630 |
| Email | JPG/PNG | 600×200 (header) |

**Quality checklist**:
- [ ] Brand colors and fonts used correctly
- [ ] Logo placement per brand guidelines
- [ ] Text legible at mobile sizes
- [ ] No stock photo watermarks
- [ ] Alt text written for accessibility

**Handoff**: When complete, @Sentinel for compliance audit. Set status to `in_review`.
```

---

### 5. Director — Video/Audio Production

```
Title:     [Client] Video/audio production — [Campaign Name]
Assignee:  Director
Priority:  medium
Status:    todo (blocked until Scribe provides scripts)
Parent:    Content Production Batch
```

**Description template**:
```markdown
Produce all video and audio deliverables for this campaign batch.

**Input**: Video scripts from Scribe + creative brief from Strategist
**Brand guidelines**: [reference brand voice, visual identity]

**Deliverables**:
- [ ] Short-form video ([X] Reels/Shorts, 15-60s each)
- [ ] Long-form video ([X] YouTube videos, [duration] each)
- [ ] Podcast episode ([X] episodes, if applicable)
- [ ] Voiceover files ([X] files via ElevenLabs)

**Tools**: Runway ML (video), ElevenLabs (voice), Descript (editing)

**Quality checklist**:
- [ ] Audio clear, no background noise
- [ ] Subtitles/captions included
- [ ] Brand intro/outro present
- [ ] CTA visible in final 5 seconds
- [ ] Aspect ratios correct per platform

**Handoff**: When complete, @Sentinel for compliance audit. Set status to `in_review`.
```

---

### 6. Sentinel — Compliance Audit

```
Title:     [Client] Compliance audit — [Campaign Name]
Assignee:  Sentinel
Priority:  critical
Status:    todo (blocked until production tasks are in_review)
Parent:    Content Production Batch
```

**Description template**:
```markdown
Compliance audit for all creative assets in this production batch.

**Audit scope**:
- [ ] Copy (from Scribe) — [link to Scribe task]
- [ ] Visuals (from Visualist) — [link to Visualist task]
- [ ] Video/audio (from Director) — [link to Director task]

**Compliance standards**:
- ASCI (all clients)
- [Sector-specific]: [BFSI / FSSAI / RERA / CDSCO — per client]
- Brand DNA (per onboarding brief)

**Audit checklist per asset**:
- [ ] No misleading claims or exaggerations
- [ ] Required disclaimers present (sector-specific)
- [ ] Influencer content tagged #ad / #sponsored where applicable
- [ ] No content targeting children for adult products
- [ ] Brand voice and visual identity consistent
- [ ] Legal copy / T&C included where required
- [ ] Platform-specific ad policies met (Meta, Google, LinkedIn)

**Verdicts** (post per asset batch):
- **APPROVED** — assets proceed to Broadcaster
- **NEEDS REVISION** — create revision subtask with specific changes, @-mention the production agent
- **REJECTED** — escalate to CEO, assets scrapped

**Handoff**: For approved assets, @Broadcaster with the approved asset list. For revisions, @-mention the relevant production agent. Set this task to `done` when all assets have a final verdict.
```

---

### 7. Broadcaster — Distribution

```
Title:     [Client] Content distribution — [Campaign Name]
Assignee:  Broadcaster
Priority:  high
Status:    todo (blocked until Sentinel approves assets)
Parent:    Content Production Batch
```

**Description template**:
```markdown
Publish all Sentinel-approved assets per the content calendar.

**Input**: Approved assets from Sentinel — [link to compliance audit task]
**Content calendar**: [link or inline schedule]

**Publishing schedule**:
| Date | Channel | Content | Time (IST) |
|------|---------|---------|------------|
| | | | |

**Distribution checklist**:
- [ ] All posts scheduled per content calendar
- [ ] Hashtags applied per strategy
- [ ] UTM parameters added to all links
- [ ] Cross-platform consistency verified
- [ ] Post previews reviewed (no broken images/links)

**Post-publish**:
- [ ] Confirm publication with links + timestamps in comment
- [ ] Flag any platform rejections or errors immediately (@CEO)

**Handoff**: When all content is published, set status to `done`. @Analyst for performance tracking setup. @Diplomat for client notification.
```

---

## Handoff Triggers Summary

| From | To | Trigger | Method |
|------|----|---------|--------|
| CEO | Strategist | Pipeline launched | Issue assignment |
| Strategist | Scribe, Visualist, Director | Brief complete | @-mention in comments on each task |
| Scribe | Sentinel | Copy complete | @Sentinel + status → `in_review` |
| Scribe | Director | Scripts ready | @Director in comments |
| Visualist | Sentinel | Designs complete | @Sentinel + status → `in_review` |
| Director | Sentinel | Video/audio complete | @Sentinel + status → `in_review` |
| Sentinel | Production agent | Needs revision | Revision subtask + @-mention |
| Sentinel | Broadcaster | Assets approved | @Broadcaster + approved asset list |
| Broadcaster | Analyst | Content published | @Analyst + links/timestamps |
| Broadcaster | Diplomat | Content published | @Diplomat for client notification |

---

## Timing Expectations

| Stage | Expected Duration | Notes |
|-------|------------------|-------|
| Creative brief | 1 heartbeat | Strategist extracts from approved strategy |
| Copy production | 1-2 heartbeats | Depends on volume |
| Visual design | 1-2 heartbeats | Can run in parallel with copy |
| Video/audio | 2-3 heartbeats | Depends on scripts from Scribe |
| Compliance audit | 1 heartbeat | Per asset batch |
| Revision cycle | 1 heartbeat per round | Target max 2 rounds |
| Distribution | 1 heartbeat | Scheduling + publishing |
| **Total pipeline** | **4-8 heartbeats** | **Parallel paths reduce total time** |

---

## Escalation Paths

| Situation | Escalate To | Method |
|-----------|------------|--------|
| Sentinel rejects assets (fundamental failure) | CEO | @CEO in compliance task |
| Production agent unresponsive for 2+ heartbeats | CEO | Dashboard stale task detection |
| Client requests mid-production strategy change | CEO → Board | CEO comments on campaign epic |
| Platform rejects published content | CEO + Sentinel | @CEO @Sentinel in distribution task |
| Budget overrun on production | CEO | @CEO with cost breakdown |

---

## Parallelism Notes

- **Scribe and Visualist** can work in parallel once the creative brief is ready. Visualist can start with brief direction and refine once final copy arrives.
- **Director** depends on Scribe for scripts, so runs sequentially after Scribe.
- **Sentinel** can audit copy and visuals in separate passes, or wait for all assets and audit in one batch. Batch audit is preferred for efficiency.
- **Broadcaster** is strictly sequential after Sentinel approval.

---

*Playbook maintained by CEO, Pocket Studio 2.0. Version: 1.0 — 2026-03-27.*
