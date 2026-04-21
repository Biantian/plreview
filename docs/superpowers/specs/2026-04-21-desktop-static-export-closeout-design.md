# Desktop Static Export Closeout Design

**Date:** 2026-04-21

## Goal

Complete the interrupted desktop static export migration so the Electron app fully runs on exported Next.js HTML in production, no longer depends on a packaged Next.js Node server, and can be closed out with verification, documentation, commits, and integration cleanup.

## Problem Statement

The repository already contains substantial migration work toward a local-first desktop architecture, but the working tree shows the migration stopped mid-stream:

- runtime and packaging now point toward static `out/`
- multiple pages have been rewritten to consume `window.plreview`
- old `app/api/reviews/*`, `lib/actions.ts`, and the old dynamic detail route are being removed
- worker/runtime and export flows are partially rewritten

The remaining risk is not a single bug. It is architectural drift:

- some pages may already assume the desktop bridge exists while handlers or worker flows are still incomplete
- packaging may be mostly static-export-ready while tests or scripts still reflect old assumptions
- runtime behavior may work in development but still fail in packaged desktop flows
- large in-progress changes are still mixed together in one dirty worktree, making it easy to claim completion before the migration is actually sealed end-to-end

This closeout must therefore finish both the implementation and the release discipline around it.

## Constraints

- Preserve the approved target architecture:
  - `next.config.ts` uses `output: "export"`
  - development Electron continues to load `http://localhost:3000`
  - packaged Electron loads exported HTML from `out/`
  - operational pages obtain data via Electron preload bridge and IPC, not Next.js API routes
- Do not reintroduce `.next/standalone`, packaged Next server bootstrapping, or server-only runtime assumptions.
- Do not bundle unrelated UI redesign or architecture experiments into the closeout.
- Work from the current repository state, which includes a large interrupted migration in the working tree.

## Recommended Approach

Use a low-risk phased closeout rather than a single all-at-once finish.

### Approach Options Considered

#### 1. Phased closeout with hard gates (recommended)

Finish the remaining work in ordered segments, with targeted verification after each segment and a final packaged acceptance pass at the end.

Why this is recommended:

- matches the current reality of an interrupted, mixed-scope worktree
- reduces the chance of another half-finished “mostly migrated” state
- makes it possible to isolate regressions to a specific subsystem
- supports staged commits and a cleaner final wrap-up

Trade-off:

- more verification steps
- slightly slower than batching everything into one final pass

#### 2. Single-pass completion

Finish all code changes first, then run one large verification and wrap-up pass.

Why not recommended:

- too much unresolved surface area is still open
- failures at the end would be expensive to debug
- high chance of shipping drift between UI, IPC, worker, and packaging layers

#### 3. Rebuild from a fresh branch

Restart the migration from a clean base and selectively port good changes.

Why not recommended:

- would duplicate a large amount of already-useful work
- increases time cost without clear value unless the current branch becomes irrecoverably inconsistent

## Closeout Architecture

The closeout is organized into four dependent segments.

### Segment A: Page and Bridge Closeout

Purpose:

- make all packaged operational pages depend only on the Electron bridge

Scope:

- homepage dashboard
- review list page
- new batch page
- rules page
- models page
- review detail page
- the supporting bridge-facing data helpers that replace removed API routes and server actions

Expected state after Segment A:

- no live runtime path depends on `app/api/reviews/*`
- no live runtime path depends on `lib/actions.ts`
- old `/reviews/[id]` server-shaped detail route is fully superseded by the desktop detail page
- bridge-backed pages load correctly under static export assumptions

### Segment B: Main Process and Worker Closeout

Purpose:

- ensure every bridge-backed UI action is fully implemented in Electron IPC and local worker/runtime code

Scope:

- desktop bridge API surface
- Electron channel registration
- runtime status events
- create batch flow
- retry flow
- export list flow
- export report flow
- background/task worker integration

Expected state after Segment B:

- no UI capability points at an unimplemented handler
- preload bridge, channel names, handler registration, and worker protocol all agree
- file import, batch creation, retries, exports, and runtime status updates behave as one desktop-native system

### Segment C: Packaging and Size Closeout

Purpose:

