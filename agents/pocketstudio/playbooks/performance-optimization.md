# Performance Optimization & Model Right-Sizing — Pocket Studio 2.0

Version: 1.0
Last updated: 2026-03-27

## Current State

### Agent Roster: 18 agents (15 active, 3 pending approval)

| Agent | Model | Monthly Budget | Spend to Date | Role Type |
|-------|-------|---------------|--------------|-----------|
| CEO | claude-opus-4-6 | uncapped | $20.29 | Strategic |
| CTO | claude-opus-4-6 | $50.00 | $0.87 | Coordination |
| Strategist | claude-sonnet-4-6 | $60.00 | $0.87 | Strategic |
| Oracle-Market | claude-sonnet-4-6 | $40.00 | $2.33 | Research |
| Oracle-Pulse | claude-sonnet-4-6 | $30.00 | $0.84 | Research |
| Sentinel | claude-sonnet-4-6 | $35.00 | $5.71 | Compliance |
| Diplomat | claude-sonnet-4-6 | $35.00 | $1.28 | Communication |
| Scribe | claude-sonnet-4-6 | $40.00 | $4.45 | Creative |
| Builder | claude-sonnet-4-6 | $35.00 | $1.02 | Technical |
| Visualist | claude-sonnet-4-6 | $45.00 | $0.00 | Creative |
| Director | claude-sonnet-4-6 | $50.00 | $0.00 | Creative |
| Amplifier | claude-sonnet-4-6 | $45.00 | $0.00 | Operational |
| Broadcaster | claude-sonnet-4-6 | $30.00 | $0.00 | Operational |
| Analyst | claude-sonnet-4-6 | $35.00 | $0.00 | Analytical |
| Nexus | claude-sonnet-4-6 | $30.00 | $0.00 | Operational |
| Influencer | claude-sonnet-4-6 | $35.00 | $0.00 | Strategic |
| Publicist | claude-opus-4-6 | $50.00 | $0.00 | Creative |
| Engager | claude-sonnet-4-6 | $25.00 | $0.00 | Operational |
| Automator | claude-sonnet-4-6 | $40.00 | $0.00 | Operational |

### Current total monthly budget: $710/mo (excluding CEO)
### Blueprint target: $695/mo per client
### Overage: $15/mo (2.2% over target)

## Model Right-Sizing Recommendations

### Tier 1: Opus 4 (complex reasoning, strategy, nuanced judgment)
Cost: ~$15/M input, $75/M output tokens

| Agent | Current Model | Recommendation | Rationale |
|-------|--------------|----------------|-----------|
| CEO | opus-4-6 | Keep opus | Strategic decisions, board communication, budget governance |
| Publicist | opus-4-6 | **Downgrade to sonnet-4-6** | PR writing is high-quality but template-driven. Sonnet handles long-form copy well. |
| CTO | opus-4-6 | **Downgrade to sonnet-4-6** | Coordination and delegation tasks don't need Opus-level reasoning. Sonnet is sufficient for team management. |

**Savings from Opus downgrades**: CTO $50 → $40, Publicist $50 → $35. Estimated savings: **$25/mo**.

### Tier 2: Sonnet 4 (default for most agents)
Cost: ~$3/M input, $15/M output tokens

Keep on Sonnet (no change):
- Strategist, Oracle-Market, Oracle-Pulse, Sentinel, Diplomat, Scribe, Builder, Visualist, Director, Amplifier, Analyst, Influencer, Automator

### Tier 3: Haiku 4.5 (routine, template-driven, high-volume tasks)
Cost: ~$0.80/M input, $4/M output tokens

| Agent | Current Model | Recommendation | Rationale |
|-------|--------------|----------------|-----------|
| Broadcaster | sonnet-4-6 | **Downgrade to haiku-4-5** | Publishing scheduling and distribution is largely template-driven. |
| Engager | sonnet-4-6 | **Downgrade to haiku-4-5** | Community responses and comment moderation are high-volume, lower-complexity. |
| Nexus | sonnet-4-6 | **Downgrade to haiku-4-5** | CRM data operations and segmentation queries are structured/routine. |

**Savings from Haiku downgrades**: Broadcaster $30 → $15, Engager $25 → $12, Nexus $30 → $15. Estimated savings: **$43/mo**.

