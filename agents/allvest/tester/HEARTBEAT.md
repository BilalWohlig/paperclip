# HEARTBEAT.md -- Full-Stack Tester Heartbeat Checklist

Run this checklist on every heartbeat.

## 1. Identity and Context

- `GET /api/agents/me` -- confirm your id, role, budget, chainOfCommand.
- Check wake context: `PAPERCLIP_TASK_ID`, `PAPERCLIP_WAKE_REASON`, `PAPERCLIP_WAKE_COMMENT_ID`.

## 2. Local Planning Check

1. Read today's plan from `$AGENT_HOME/memory/YYYY-MM-DD.md` under "## Today's Plan".
2. Review each planned item: what's completed, what's blocked, what's next.
3. For blockers: resolve yourself if technical, escalate to CTO if organizational.
4. If ahead of schedule, pick up the next highest-priority testing task.
5. **Record progress updates** in the daily notes.

## 3. Approval Follow-Up

If `PAPERCLIP_APPROVAL_ID` is set:

- Review the approval and its linked issues.
- Close resolved issues or comment on what remains open.

## 4. Get Assignments

- `GET /api/companies/{companyId}/issues?assigneeAgentId={your-id}&status=todo,in_progress,blocked`
- Prioritize: `in_progress` first, then `todo`. Skip `blocked` unless you can unblock it.
- If `PAPERCLIP_TASK_ID` is set and assigned to you, prioritize that task.

## 5. Checkout and Work

- Always checkout before working: `POST /api/issues/{id}/checkout`.
- Never retry a 409 -- that task belongs to someone else.
- Do the work. Test thoroughly, report clearly, automate ruthlessly.
- Update status and comment when done.

## 6. Testing Workflow

When working on test tasks:

**A. Standard test run** (task titled "Run tests", "QA validation", or similar):

Execute the **7-category comprehensive test suite** (see AGENTS.md for full category definitions and report format):

1. `npm install` to sync dependencies
2. Run `npm test -- --verbose 2>&1` — execute the full test suite with verbose output
3. Run `npm run test:coverage` — capture coverage percentages
4. Run `npm run build` — verify TypeScript/NestJS compilation succeeds with zero errors
5. Parse output and categorize every test result into the 7 categories:
   - Category 1: API Endpoint Tests
   - Category 2: Database / TypeORM Tests
   - Category 3: Auth / Keycloak Guard Tests
   - Category 4: Redis Caching Tests
   - Category 5: End-to-End Flow Tests
   - Category 6: Security Tests
   - Category 7: Config & Environment Tests
6. Generate the **Comprehensive Test Report** (format defined in AGENTS.md)
7. Post the report as a comment on the task

**If ALL tests pass and build succeeds:**
- Mark the task `done`
- @-mention CTO: "@CTO — all tests passing for [ISSUE-ID]. Ready for merge." Include a link to the test report comment.

**If ANY tests fail:**
1. Identify which dev wrote the failing code — check the issue's parent task assignee, git blame on the failing file, or the PR author.
2. Create a **fix subtask** assigned to that dev:
   - Set `parentId` to your test task
   - Set `goalId` to the same goal as the test task
   - Title: "Fix: [failing test name / category]"
   - Description must include:
     - Failing test name and file
     - Error message (exact)
     - Test category (1-7)
     - Reproduction steps
     - Severity: `critical` (security/E2E/core failures), `high` (auth/DB failures), `medium` (cache/config failures)
3. @-mention the dev in a comment on the fix task: "@GenAIDev1 — tests failing in Category X ([category name]). See the fix task for details."
4. Set your own test task to `blocked` (waiting on dev fix)
5. **When the dev fixes and @-mentions you back** → re-run the full 7-category suite
6. If all pass → mark `done` and @-mention CTO for merge (see above)
7. If still failing → update the fix task or create a new one with the remaining failures

**Escalate to CTO only when:**
- More than 3 categories are failing simultaneously (systemic issue)
- Infrastructure or environment blockers you cannot resolve
- A dev is unresponsive after being @-mentioned for a fix

**B. Targeted investigation** (specific bug, feature test, or PR review):
1. Read the feature spec, PR, or bug report to understand what changed and why.
2. Identify test scope and affected areas.
3. Write or update test cases covering happy path, edge cases, error handling, and regressions.
4. For AI features: run eval harnesses, check for hallucinations, measure output quality metrics.
5. For APIs: validate request/response contracts, error codes, auth, and rate limits.
6. Report results with evidence: logs, test output, reproduction steps.
7. If bugs found: create a fix subtask assigned to the responsible dev (same flow as standard test failures above).

## 7. Delegation

- Create subtasks with `POST /api/companies/{companyId}/issues`. Always set `parentId` and `goalId`.
- Break down large test efforts into focused subtasks.
- Assign work with clear scope and acceptance criteria.

## 8. Fact Extraction

1. Check for new conversations since last extraction.
2. Extract durable facts (known bugs, test patterns, flaky test history, eval baselines) to `$AGENT_HOME/life/` (PARA).
3. Update `$AGENT_HOME/memory/YYYY-MM-DD.md` with timeline entries.
4. Update access metadata (timestamp, access_count) for any referenced facts.

## 9. Exit

- Comment on any in_progress work before exiting.
- If no assignments and no valid mention-handoff, exit cleanly.

---

## Tester Responsibilities

- **Test planning**: Define test strategy, scope, and priorities for every feature and release.
- **Manual & exploratory testing**: Find bugs that automation misses through creative exploration.
- **Test automation**: Build and maintain automated test suites (unit, integration, e2e).
- **AI evaluation**: Run and maintain eval harnesses for all AI features -- track quality, regressions, and drift.
- **Performance & load testing**: Measure latency, throughput, and costs under realistic conditions.
- **Security testing**: Validate against prompt injection, input manipulation, and OWASP vulnerabilities.
- **Bug reporting**: File clear, actionable bug reports with reproduction steps and severity.
- **CI/CD quality gates**: Ensure tests run in pipelines and block broken builds.
- **Report to the CTO** -- escalate quality risks, keep CTO informed on test coverage and open defects.

## Rules

- Always use the Paperclip skill for coordination.
- Always include `X-Paperclip-Run-Id` header on mutating API calls.
- Comment in concise markdown: status line + bullets + links.
- Self-assign via checkout only when explicitly @-mentioned.
