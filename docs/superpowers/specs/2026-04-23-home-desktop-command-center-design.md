# Home Desktop Command Center Design

Date: 2026-04-23
Status: Approved in conversation, pending written spec review

## Goal

Redesign the PLReview home page from a web-style vertical dashboard into a desktop-native command center.

The home page must no longer depend on whole-page vertical scrolling in common desktop windows. It should behave like a fixed-height desktop workspace where only dense content panes, such as recent reviews and readiness details, scroll internally.

## Product Context

PLReview runs primarily as an Electron desktop app. The existing global shell already uses a fixed left sidebar and a right workspace, but the current home page still behaves like a web dashboard:

- A header section is followed by multiple vertically stacked dashboard sections.
- Metrics, recent reviews, workbench links, readiness, and model status are encountered by scrolling down the page.
- The interaction model differs from newer management pages that use localized scroll regions.

This redesign aligns the home page with the approved global desktop direction: persistent navigation, stable workspace zones, localized scrolling, and operational clarity.

## Design Inputs

The user selected layout option B from the visual companion: a three-column task cockpit.

The selected direction uses:

- A fixed local header.
- A left command rail for actions, shortcuts, and compact metrics.
- A central recent reviews pane as the primary working area.
- A right readiness pane for rules, model profiles, and local state.

The `ui-ux-pro-max` design search reinforced several relevant rules:

- Treat the page as an admin/dashboard surface, not a marketing or product-demo page.
- Favor data-dense desktop layouts with minimalism and clear hierarchy.
- Keep keyboard navigation and focus states explicit.
- Avoid horizontal overflow and whole-page scrolling when localized scroll panes are the intended model.

## Non-Goals

- No backend, Prisma, IPC, or bridge contract changes.
- No new dashboard API.
- No home-page selected-detail preview state.
- No new charting, analytics, or onboarding feature.
- No redesign of the global sidebar beyond what is required for home-page fit.
- No mobile-first redesign in this pass.

## Layout

### Workspace Frame

The home page becomes a fixed-height desktop cockpit inside the existing `main.workspace.page` shell.

On desktop viewports, the home page root should:

- Fill the available workspace height.
- Use `min-height: 0` on nested grid/flex containers so internal panes can scroll correctly.
- Hide whole-page overflow for the home cockpit.
- Avoid stacked full-width sections after the header.

Small or narrow viewports may use a fallback stacked layout, but the desktop target is a no-whole-page-scroll experience.

### Header

The local header remains at the top of the home workspace and does not scroll.

Content:

- Eyebrow: `Workspace`
- Title: `评审工作台`
- One short sentence explaining that the page is the entry point for tasks, rules, models, and recent results.
- Primary action: `开始新批次`, linking to `/reviews/new`.

The header should be compact. It should not act like a hero or landing-page banner.

### Three-Column Cockpit

Below the header, the page uses three columns:

1. Command rail
2. Recent reviews pane
3. Readiness pane

Recommended proportions:

- Left command rail: fixed or bounded width around 280-320px.
- Center recent reviews: flexible main column, largest region.
- Right readiness pane: fixed or bounded width around 280-340px.

The center pane should receive the strongest visual weight because the home page is primarily an operational snapshot of current work.

## Column Details

### Left Command Rail

Purpose:

- Provide immediate next actions.
- Keep the current workspace summary visible without requiring a top KPI strip.

Content:

- Primary action to create a new review batch.
- Quick links to:
  - Review jobs
  - New batch
  - Rules
  - Model profiles if space allows
- Compact KPI group:
  - Imported documents
  - Review jobs
  - Enabled rules
  - Annotations

Behavior:

- The rail should not scroll in normal desktop windows.
- Links must preserve their existing routes.
- The primary action should be obvious but not oversized.

### Center Recent Reviews Pane

Purpose:

- Act as the main work area of the home page.
- Show recent activity and let the user jump to review detail pages.

Content:

- Section title: `最近评审`
- Short helper text, if needed.
- Recent review rows from `dashboard.recentReviews`.
- Each row links to `/reviews/detail?id=<review.id>`.
- Existing status badges remain.

Behavior:

- This pane owns internal vertical scrolling when there are many recent reviews.
- Whole-page scrolling must not be required to reach later review rows.
- Loading and empty states stay inside this pane.

States:

