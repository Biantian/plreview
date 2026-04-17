# Bulk Workflow Regression Policy (2026-04-17)

## Purpose

This project now treats bulk workflows as a first-class regression surface, not an optional manual smoke path.

If a feature can be triggered for one item and is realistically used for multiple items, automated tests must cover a multi-item case before the change is considered done.

## When This Policy Applies

Apply this rule to any change that touches:

- batch creation from `新建评审`
- review execution startup or terminal-state persistence
- intake workbench counts, selection, or submission rules
- review list bulk selection, delete, export, or filtering scope
- any shared service that is called once per task inside a bulk flow

## Minimum Automated Coverage

For any affected feature, the author must add or update tests that cover:

1. A happy-path batch with at least `3` items
2. A failure or partial-failure branch that can happen only because multiple items run together
3. The user-visible state or payload that proves the bulk operation behaved correctly

Examples:

- desktop batch creation: assert all `3` tasks are launched
- intake workbench: assert `3` imported documents are submitted in one payload
- bulk delete/export: assert selected scope and resulting counts are correct
- shared persistence logic: assert concurrent writes do not collide or silently drop items

## Required Gate

Run this suite from repository root:

```bash
npm run test:bulk-regression
```

Manual smoke testing is still useful, but it is supplemental evidence only. It does not replace automated bulk coverage for correctness.

## Definition Of Done Update

A feature touching a bulk-capable path is not done until all of the following are true:

- bulk-path automated coverage exists or was updated
- `npm run test:bulk-regression` passes
- any new bulk-only failure mode is documented in the relevant QA checklist or retrospective notes

## Review Checklist

Before merging, reviewers should explicitly ask:

- What is the `3`-item automated test for this change?
- What concurrent or mixed-state case was covered?
- If this broke in bulk only, where would the regression suite catch it?
