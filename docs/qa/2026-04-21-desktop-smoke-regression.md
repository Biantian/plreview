# Desktop Smoke Regression

This project now has a repeatable packaged-app smoke path for the core desktop launch workflow.

## Goal

Catch regressions where the packaged Electron app can still open, but the critical review launch path silently breaks:

- launch data loads late and never unlocks `开始评审`
- imported files never land in the workbench
- packaged renderer boots, but batch creation cannot complete

## Command

```bash
npm run test:desktop:smoke
```

## What The Script Does

`scripts/run-desktop-smoke.mjs` runs a real packaged-app smoke flow against `release/mac-arm64/PLReview.app`.

It performs these steps:

1. builds a fresh packaged desktop app unless `PLREVIEW_DESKTOP_SMOKE_SKIP_DIST=1`
2. creates a temporary Electron `userData` directory just for the smoke run
3. launches the packaged Electron app with a DevTools remote debugging port
4. lets the packaged app self-bootstrap its local SQLite copy and encryption key inside that temporary `userData`
5. injects a smoke-only import list through `PLREVIEW_SMOKE_IMPORT_PATHS`
6. navigates to `plreview://app/reviews/new`
7. fills the batch name
8. clicks `选择本地文件`
9. waits for the imported file to appear and for `开始评审` to become enabled
10. clicks `开始评审`
11. verifies the app reaches `/reviews` and the created review row contains the smoke batch name and fixture filename

On success, temporary artifacts are deleted automatically.

On failure, the script preserves its temp directory and writes a failure screenshot there so the broken packaged state can be inspected.

## Why This Is Stable

The smoke flow no longer depends on automating the native file picker.

Instead, the packaged app still uses the normal `files:pick` entry point, but when `PLREVIEW_SMOKE_IMPORT_PATHS` is present, the Electron main process bypasses the OS dialog and imports the provided file paths directly. That keeps the test on the real packaged shell, worker pipeline, and review launch flow without relying on fragile Accessibility keystrokes.

The smoke flow also no longer injects `DATABASE_URL` or `APP_ENCRYPTION_KEY`.
That means the packaged regression path now exercises the real first-launch runtime bootstrap instead of accidentally reusing source-root development defaults.

## Environment Overrides

- `PLREVIEW_DESKTOP_SMOKE_SKIP_DIST=1`
  Reuse the current packaged app instead of rebuilding it.
- `PLREVIEW_DESKTOP_SMOKE_APP_BINARY=/abs/path/to/app-binary`
  Override the packaged executable path.
- `PLREVIEW_DESKTOP_SMOKE_DEBUG_PORT=9333`
  Override the DevTools port.
- `PLREVIEW_DESKTOP_SMOKE_BATCH_NAME=...`
  Force a deterministic smoke batch name.
- `PLREVIEW_DESKTOP_SMOKE_KEEP_ARTIFACTS=1`
  Keep the temp database and fixture files even on success.

## Recommended Usage

- Run `npm run test:bulk-regression` for fast logic and component coverage.
- Run `npm run test:desktop:smoke` before release candidates or after touching:
  - `components/intake-workbench.tsx`
  - Electron preload / main process bridge
  - file import worker flow
  - packaged renderer loading or release packaging

## Known Scope

This smoke currently targets the macOS packaged app layout in `release/mac-arm64/PLReview.app`.

If Windows packaged smoke is added later, extend the script with platform-specific executable discovery while keeping the same temporary database and smoke import strategy.
