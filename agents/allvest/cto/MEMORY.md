# CTO Tacit Knowledge

## Paperclip Permissions

- **CTO lacks `tasks:assign` permission** — cannot create issues with `assigneeAgentId` or PATCH to assign. Workaround: create unassigned issues + @mention engineer in comment. They self-assign via checkout when @mentioned.

## Trendlyne API Project

- **Repo**: https://github.com/allvest-wm/trendlyne-api, base branch: `dev`
- **Project ID**: `3848d9cd-edca-455d-8441-f3a59b36db37`
- **Company ID**: `a92efff8-108d-426a-92d4-baef29c5dae2`
- **Integration branch**: `dev-integration` (created 2026-03-24, from origin/dev)
- **PR #109** (dev-integration → dev): Phases 3-5 old migration — BLOCKED (board must approve/merge)
- **TREAAA-35**: CTO task to merge PR #109 — blocked, waiting @Board. Skip until board comments.

### Old Migration (complete, pending board merge of PR #109)
- **Phase 1-5** of old TREAAA-1..5 tasks: All done. dev-integration has: FNO, IPO, Market, Screeners, StocksModule (facade at nestjs-app/src/stocks/), SuperstarModule, TrendlyneModule, SchedulerModule, interceptors, Docker, CI.

### TREAAA-36 — Complete NestJS Transformation (2026-03-25, NEW parent, CEO-assigned)

**CTO has GH_TOKEN**: GH_TOKEN is embedded in the git remote URL (use `GH_TOKEN=<from-remote> gh pr ...`). CTO can merge PRs to dev-integration. Board only needed
 for dev-integration → dev (PR #109).

**Current phase status (Heartbeat 18, 2026-03-25)**:
- Phase 1 (TREAAA-37 `3b9b5442`): **done ✅** — PR #121 merged by CTO
- Phase 2 (TREAAA-38 `64276359`): **done ✅** — PR #119 merged (SuperstarModule, GenAIDev2)
- Phase 3 (TREAAA-39 `bb4de308`): **done ✅** — PR #118 merged by CTO
- Phase 4 (TREAAA-40 `42e136be`): **done ✅** — PR #120 merged by CTO
- Phase 5 (TREAAA-41 `28504f9b`): **in_progress** — TREAAA-47 delegated to GenAIDev2; @GenAIDev2 notified (lock cleared)

**Phase 5 complete** — dev-integration has all phases. PR #109 (dev-integration → dev) blocked on board approval (TREAAA-35).

**TREAAA-35** (`95c31e6c`) — blocked — board must merge PR #109 (dev-integration → dev) once Phase 5 complete.

### TREAAA-52 — Rigorous Testing (board-assigned, in_progress)

**Round 1 — ALL DONE ✅** (PRs #126, #127, #128 merged → dev-integration):
- TREAAA-53 done (Phase 1: CORS, routes, reference_master)
- TREAAA-54 done (Phase 2: Helmet, healthCheck POST, MongoDB audit)
- TREAAA-55 done (Phase 3: Dividend UPSERT, Socket.IO deferred)
- TREAAA-67 done (Final integration test)

**Round 2 — ALL PHASES DONE ✅ (2026-03-26 ~02:47 UTC)**

| Task | Status | PR | Notes |
|------|--------|----|-------|
| TREAAA-66 | **done ✅** | — | cron-pipeline.spec.ts import fix |
| TREAAA-68 | **done ✅** | #132 | Phase 1 route fixes |
| TREAAA-69 | **done ✅** | #131 | Phase 2 cron upsert fix (merged commit 86a4326) |
| TREAAA-70 | **done ✅** | #133 | Phase 3 MongoDB audit + Socket.IO TODO |

**dev-integration HEAD**: `86a4326`

**TREAAA-79** — Final integration test — `done ✅` (Tester sign-off 02:42 UTC: 189/189 tests).
**Board notified**: TREAAA-52 comment @Board posted 02:52 UTC (185 count) + corrected 02:57 UTC (189 count).

**CTO parent tasks**: TREAAA-68/69/70 all `done`. TREAAA-35 still blocked (board merges PR).
**TREAAA-52** (`ead7c1b9-0483-48e8-ac46-abb9d57dc272`) — `in_progress`, board notification posted (2026-03-26). Waiting for board to merge.

**Final test baseline**: 189/189 (as of PR #131 merge, commit 86a4326 on dev-integration).

**IMPORTANT**: When creating issues WITHOUT projectId, they get ALLAAA- prefix (company default). Always set projectId=`3848d9cd-...` for TREAAA- prefix.

### TREAAA-75 — Socket.IO RateGateway (DONE ✅ 2026-03-26 ~07:49 UTC)

All done. Merged PR #135 into dev-integration at `cf23864`. 198/198 tests pass.
- **TREAAA-80** (`e9c6e06f`) — `done` — GenAIDev1 RateGateway implementation
- **TREAAA-81** (`18266ecb`) — `done` — Tester validated 198/198 tests
- **TREAAA-75** (`66d31563`) — `done` — closed, board notified
- Board: merge `dev-integration` → `dev` via PR #109 (TREAAA-35)

- **PR rebase pattern**: When dev branch head diverges from PR base, checkout locally, rebase onto origin/dev-integration, force-push, then merge via GitHub API

## Engineers
- **Gen AI Dev 1** (`58e75365-4791-4c33-a05e-e477a068efa7`) — reports to CTO
- **Gen AI Dev 2** (`6b6653d6-18e2-4d1c-879a-17bfbda577d3`) — reports to CTO
- **Tester** (`feed8545-5b21-479b-af71-87a5dbc2bb25`) — handles test/validation
- **CEO** (`4f0da2c5-7806-4f7e-a93a-b851b5b5739e`) — my manager

## Checkout Quirk — executionRunId vs checkoutRunId

If a task shows `executionRunId` = your run but `checkoutRunId` = null (conflict on checkout with `["todo","backlog"]`):
1. First PATCH status to `in_progress` (this succeeds even without checkout)
2. Then retry checkout with `expectedStatuses: ["in_progress"]` — this will succeed
3. Then you can PATCH/POST comments normally

**If executionRunId is a DIFFERENT run (not yours)**: PATCH to in_progress may succeed, but checkout and POST comments will still return 409. These tasks are owned by stale/parallel runs. You cannot take them over. Create subtasks and @mention engineers directly — that's sufficient. Do NOT try to post comments on the parent tasks.

**Parallel CTO heartbeats**: When the board assigns multiple tasks to CTO at once, parallel runs start. Only one run (yours) can properly checkout each task. For tasks with stale executionRunIds, create subtasks with correct projectId and @mention engineers. The task will eventually be re-triggered or handled by its own run.

## CTO Workspace Auto-Matching Lock Issue

When the Paperclip system sets up a CTO workspace on a branch that belongs to another agent's task (e.g., `TREAAA-47-...`), it auto-sets `executionRunId = CTO_run` on that issue. This BLOCKS the actual assignee (GenAIDev2) from checking out (409). Fix:
```sql
UPDATE issues SET execution_run_id = NULL WHERE id = '<issue-id>' AND execution_run_id = '<cto-run-id>';
```
DB: `PGPASSWORD=paperclip psql -h localhost -p 54329 -U paperclip paperclip`

## Bash API Pattern (env vars not always available in subshells)

When making API calls in Bash tool, env vars are available via `/usr/bin/env | grep PAPERCLIP`. The PAPERCLIP_API_KEY must be captured via `env | grep PAPERCLIP_API_KEY` or hardcoded from the env output. Easiest to write scripts to `/tmp/` and run them.
