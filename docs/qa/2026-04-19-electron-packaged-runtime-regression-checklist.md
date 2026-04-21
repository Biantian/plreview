# Electron Packaged Runtime Regression Checklist (2026-04-19)

## Purpose

This document captures the main runtime lessons from the April 19 packaged Electron debugging cycle and turns them into a repeatable regression checklist.

It is intended for any change that touches:

- Electron packaging
- desktop runtime bootstrapping
- static renderer export and asset loading
- Electron preload / IPC bridge wiring
- Prisma/database runtime wiring
- packaged process model on macOS or Windows

## What We Learned

### 1. Packaged runtime is not development runtime

A desktop build can look healthy in development while still failing after packaging.

The common reasons are:

- `.env` is no longer implicitly available
- relative SQLite paths resolve from a different working directory
- `tsx` / `esbuild` runtime hooks behave differently or break entirely inside `asar`
- exported renderer assets may exist but still be placed in the wrong packaged location

Rule:

- never assume a development-only default will still work in the packaged app

### 2. Production renderer loading must not depend on a packaged Next.js server

This desktop architecture no longer ships a standalone Next.js renderer server.
Development still points Electron at `http://localhost:3000`, but packaged builds must load static HTML from `out/`.

Rule:

- do not reintroduce standalone server boot code into the packaged renderer path
- packaged runtime should resolve to `out/index.html` or the equivalent local protocol target

### 3. Exported HTML and assets must match runtime layout

It is not enough to generate `out/`.
The exported files must land where Electron can actually resolve them at runtime.

Symptoms of mismatch:

- app opens but styles are missing
- entry HTML loads but CSS or chunk files fail to resolve
- the shell page loads but route transitions or hydration are broken

Rule:

- verify packaged output against the real file/protocol lookup paths used by Electron

### 4. Static home page success does not prove desktop bridge health

The home page may work even when operational pages are broken, because landing pages, bridge-backed pages, and detail pages exercise different runtime paths.

In this debugging cycle:

- `/` rendered successfully
- `/reviews` or `/reviews/new` could still fail due to bridge, database, or packaged asset issues

Rule:

- always test at least one bridge-backed list page and one bridge-backed launch flow in packaged mode

### 5. Database and encryption runtime config must be explicitly normalized

The packaged app must not rely on relative runtime config accidentally resolving correctly.

For local SQLite and encrypted settings:

- `DATABASE_URL` must be resolved to the intended packaged runtime location
- `APP_ENCRYPTION_KEY` must resolve to a stable packaged runtime value, whether injected externally or provisioned from local app data
- renderer and worker processes must inherit the same normalized runtime env

Rule:

- normalize runtime env once in the main process and propagate it consistently

### 6. Preload bridge drift can silently break packaged pages

This desktop architecture depends on `electron/preload` exposing the renderer bridge consistently in development and production.

Symptoms of mismatch:

- packaged pages show "桌面桥接不可用，请从 Electron 桌面壳启动。"
- list/detail pages render shell UI but never load data
- launch flow stays disabled because rules, models, or file import state never arrive

Rule:

- keep source preload bootstrap and typed preload implementation aligned
- verify bridge-backed pages after any preload, channel, or page migration change

## Required Regression Checks

Run these checks after any packaged desktop runtime change.

### 1. Desktop test suite

```bash
npm test -- --run \
  tests/desktop/runtime-env.test.ts \
  tests/desktop/renderer-runtime.test.ts \
  tests/desktop/desktop-packaging.test.ts \
  tests/desktop/desktop-size-report.test.ts
```

Pass criteria:

- all tests pass
- no new packaging/runtime regressions are introduced

### 2. Packaged smoke regression

```bash
npm run test:desktop:smoke
```

Pass criteria:

- the packaged app launches successfully
- the smoke script can fill the batch name, import a file, and enable `开始评审`
- batch creation completes and the new row appears under `评审任务`

### 3. Produce a fresh packaged app

```bash
npm run desktop:dist -- --mac dir
```

If validating Windows packaging shape:

```bash
npm run desktop:dist -- --win --x64 --dir
```

Pass criteria:

- packaging completes successfully
- expected output folder is regenerated

### 4. Verify packaged renderer asset availability

Confirm that a packaged app can resolve:

- `out/index.html`
- exported route HTML such as `out/reviews/index.html`
- CSS and JS assets emitted under `out/_next/`

Pass criteria:

- entry HTML exists and loads
- first-load CSS resolves successfully
- first-load JS chunks resolve successfully
- no missing exported assets on first load or first route transition

### 5. Verify critical packaged routes

At minimum, validate:

- `/`
- `/reviews`
- `/reviews/new`
- `/rules`
- `/models`
- `/docs`

Pass criteria:

- all pages render without fallback error UI
- no `Application error`
- no `__next_error__`
- bridge-backed pages successfully load their local data

### 6. Verify packaged process model

Inspect the app after launch and confirm:

- the app is started once
- no standalone Next.js renderer server is launched in packaged mode
- background work stays within the expected Electron helper / worker process model

Recommended checks:

```bash
pgrep -af "PLReview.app/Contents/MacOS/PLReview"
lsappinfo list | rg "PLReview|node|next-server"
```

Pass criteria:

- only one `PLReview.app/Contents/MacOS/PLReview` app process
- no `next-server`-style packaged renderer process is running
- no second visible app instance is spawned to host renderer logic

### 7. Verify packaged database resolution

Confirm packaged bridge-backed pages and workers read the intended database and do not silently create or bind to an empty SQLite file.

Pass criteria:

- review lists, rules, and models show expected records
- Prisma does not throw `P2021` or related missing-table errors
- runtime env resolves to the intended database path

### 8. Verify desktop bridge coverage

Confirm the preload bridge remains available to the packaged renderer.

At minimum, validate:

- `window.plreview` exists in the renderer
- review list loading works
- rule dashboard loading works
- model dashboard loading works
- file import and batch creation still complete

Pass criteria:

- packaged operational pages do not show bridge-unavailable messaging
- no IPC channel mismatches or missing preload exports surface during the run

## Release Gate

Do not consider a packaged desktop runtime change complete unless all of the following are true:

- desktop runtime regression tests are green
- packaged smoke regression is green
- a fresh packaged build succeeds
- critical pages are healthy in packaged mode
- exported CSS and JS assets are reachable
- packaged process model does not create an extra visible app instance or a hidden Next server
- database-backed pages and bridge-backed flows work in packaged mode

## Anti-Patterns To Avoid

- relying on implicit `.env` loading inside packaged runtime
- keeping `tsx` or `esbuild` as a packaged runtime dependency
- reintroducing `.next/standalone` as a packaged runtime dependency
- assuming exported asset placement is correct without packaged verification
- validating only `/` and skipping bridge-backed operational pages
- assuming "the app opened" means "the packaged runtime is healthy"

## Suggested Follow-up

The dedicated packaged smoke script now exists at `npm run test:desktop:smoke`.
Future follow-up can extend it with:

- Windows packaged executable discovery
- additional detail-page verification
- automated process-shape assertions
