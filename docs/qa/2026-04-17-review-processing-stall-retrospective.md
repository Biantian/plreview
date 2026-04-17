# Review Processing Stall Retrospective (2026-04-17)

## Summary

We investigated a repeated desktop failure where users could create several review tasks and then see them stay in `处理中`, or fail immediately after the first fix.

The incident ended up being two related defects in the same bulk workflow:

1. the desktop batch-creation path created `ReviewJob` rows but did not start execution
2. after execution start was restored, concurrent jobs could collide while creating the next `RuleVersion`

## What Happened

### Phase 1: Jobs never really started

- desktop `createReviewBatch()` inserted pending jobs
- no `executeReviewJob()` call was triggered afterward
- result: a three-task batch could sit in `pending` forever and appear stuck in `处理中`

### Phase 2: Jobs started, then failed together

- once execution launch was fixed, several jobs began at nearly the same time
- each job tried to read the latest `RuleVersion` and then create the next `(ruleId, version)`
- result: Prisma raised `P2002` on the unique key and multiple jobs failed in the same batch

## Why Existing Tests Missed It

- we had unit coverage for smaller pieces, but no automated test that exercised a real `3`-item desktop batch
- we had no dedicated regression suite for bulk-capable paths
- manual smoke testing became the first place these failures were visible

In short, our tests verified isolated behavior, but not the way those behaviors interact under a bulk launch.

## What We Changed

- desktop batch creation now launches review execution after the batch is persisted
- rule snapshot creation now retries safely on concurrent unique-key conflicts and reuses the latest matching snapshot
- the intake workbench now has automated submission coverage for a `3`-document batch
- the desktop batch core now has automated launch coverage for a `3`-document batch
- the project now exposes a dedicated regression command:

```bash
npm run test:bulk-regression
```

- the QA checklist now treats bulk regressions as a fixed gate instead of a best-effort smoke exercise

## Process Changes

Going forward, any feature that touches a bulk-capable path must add or update automated bulk coverage before merge.

The minimum bar is:

- one `3`-item happy path
- one bulk-only failure or concurrency path
- one assertion on the user-visible result or submission payload

## Follow-Up Rule

Manual testing should confirm that the desktop app still feels right, but it should no longer be the primary detector for bulk workflow correctness.

If a future bug appears only when several items run together, the expected first response is:

1. add or update the automated bulk regression
2. reproduce and classify the failure
3. fix the root cause
4. update the checklist if a new failure bucket was discovered