- Loading: show a stable row or skeleton-like state reading `正在读取最近评审`.
- Empty: show `还没有评审记录` and a short prompt to create a new review.
- Error: if dashboard loading fails, this pane shows the primary error message.

### Right Readiness Pane

Purpose:

- Show whether the local review workstation is ready to run another batch.
- Keep configuration context visible without competing with recent reviews.

Content:

- Rules summary:
  - Total rules
  - Enabled rules
- Model profile summary:
  - Enabled model profile count
  - List of enabled model profiles and their default models
- Result capability summary:
  - Reports, annotations, and source-position reading are available after review completion
- Bridge or local state message when dashboard loading fails.

Behavior:

- The pane may scroll internally if model profile content exceeds the available height.
- Model-empty state affects only the model subsection.
- Readiness content should be structured as compact rows, not large explanatory cards.

## Data Flow

Keep the existing data flow.

`HomePage`:

- Calls `window.plreview.getHomeDashboard()` once on mount.
- Stores `HomeDashboardData`.
- Tracks `isLoading`.
- Tracks `errorMessage`.
- Passes dashboard data and state to home subcomponents.

No new IPC method is required.

Recommended component boundaries:

- `HomePage`: data loading, top-level state, page composition.
- `HomeCommandRail`: primary action, quick links, compact metrics.
- `HomeRecentReviewsPane`: recent reviews list, row links, list loading/empty/error state.
- `HomeReadinessPane`: rules, model profile, and result-readiness summaries.

If implementation speed matters, these can begin as local helper components in `app/page.tsx`. Extracting to `components/` is preferred if the page becomes hard to scan.

## Error Handling

Dashboard load failures should no longer replace the whole page with a single vertical error panel.

When `getHomeDashboard()` fails:

- Keep the desktop cockpit structure visible.
- Header remains available.
- Left rail remains available for route links where those links do not require dashboard data.
- Center pane shows the primary failure message.
- Right pane shows a concise desktop-bridge/local-state unavailable message.

This makes the failure feel like a data or bridge issue inside the workstation, not a collapse of the shell.

If `window.plreview?.getHomeDashboard` is missing:

- Use the same cockpit error treatment.
- Message should remain clear: the app must be launched from the Electron desktop shell.

## Interaction Rules

- Desktop home page must not whole-page scroll in common desktop windows.
- Recent reviews pane may scroll internally.
- Readiness pane may scroll internally.
- Command rail should remain static under normal desktop dimensions.
- Tab order follows visual order:
  1. Header action
  2. Command rail links
  3. Recent review links
  4. Readiness links or controls, if any are later added
- Focus states must remain visible.
- Links and buttons must have stable hit areas and should not shift layout on hover.

## Visual Direction

Continue the current warm editorial desktop style:

- Warm white workspace.
- Neutral separators.
- Apricot/orange for primary action and emphasis.
- Compact row-based panels.
- Avoid landing-page hero treatment.
- Avoid ornamental decorative backgrounds.
- Avoid oversized explanatory copy.

The page should feel like a native productivity dashboard: calm, dense, and direct.

## Implementation Scope

Expected files:

- `app/page.tsx`
- `app/globals.css`
- `tests/app/home-page.test.tsx`
- Optional new component files under `components/` if the implementation benefits from extraction.

Do not change:

- Desktop bridge types.
- Prisma schema.
- Review detail routes.
- Existing sidebar navigation routes.

## Testing Strategy

Update or add tests to cover:

- `getHomeDashboard()` still loads dashboard data through the desktop bridge.
- The home heading remains `评审工作台`.
- `开始新批次` still links to `/reviews/new`.
- Recent review rows still link to `/reviews/detail?id=<review.id>`.
- Dashboard metrics render in the new command rail.
- Error state keeps the cockpit structure visible instead of removing the whole dashboard.
- The page renders identifiable desktop cockpit, recent reviews pane, and readiness pane containers.

CSS layout behavior should be verified through class structure and, during implementation, with manual or screenshot review in the Electron-sized desktop viewport.

## Acceptance Criteria

- On a normal desktop viewport, the home page presents a fixed cockpit layout with no whole-page vertical browsing pattern.
- Only the center recent reviews pane and right readiness pane can scroll internally when content exceeds space.
- Primary actions and recent activity are visible immediately.
- Existing routes and dashboard data behavior are preserved.
- Loading, empty, and error states remain stable within the cockpit frame.
- The design remains visually consistent with the current desktop shell.