### Optimized Budget Summary

| Agent | Current Budget | Proposed Budget | Model | Change |
|-------|---------------|----------------|-------|--------|
| CEO | uncapped | uncapped | opus-4-6 | — |
| CTO | $50.00 | $40.00 | **sonnet-4-6** | -$10 |
| Strategist | $60.00 | $60.00 | sonnet-4-6 | — |
| Oracle-Market | $40.00 | $40.00 | sonnet-4-6 | — |
| Oracle-Pulse | $30.00 | $30.00 | sonnet-4-6 | — |
| Sentinel | $35.00 | $35.00 | sonnet-4-6 | — |
| Diplomat | $35.00 | $35.00 | sonnet-4-6 | — |
| Scribe | $40.00 | $40.00 | sonnet-4-6 | — |
| Builder | $35.00 | $35.00 | sonnet-4-6 | — |
| Visualist | $45.00 | $45.00 | sonnet-4-6 | — |
| Director | $50.00 | $45.00 | sonnet-4-6 | -$5 |
| Amplifier | $45.00 | $45.00 | sonnet-4-6 | — |
| Broadcaster | $30.00 | $15.00 | **haiku-4-5** | -$15 |
| Analyst | $35.00 | $35.00 | sonnet-4-6 | — |
| Nexus | $30.00 | $15.00 | **haiku-4-5** | -$15 |
| Influencer | $35.00 | $35.00 | sonnet-4-6 | — |
| Publicist | $50.00 | $35.00 | **sonnet-4-6** | -$15 |
| Engager | $25.00 | $12.00 | **haiku-4-5** | -$13 |
| Automator | $40.00 | $40.00 | sonnet-4-6 | — |
| **Total** | **$710.00** | **$637.00** | — | **-$73** |

### Result: $637/mo — 8.3% under the $695 target. $58/mo buffer for spikes.

## Additional Optimization Strategies

### 1. Prompt efficiency
- Keep agent prompts concise. Every 1,000 tokens of system prompt costs ~$3/month if the agent runs 1,000 times.
- Use structured output formats (tables, YAML) — they use fewer tokens than prose.
- Avoid repeating brand DNA in every prompt. Load it once per task, reference by field name.

### 2. Task batching
- Group similar tasks into single issues where possible (e.g., "Write 5 social posts" vs 5 separate issues).
- Reduces agent wake overhead (each heartbeat has fixed token cost for identity + context loading).

### 3. Caching and templates
- Pre-build output templates that agents fill in. Templates reduce creative token generation.
- Cache competitor analysis and market research — Oracle-Market and Oracle-Pulse should reference existing research before generating new.

### 4. Heartbeat interval tuning
- Non-urgent agents (Engager, Broadcaster, Nexus) can run on 7200s intervals instead of 3600s.
- Reduces unnecessary wake cycles and idle token spend.

### 5. Monitoring cadence
- **Weekly**: Analyst produces per-agent cost report.
- **Monthly**: CEO reviews agent utilization, identifies underused agents for budget reduction.
- **Quarterly**: Full model audit — test Haiku-tier agents on quality benchmarks, consider further downgrades or upgrades based on output quality data.

## Implementation Plan

1. **Immediate** (no risk): Update Broadcaster, Engager, Nexus to haiku-4-5 model. These agents have zero spend and no live campaigns yet — safe to test.
2. **After first client campaign**: Evaluate CTO and Publicist on sonnet-4-6. Monitor output quality for 2 weeks before committing.
3. **Monthly review**: Compare actual spend vs budget. Adjust up or down based on usage patterns.

## Risk: Quality Impact

| Downgrade | Risk Level | Mitigation |
|-----------|-----------|------------|
| Publicist opus → sonnet | Low | PR writing is structured. Sentinel still audits. Monitor first 5 press releases. |
| CTO opus → sonnet | Low | CTO does coordination, not creative work. Sonnet handles delegation well. |
| Broadcaster sonnet → haiku | Very Low | Distribution is scheduling + formatting. No creative judgment. |
| Engager sonnet → haiku | Low | Community responses are short-form. Sentinel audits for brand safety. |
| Nexus sonnet → haiku | Low | CRM operations are structured queries. No creative output. |
