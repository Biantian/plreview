# Electron Packaged Runtime Regression Checklist (2026-04-19)

## Purpose

This document captures the main runtime lessons from the April 19 packaged Electron debugging cycle and turns them into a repeatable regression checklist.

It is intended for any change that touches:

- Electron packaging
- desktop runtime bootstrapping
- Next standalone renderer startup
- Prisma/database runtime wiring
- packaged process model on macOS or Windows

## What We Learned

### 1. Packaged runtime is not development runtime

A desktop build can look healthy in development while still failing after packaging.

The common reasons are:

- `.env` is no longer implicitly available
- relative SQLite paths resolve from a different working directory
- `tsx` / `esbuild` runtime hooks behave differently or break entirely inside `asar`
- Next standalone assets may exist but still be placed in the wrong runtime-relative location

Rule:

- never assume a development-only default will still work in the packaged app

### 2. `process.execPath` in a packaged app is the app executable

In packaged Electron builds, `process.execPath` points to the application binary itself, not a neutral Node runtime.

That means code like this is dangerous:

```ts
spawn(process.execPath, [serverPath], ...)
```

This can cause macOS to treat a background server as a second app instance, which may surface as an extra Dock icon or a bouncing `exec`-style entry.

Rule:

- do not use `process.execPath` to launch packaged background Node-style services
- prefer Electron-managed process types such as `utilityProcess`

### 3. Next standalone server and static assets must match runtime layout

It is not enough to package `.next/standalone` and `.next/static`.
The files must land where the standalone server actually looks for them at runtime.

Symptoms of mismatch:

- app opens but styles are missing
- HTML returns `200` while CSS or chunk requests return `404`
- the shell page loads but route styling or hydration is broken

Rule:

- verify packaged output against the standalone server's real runtime-relative lookup paths

### 4. Static home page success does not prove runtime health

The home page may work even when dynamic pages are broken, because static routes and dynamic routes exercise different runtime paths.

In this debugging cycle:

- `/` rendered successfully
- `/reviews` failed at runtime due to database resolution issues

Rule:

- always test at least one dynamic route and one API route in packaged mode

### 5. Database and encryption runtime config must be explicitly normalized

The packaged app must not rely on relative runtime config accidentally resolving correctly.

For local SQLite and encrypted settings:

- `DATABASE_URL` must be resolved to the intended packaged runtime location
- `APP_ENCRYPTION_KEY` must be present in the packaged process environment
- renderer and worker processes must inherit the same normalized runtime env

Rule:

- normalize runtime env once in the main process and propagate it consistently

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

### 2. Produce a fresh packaged app

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

### 3. Verify packaged renderer asset availability

Confirm that a packaged app can serve:

- main HTML
- CSS under `/_next/static/css/...`
- JS chunks under `/_next/static/chunks/...`

Pass criteria:

- HTML returns `200`
- first-load CSS returns `200 text/css`
- first-load JS chunks return `200`
- no `404` on first-load assets

### 4. Verify critical packaged routes

At minimum, validate:

- `/`
- `/reviews`
- `/reviews/new`
- `/rules`
- `/api/reviews`

Pass criteria:

- all routes return `200`
- no `Application error`
- no `__next_error__`
- no server-side Prisma or path-resolution exceptions

### 5. Verify packaged process model

Inspect the app after launch and confirm:

- the app is started once
- no second process is launched using the app executable as a fake Node runtime
- background renderer server is hosted as a helper/utility process, not as a second visible app

Recommended checks:

```bash
pgrep -af "PLReview.app/Contents/MacOS/PLReview"
lsappinfo list | rg "PLReview|next-server"
```

Pass criteria:

- only one `PLReview.app/Contents/MacOS/PLReview` app process
- any `next-server` process is parented by the app helper/runtime process, not re-launching the app binary

### 6. Verify packaged database resolution

Confirm packaged dynamic routes read the intended database and do not silently create or bind to an empty SQLite file.

Pass criteria:

- dynamic routes see expected records
- Prisma does not throw `P2021` or related missing-table errors
- runtime env resolves to the intended database path

## Release Gate

Do not consider a packaged desktop runtime change complete unless all of the following are true:

- desktop runtime regression tests are green
- a fresh packaged build succeeds
- critical routes are healthy in packaged mode
- first-load CSS and JS assets are reachable
- packaged process model does not create an extra visible app instance
- database-backed pages work in packaged mode

## Anti-Patterns To Avoid

- using `spawn(process.execPath, ...)` for packaged background services
- relying on implicit `.env` loading inside packaged runtime
- keeping `tsx` or `esbuild` as a packaged runtime dependency
- assuming standalone asset placement is correct without HTTP verification
- validating only `/` and skipping dynamic pages
- assuming "the app opened" means "the packaged runtime is healthy"

## Suggested Follow-up

If future desktop release work continues, consider adding a dedicated packaged smoke script that automates:

- app launch
- local port discovery
- route probing
- first-load asset probing
- basic process-shape checks

That would turn the current manual/semi-automated packaged validation into a standard pre-release gate.
