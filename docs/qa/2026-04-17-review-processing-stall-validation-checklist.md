# Review Processing Stall Validation Checklist (2026-04-17)

## Scope

- Validate that newly created review jobs do not stay in `pending` / `running` forever without state change
- Validate that the desktop batch-creation flow actually launches background review execution
- Validate that deleting a `pending` / `running` review no longer causes unsafe persistence errors
- Provide a fixed evidence-gathering flow when “任务一直处理中” appears again

## Root Cause Summary

This checklist exists because we found a recurring failure mode in the review-job lifecycle:

- the desktop `createReviewBatch()` path created `ReviewJob` rows with `pending` status
- but it never launched `executeReviewJob()` after the batch was created
- when users created several tasks from the desktop flow, the jobs could sit in `pending` forever and look like “一直处理中”

We also keep a secondary regression check for “deleted while in flight” because that bug class made stuck-job diagnosis noisier:

- a review job could be deleted while `executeReviewJob()` was still running
- the background execution path then tried to update a deleted `ReviewJob` row
- the current fix makes deleted-row persistence safe, but it is **not** hard cancellation of the upstream model call

During validation we also uncovered a concurrency bug in rule snapshot creation:

- multiple jobs starting at the same time could each read the same latest `RuleVersion`
- they then tried to create the same next `(ruleId, version)` pair
- Prisma raised `P2002` on `RuleVersion(ruleId, version)`, causing the whole review job to fail immediately

## Automated Regression Gate

Run from repository root:

```bash
npm run test:bulk-regression
```

Expected after the current fix:

- the dedicated bulk regression suite passes
- `0` failures

If this gate fails, do not trust any manual smoke result until the failing suite is understood.

Any feature that touches one of the following paths must add or update at least one automated test in this suite before merge:

- desktop batch creation
- review execution lifecycle
- bulk selection / delete / export
- intake workbench submission and file counts

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
- within the next refresh cycle, state should move to `running` or directly to a terminal state
- each task should eventually end in one of:
  - `completed`
  - `partial`
  - `failed`

Pass criteria:

- no task remains in `pending` forever without any later transition
- the table refresh keeps reflecting the latest state

### 3) Desktop execution-start evidence

If any task remains in `pending` beyond the normal first refresh window, verify whether execution ever started.

Database snapshot:

```bash
sqlite3 prisma/dev.db "
  select id, batchId, status, createdAt, finishedAt, errorMessage
  from ReviewJob
  order by createdAt desc
  limit 20;
"
```

Runtime evidence:

- watch the app terminal right after clicking `开始批量评审`
- confirm there is no immediate exception from `review-batches:create`
- if available, add a temporary log around `createReviewBatch()` and `executeReviewJob()` to confirm launch count matches created jobs

Pass criteria:

- a newly created desktop batch causes one execution launch per created `ReviewJob`
- if the batch cannot reload all created jobs, the create flow fails fast instead of leaving silent `pending` tasks

### 4) “Stuck processing” timeout rule

Treat a task as suspicious when **all** of the following are true:

- it has remained in `pending` or `running` longer than the team’s normal expectation for the file size / model
- repeated manual refresh does not change the status
- other tasks in the same batch also stop progressing

Current recommended triage threshold:

- demo mode: `30s`
- normal local live run: `2m`

If the threshold is crossed, stop and collect evidence instead of repeatedly recreating jobs.

### 5) Running-job delete smoke

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

### 6) Post-delete follow-up

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
- any Prisma `P2002` error mentioning `RuleVersion` or `(ruleId, version)`
- any model/API timeout or transport error

### D. Repro classification

Classify the failure into one bucket before fixing:

1. `Never started`
   - job remains `pending`
   - desktop batch creation finished, but no sign that `executeReviewJob()` was launched
2. `Started but never finalized`
   - job moved to `running`
   - no terminal write-back
3. `Deleted while in flight`
   - row removed by user action
   - later persistence or logging still references the deleted job
4. `Concurrent snapshot conflict`
   - multiple jobs fail quickly with the same Prisma `P2002`
   - stack trace points to `ruleVersion.create()` / `(ruleId, version)`
5. `External dependency stall`
   - model/API call hangs or times out

Do not jump to fixes until the bucket is known.

## Pass/Fail Decision

This bug class is considered fixed only when all three are true:

- automated regression gate is green
- the three-task creation smoke reaches terminal states and does not leave silent `pending` tasks
- deleting a running/pending task no longer causes unsafe persistence behavior

## Follow-up Notes

- Current behavior after deleting a running job is **best-effort cleanup**, not hard cancellation of the upstream model call.
- If product needs true cancellation later, add a separate design/change for cooperative cancellation instead of expanding this checklist ad hoc.
