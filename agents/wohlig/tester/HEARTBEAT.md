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

**A. Standard comprehensive test run** (task titled "Run tests", "Run unit tests", "QA validation", or similar):

Follow the **Comprehensive Test Automation Convention** in `$AGENT_HOME/AGENTS.md`. Execute all steps in order:
1. `npm install` to sync dependencies
2. `npm test -- --verbose 2>&1` to run the full 14-suite test battery
3. `npm run test:coverage` for coverage metrics
4. `npm run build` to verify TypeScript compilation
5. Parse output into 7 test categories (Core Unit, Integration, E2E, Security, Error Handling, Monitoring, Config)
6. Write per-test impact descriptions for every test case (what passing/failing means for production)
7. Generate and post the Comprehensive Test Report (exact format in AGENTS.md)
8. Apply the production readiness verdict criteria (PRODUCTION READY / NOT PRODUCTION READY / CONDITIONALLY READY)
9. If all tests pass: mark done.
10. If any tests fail: mark **blocked** and escalate to CTO with a structured comment:
    ```
    @CTO — Test failures require triage.

    **Failed tests:**
    - `test.name.here` — expected X, got Y
    - `test.name.here` — timeout / error description

    **Likely cause:** [your best assessment — code bug, missing dependency, flawed test, env issue]
    **Area affected:** [which module/service/file is likely responsible]
    **Severity:** [critical / high / medium — does this block the release?]
    **Suggested action:** [fix the code in X, update the test for Y, etc.]
    ```
    This wakes the CTO, who will triage, plan the fix, and assign it to the right engineer.

**B. Targeted investigation** (specific bug, feature test, or PR review):
1. Read the feature spec, PR, or bug report to understand what changed and why.
2. Identify test scope: which of the 7 categories are affected.
3. Write or update test cases covering happy path, edge cases, error handling, and regressions.
4. For AI features: run eval harnesses, check for hallucinations, measure output quality metrics.
5. For APIs: validate request/response contracts, error codes, auth, and rate limits.
6. Report results with evidence: logs, test output, reproduction steps.
7. File bugs with severity, reproduction steps, expected vs actual, and environment details.

## 7. Delegation

- Create subtasks with `POST /api/companies/{companyId}/issues`. Always set `parentId` and `goalId`.
- Break down large test efforts into focused subtasks (e.g., separate API testing from UI testing).
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