- prove the production build is truly static-export-based and package-minimized

Scope:

- `next.config.ts`
- renderer load resolution
- builder includes/excludes
- desktop runtime build scripts
- bundle size reporting
- packaged app launch and smoke coverage

Expected state after Segment C:

- production package includes `out/`, `.desktop-runtime/`, and required Prisma runtime only
- packaged app launches without a bundled Next.js Node server
- current artifact size is measured and recorded after rebuild
- packaged smoke regression passes on the produced app

### Segment D: Integration and Wrap-Up Closeout

Purpose:

- convert the technical completion into a cleanly finished delivery batch

Scope:

- docs and QA references
- cleanup of temporary artifacts
- staged commits for the remaining work
- final verification checklist
- local merge / branch / worktree cleanup if requested

Expected state after Segment D:

- the migration is no longer “implemented but unfinished”
- docs reflect the static desktop architecture
- verification evidence exists for code, packaging, size, and smoke behavior
- the remaining work is either merged cleanly or left in an explicit ready-to-merge state

## Ordering and Gates

These segments must be executed in order. Later phases depend on earlier ones being truly closed.

### Gate 1: Segment A must pass before Segment B

Required evidence:

- page-level bridge tests pass
- all operational pages load through `window.plreview`
- removed API/server paths are no longer referenced in live runtime code

### Gate 2: Segment B must pass before Segment C

Required evidence:

- desktop handler coverage is complete for the visible UI actions
- worker/runtime tests pass
- no runtime path can reach a “not implemented yet” desktop handler during supported UI flows

### Gate 3: Segment C must pass before Segment D

Required evidence:

- `desktop:build`, `desktop:dist`, and size reporting succeed
- packaged app launches successfully
- packaged smoke regression succeeds
- packaged artifact contents match the static-export architecture

### Gate 4: Segment D is the final release gate

Required evidence:

- docs updated
- temporary artifacts cleaned
- phase commits created
- final acceptance checklist executed

## Testing Strategy

Verification should escalate with the phase:

- Segment A:
  - page and component tests for dashboard/list/detail/rules/models/new-batch flows
  - bridge-facing regression tests
- Segment B:
  - desktop API tests
  - channel/handler registration tests
  - worker/task runner/background entry tests
  - targeted regression tests for retry/export/runtime status behavior
- Segment C:
  - desktop packaging tests
  - size report tests
  - `desktop:build`
  - `desktop:dist`
  - `desktop:report-size`
  - packaged smoke regression
- Segment D:
  - final selected full-suite reruns for touched areas
  - manual verification record for current artifact size and launch behavior

## Risks and Mitigations

### Risk: Hidden server dependencies remain in static-export pages

Mitigation:

- explicitly audit runtime imports and route usage during Segment A
- require page tests and live desktop page checks before moving on

### Risk: UI and IPC surfaces drift again

Mitigation:

- treat `desktop/bridge/desktop-api.ts`, `electron/channels.ts`, preload, and handler registration as one contract surface
- close gaps with targeted tests before packaging

### Risk: Packaged app differs from development behavior

Mitigation:

- require real packaged smoke validation, not just `npm run dev`
- make artifact size and packaged content inspection part of the gate

### Risk: Unrelated dirty files get bundled into wrap-up commits

Mitigation:

- commit by closeout segment
- stage only relevant files per phase
- keep unrelated leftover work out of the finish commits

## Definition of Done

This closeout is complete only when all of the following are true:

- all user-facing operational pages run via Electron desktop bridge under static export
- no packaged Next.js standalone server logic remains in the production runtime path
- worker/runtime functionality required by the desktop UI is fully implemented
- packaged app is rebuilt, launch-tested, smoke-tested, and size-checked
- documentation reflects the final desktop static architecture
- the remaining migration work is committed in clearly scoped steps
- final integration cleanup is performed or explicitly prepared for immediate merge

## Execution Handoff

The implementation plan should follow the same four-segment structure:

1. Page and bridge closeout
2. Main process and worker closeout
3. Packaging and size closeout
4. Integration and wrap-up closeout

Each segment should include:

- exact files to inspect or modify
- targeted verification commands
- a gate checklist
- a commit point before advancing
