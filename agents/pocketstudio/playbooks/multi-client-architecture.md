# Multi-Client Architecture — Pocket Studio 2.0

Version: 1.0
Last updated: 2026-03-27

## Overview

Pocket Studio operates as a shared-agent digital agency on Paperclip. All 18 agents are company-level resources that serve multiple clients. Client isolation is achieved through Paperclip's **project** and **billing code** primitives — not by duplicating agents per client.

## Architecture Principles

1. **Shared agents, isolated workflows.** Every agent exists once in the Pocket Studio company. Each client gets a dedicated Paperclip project. Work is routed via task assignment, not agent duplication.
2. **Billing code isolation.** Every task created for a client carries a `billingCode` matching the client project prefix. This enables per-client cost tracking and budget enforcement.
3. **Brand DNA as configuration.** Client-specific brand guidelines (voice, visual identity, compliance rules) are stored as structured config files in the project workspace — agents load them at task time, not at boot time.
4. **Approval gates per client.** Both mandatory gates (strategy approval, creative approval) run per-client with client-specific reviewers and compliance rules.
5. **Budget caps per client.** Each client project has a monthly LLM spend target. The CEO monitors aggregate spend; Analyst tracks per-client cost efficiency.

## Project Structure

```
Paperclip Company: Pocket Studio 2.0
├── Project: [Client A]         (prefix: CLTA)
│   ├── Workspace: { cwd: "clients/client-a", repoUrl: "..." }
│   ├── Brand DNA: clients/client-a/brand-dna.yaml
│   ├── Campaign issues (CLTA-1, CLTA-2, ...)
│   └── Approval gates (strategy + creative per campaign)
│
├── Project: [Client B]         (prefix: CLTB)
│   ├── Workspace: { cwd: "clients/client-b", repoUrl: "..." }
│   ├── Brand DNA: clients/client-b/brand-dna.yaml
│   ├── Campaign issues (CLTB-1, CLTB-2, ...)
│   └── Approval gates
│
├── Project: Pocket Studio 2.0  (prefix: POCA) — internal ops
│   └── Agency infrastructure, hiring, playbooks
│
└── Agents (shared across all projects)
    ├── CEO, CTO, Strategist, Oracle-Market, Oracle-Pulse, ...
    └── All 18 agents serve all client projects
```

## Client Onboarding Process

### Step 1: Create client project

```
POST /api/companies/{companyId}/projects
{
  "name": "[Client Name]",
  "description": "Digital marketing for [Client Name]",
  "workspace": {
    "cwd": "clients/[client-slug]"
  }
}
```

### Step 2: Set up brand DNA file

Create `clients/[client-slug]/brand-dna.yaml`:

```yaml
client:
  name: "[Client Name]"
  industry: "[e.g., BFSI, FMCG, Tech]"
  regulatory_sector: "[BFSI, FSSAI, RERA, or none]"

brand_voice:
  tone: "[e.g., professional, approachable, bold]"
  language: "[e.g., English, Hindi-English code-switch]"
  formality: "[formal, semi-formal, casual]"
  personality_traits: ["trustworthy", "innovative", "warm"]
  avoid: ["jargon", "aggressive sales language"]

visual_identity:
  primary_colors: ["#hex1", "#hex2"]
  secondary_colors: ["#hex3", "#hex4"]
  fonts:
    heading: "[Font Name]"
    body: "[Font Name]"
  logo_url: "[path or URL]"
  style: "[minimalist, bold, corporate, playful]"

compliance:
  asci_sectors: ["BFSI"]  # triggers sector-specific Sentinel rules
  mandatory_disclaimers:
    - "Mutual fund investments are subject to market risks."
  prohibited_claims: []
  required_disclosures: []

approval_config:
  strategy_approver: "board"    # or specific user ID
  creative_approver: "board"
  requires_client_sign_off: true

budget:
  monthly_llm_target_cents: 69500  # $695/mo
  alert_threshold_percent: 80
```

### Step 3: Create initial campaign epic

