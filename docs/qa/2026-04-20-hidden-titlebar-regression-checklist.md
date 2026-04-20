# Hidden Titlebar Regression Checklist (2026-04-20)

## Purpose

This document captures the acceptance checks and implementation lessons for the Electron hidden-titlebar rollout used by the desktop shell.

It is intended for changes that touch:

- Electron window chrome configuration
- macOS titlebar behavior
- Windows titlebar overlay behavior
- desktop shell drag regions
- top-of-window layout and safe content offsets

## What Changed

The desktop shell now uses platform-aware titlebar behavior:

- macOS uses `hiddenInset` so the traffic-light controls float over the web content without a fake top strip
- Windows keeps `hidden` plus `titleBarOverlay` so native controls still render correctly
- the sidebar and main workspace now reach the very top of the viewport
- drag behavior is provided by the shell containers, while interactive controls are explicitly excluded from drag mode

## What We Learned

### 1. A fake top bar compounds Electron chrome offsets

Using a front-end placeholder strip on top of an already customized Electron titlebar creates visible white seams and control misalignment.

Rule:

- do not add a separate fake titlebar unless the platform-specific window mode truly requires one

### 2. Platform-specific window chrome needs different settings

The same `BrowserWindow` titlebar configuration does not behave equally across macOS and Windows.

Rule:

- use `hiddenInset` on macOS
- use `hidden` plus `titleBarOverlay` on Windows-style platforms

### 3. Drag regions belong to containers, not to controls

Applying drag mode too broadly makes buttons, links, and inputs unclickable.

Rule:

- apply drag mode to shell containers
- explicitly mark interactive descendants as `no-drag`

### 4. Content offset is safer than reducing shell height

Subtracting titlebar height from the whole shell introduces visible layout seams. Letting the shell reach `100vh` and offsetting inner content is more robust.

Rule:

- keep the shell full height
- use top padding for content avoidance near window controls

## Required Regression Checks

### 1. Targeted desktop shell tests

```bash
npm test -- tests/desktop/window-chrome.test.ts tests/desktop/runtime-metrics.test.ts tests/app/layout-shell.test.tsx tests/lib/globals-shell.test.ts tests/components/app-sidebar.test.tsx
```

Pass criteria:

- all tests pass
- window chrome config is correct per platform
- shell CSS contracts still match the hidden-titlebar layout

### 2. macOS visual acceptance

Confirm:

- the traffic-light controls float over the shell instead of sitting above a white placeholder strip
- the sidebar background reaches the top edge behind the traffic-light area
- the main workspace background also reaches the top edge
- sidebar content starts below the traffic-light area and is not obscured

### 3. Drag and click behavior

Confirm:

- dragging from the top empty area of the sidebar moves the window
- dragging from the top empty area of the main workspace moves the window
- links, buttons, and inputs inside those containers remain clickable

### 4. Windows overlay behavior

Confirm on Windows when available:

- native top-right controls still render
- overlay height matches the shell offset
- no top seam appears between native controls and rendered content

## Release Gate

Do not consider hidden-titlebar work complete unless:

- targeted regression tests are green
- macOS visual acceptance passes
- drag behavior works in both shell regions
- clickable controls remain interactive
- Windows overlay expectations are verified when a Windows pass is available
