# Review Processing Stall Validation Checklist (2026-04-17)

## Scope

- Validate that newly created review jobs do not stay in `pending` / `running` forever without state change
- Validate that deleting a `pending` / `running` review no longer causes unsafe persistence errors
- Provide a fixed evidence-gathering flow when “任务一直处理中” appears again

## Root Cause Summary

This checklist exists because we found a recurring failure mode in the review-job lifecycle:

- a review job could be deleted while `executeReviewJob()` was still running
- the background execution path then tried to update a deleted `ReviewJob` row
- that produced record-not-found persistence errors and made the “处理中” lifecycle harder to reason about

The current fix does **not** implement hard cancellation of the upstream model call. It makes deleted-row persistence safe and keeps the UI copy honest.

## Automated Regression Gate

Run from repository root:

```bash
npm test -- --run \
  tests/lib/review-jobs-selection.test.ts \
  tests/lib/review-jobs.test.ts \
  tests/lib/review-jobs-export.test.ts \
  tests/api/reviews-delete-route.test.ts \
  tests/api/reviews-export-list-route.test.ts \
  tests/api/reviews-export-report-route.test.ts \
  tests/components/review-jobs-table.test.tsx
```

Expected:

- `7` test files pass
- `39` tests pass
- `0` failures

If this gate fails, do not trust any manual smoke result until the failing suite is understood.

## Manual Validation Flow

### 1) Baseline startup

1. Start the app in the target environment.
2. Open `评审列表`.
3. Confirm there are no stale error banners from previous runs.

Pass criteria:

- page loads normally
- polling/refresh controls still work

### 2) Three-task creation smoke

1. Open `新建评审`.
2. Create 3 review jobs in one session using real or demo model configuration.
3. Return to `评审列表` immediately after submission.

Observe for each task:

- initial state should appear as `pending`
- state should move to `running` or directly to a terminal state
- each task should eventually end in one of:
  - `completed`
  - `partial`
  - `failed`

Pass criteria:

- no task remains in `pending` / `running` forever without any later transition
- the table refresh keeps reflecting the latest state

### 3) “Stuck processing” timeout rule

Treat a task as suspicious when **all** of the following are true:

- it has remained in `pending` or `running` longer than the team’s normal expectation for the file size / model
- repeated manual refresh does not change the status
- other tasks in the same batch also stop progressing

Current recommended triage threshold:

- demo mode: `30s`
- normal local live run: `2m`

If the threshold is crossed, stop and collect evidence instead of repeatedly recreating jobs.

### 4) Running-job delete smoke

1. Create at least 1 task and wait until it shows `pending` or `running`.
2. In `评审列表`, select that task.
3. Click `删除`.
4. Confirm the stronger dialog copy is shown:
   - `删除后这些任务会从列表中移除，后台处理不一定会立即停止。`
5. Confirm deletion.

Pass criteria:

- row disappears from the table after the delete flow completes
- no unhandled crash or visible server error is introduced
- subsequent refresh still works

### 5) Post-delete follow-up

After deleting a running/pending task:

1. Trigger `立即刷新`.
2. Create one new review task.
3. Confirm the newly created task still proceeds to a terminal state.

Pass criteria:

- the deleted task does not reappear
- later tasks are not blocked by the prior deletion

## Evidence Collection When Jobs Stay “处理中”

When the timeout rule is hit, collect **all** of the following before changing code:

### A. UI evidence

- screenshot of `评审列表`
- the exact job titles / ids that are stuck
- how long they have been stuck

### B. Database snapshot

Run:

```bash
sqlite3 prisma/dev.db "
  select id, status, modelNameSnapshot, createdAt, finishedAt, errorMessage
  from ReviewJob
  order by createdAt desc
  limit 20;
"
```

Check:

- whether the stuck jobs are still `pending` or `running`
- whether `finishedAt` is null
- whether `errorMessage` stayed empty

### C. Server/runtime evidence

Capture:

- terminal output from the running app process
- any Prisma error mentioning missing records or failed updates
- any model/API timeout or transport error

### D. Repro classification

Classify the failure into one bucket before fixing:

1. `Never started`
   - job remains `pending`
   - no sign that execution began
2. `Started but never finalized`
   - job moved to `running`
   - no terminal write-back
3. `Deleted while in flight`
   - row removed by user action
   - later persistence or logging still references the deleted job
4. `External dependency stall`
   - model/API call hangs or times out

Do not jump to fixes until the bucket is known.

## Pass/Fail Decision

This bug class is considered fixed only when all three are true:

- automated regression gate is green
- the three-task creation smoke reaches terminal states
- deleting a running/pending task no longer causes unsafe persistence behavior

## Follow-up Notes

- Current behavior after deleting a running job is **best-effort cleanup**, not hard cancellation of the upstream model call.
- If product needs true cancellation later, add a separate design/change for cooperative cancellation instead of expanding this checklist ad hoc.
