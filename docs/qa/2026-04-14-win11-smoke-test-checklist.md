# Win11 Smoke Test Checklist (2026-04-14)

## Scope

- Desktop packaging baseline for Windows 11 x64
- Local-first core flows:
  - multi-file intake
  - Excel import as full plan
  - same-rule batch review creation
  - table search and row-end actions

## Build Baseline

Run from repository root:

```bash
ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/ \
ELECTRON_BUILDER_BINARIES_MIRROR=https://npmmirror.com/mirrors/electron-builder-binaries/ \
npm run desktop:dist -- --win --x64 --dir
```

Expected output folder:

- `release/win-unpacked`
- main executable: `release/win-unpacked/PLReview.exe`

Current verification snapshot:

- built at: `2026-04-14` (Asia/Shanghai)
- `PLReview.exe` size: about `180 MB`
- `PLReview.exe` sha256: `56c84d8317c6a2048d00bd4c9685c9432d9b7971d05a5e6f9a4bcd79dc7f89bc`

## Desktop Optimization Validation

Run this verification sequence after any desktop runtime-boundary or packaging change:

```bash
npm test -- --run tests/desktop/worker-protocol.test.ts tests/desktop/worker-manager.test.ts tests/desktop/background-router.test.ts tests/desktop/task-runner.test.ts tests/desktop/runtime-metrics.test.ts tests/desktop/desktop-packaging.test.ts tests/desktop/desktop-size-report.test.ts
npm run desktop:report-size
```

If you need a fresh Win11 smoke package after that, forwarded args still work through:

```bash
npm run desktop:dist -- --win --x64 --dir
```

## Win11 Manual Smoke Steps

### 1) Launch and bootstrap

1. Copy `release/win-unpacked` to a Win11 machine.
2. Run `PLReview.exe`.
3. Confirm app opens without blank screen or crash.
4. Confirm navigation entries `新建评审` / `评审任务` / `规则管理` are available.

Pass criteria:

- app boot completes in under 10 seconds on a normal office laptop
- no unhandled startup errors

### 2) Intake workbench and import

1. Open `新建评审`.
2. Click `导入本地文件`.
3. Select 3 files in one shot:
   - one `.xlsx`
   - one `.docx` or `.md`
   - one `.txt`
4. Confirm all files appear as table rows.
5. Click `查看摘要` on each row.

Pass criteria:

- every selected file appears exactly once
- summary panel renders title/block/paragraph/source fields
- no stuck loading state

### 3) Filter and cleanup controls

1. Use `状态筛选` with:
   - `可提交评审`
   - `待重新导入`
2. Trigger `清理待重新导入`.
3. Trigger `清空工作台`.

Pass criteria:

- filtered view updates immediately
- cleanup actions only affect expected rows
- when selected row is filtered out, summary panel auto-collapses

### 4) Batch creation

1. Re-import at least one valid document.
2. Fill `批次名称`.
3. Keep at least one rule checked.
4. Click `开始批量评审`.
5. Confirm navigation to `评审任务`.

Pass criteria:

- batch creation succeeds
- new jobs visible in task table
- no crash when returning to `新建评审`

### 5) Review jobs table

1. Search by:
   - file name
   - batch name
   - status keyword
2. Open a job detail from row-end action.

Pass criteria:

- search is responsive and stable
- detail page opens and renders core content

### 6) Rules table

1. Search a rule by name.
2. Open row-end `编辑`.
3. Save and verify row reflects update.

Pass criteria:

- search and drawer edit both work
- update persists after page refresh

### 7) Local persistence

1. Close app completely.
2. Reopen app.
3. Re-check job/rule data.

Pass criteria:

- previous data remains available
- no forced re-initialization

## Known Risks

- Current build command above produces `win-unpacked` for smoke testing; `nsis` installer packaging should be verified on Win11 host.
- App icon and code signing are not configured for production release yet.