```
POST /api/companies/{companyId}/issues
{
  "title": "[Client Name] — [Campaign Name]",
  "projectId": "[client-project-id]",
  "billingCode": "[CLIENT_PREFIX]",
  "assigneeAgentId": "[strategist-id]",
  "priority": "high"
}
```

### Step 4: Brief intake via Diplomat

Diplomat receives the client brief (using `client-onboarding-brief.md` template), enriches it with brand DNA from the project workspace, and creates the campaign epic with all required metadata.

## Task Routing

All tasks for a client MUST include:
- `projectId`: the client's Paperclip project ID
- `billingCode`: the client's project prefix (e.g., `CLTA`)

Agents determine which brand DNA to load by reading the task's `projectId` → project workspace → `brand-dna.yaml`.

### Agent Task Flow

```
1. Agent receives task assignment
2. Agent reads task → gets projectId
3. Agent reads project workspace config → gets cwd
4. Agent reads {cwd}/brand-dna.yaml → loads client context
5. Agent produces output aligned to client brand
6. Sentinel validates against client-specific compliance rules
```

## Budget Tracking

### Per-client cost tracking

Every task carries a `billingCode`. The system tracks LLM spend per billing code, enabling:
- Per-client monthly cost reports
- Budget alerts when a client exceeds 80% of target
- Cross-client cost comparison for pricing optimization

### Budget monitoring cadence

| Actor | Frequency | Action |
|-------|-----------|--------|
| CEO | Every heartbeat | Check dashboard aggregate spend |
| Analyst | Weekly | Produce per-client cost report |
| CEO | Monthly | Review per-client P&L, adjust pricing or capacity |

### Cost optimization levers

1. **Model right-sizing**: Routine tasks (scheduling, formatting) use Haiku 4.5. Strategic tasks (campaign planning, compliance) use Sonnet/Opus.
2. **Task batching**: Group similar tasks to reduce agent wake overhead.
3. **Template reuse**: Standard templates (ad copy variants, report formats) reduce per-task token usage.
4. **Client tiering**: Premium clients get Opus-tier agents for strategy. Standard clients use Sonnet across the board.

## Capacity Planning

### Agent concurrency

Each agent serves one task at a time (single heartbeat). With 18 agents and ~3600s heartbeat intervals:
- **Maximum throughput**: ~18 tasks per heartbeat cycle
- **Sustained daily capacity**: ~432 task completions/day (assuming 24 cycles)

### Client capacity limits

| Clients | Tasks/Client/Day | Total Daily Tasks | Feasible? |
|---------|-----------------|-------------------|-----------|
| 1 | 30 | 30 | Yes |
| 2 | 20 | 40 | Yes |
| 3 | 15 | 45 | Yes |
| 5 | 10 | 50 | Yes (light campaigns) |
| 10 | 5 | 50 | Marginal (retainer-only) |

### Scaling triggers

- **Add clients**: If daily task queue exceeds 80% of capacity for 3+ consecutive days.
- **Add agents**: When specific roles (Scribe, Amplifier) become bottlenecks across clients.
- **Upgrade models**: When task quality drops due to model constraints.

## Cross-Client Isolation

### What is isolated per client
- Paperclip project (issues, comments, approval history)
- Brand DNA configuration
- Campaign assets and deliverables
- Budget tracking (via billing code)
- Approval gates and reviewers

### What is shared across clients
- Agent instances (same 18 agents serve all clients)
- Playbook templates (campaign-workflow, content-production-pipeline, etc.)
- Sentinel compliance rules (base ASCI rules are universal; sector-specific rules loaded from brand DNA)
- Agent prompt files (AGENTS.md) — agents are role-generic, client context comes from brand DNA

### Data separation rules
- Agents MUST NOT reference one client's data when working on another client's task.
- Brand DNA files are per-client and stored in isolated workspace directories.
- Campaign performance data is per-project. Analyst produces per-client reports, never cross-client reports (unless CEO requests benchmarking).

## Client Offboarding

1. Complete all in-progress campaigns.
2. Produce final performance report via Analyst.
3. Archive the client project in Paperclip (set status to archived).
4. Retain brand DNA and campaign data for 90 days, then delete.
5. Update budget allocations across remaining clients.
