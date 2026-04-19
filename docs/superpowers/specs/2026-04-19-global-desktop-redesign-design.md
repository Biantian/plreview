# PLReview Global Desktop Redesign Design

Date: 2026-04-19
Status: Approved in conversation, pending written spec review

## Goal

Redesign the full PLReview application from a top-nav web-style interface into a desktop-first workspace that feels closer to a native productivity app.

The approved visual direction is:

- Warm editorial command center
- Light and refined
- Warm white base with apricot-orange accents
- Left navigation plus primary workspace layout
- Desktop UX before mobile UX

This redesign must improve information hierarchy and daily usability without changing the core product capabilities:

- Create review batches
- Track review jobs
- Inspect review details and report output
- Manage rules
- Manage model profiles
- Read docs

## Non-Goals

- No change to backend data model or API contracts
- No new product feature scope beyond UI/UX and information architecture improvements
- No dark mode redesign in this pass
- No attempt to mimic a marketing landing page

## Product Context

PLReview is used like a workstation, not like a public website. The primary environment is the Electron desktop app, which means the interface should optimize for:

- Wide layouts
- Repeated navigation between the same tools
- Long-lived sessions
- Dense but calm information presentation
- Stable controls and predictable scanning paths

The redesign should therefore behave like a desktop control surface:

- Persistent navigation
- Clear zoning
- Localized scrolling
- Strong table and detail views
- Reduced reliance on oversized hero sections

## Design Principles

### 1. Desktop-First Workspace

Use a persistent application shell with a fixed left sidebar and a right content workspace. The shell should feel stable across all pages so users always know where navigation, page context, and actions live.

### 2. Warm Precision

Adopt a refined light palette built around warm whites, cream surfaces, soft gray dividers, and apricot-orange emphasis. The UI should feel polished and premium, but still operational and trustworthy.

### 3. Calm Density

Pages should carry more information than the current welcome-page style, but without becoming crowded. Use card groupings, compact metrics, structured headers, and restrained spacing rather than large decorative gaps.

### 4. Operational Clarity

Important actions, statuses, and state transitions must be immediately legible. The interface should privilege “what can I do now?” over “what is the product?”

### 5. Cross-Page Consistency

All major screens should feel like members of the same desktop product, not individually styled pages. Shared shell, panel language, spacing rhythm, table treatment, and feedback states must be unified.

## Global Information Architecture

Replace the current flat top navigation with a left sidebar organized around workflow order.

Approved top-level navigation:

1. 工作台
2. 评审任务
3. 新建批次
4. 规则库
5. 模型配置
6. 帮助文档

Notes:

- `工作台` replaces the current home page as a real operational dashboard.
- `评审任务` becomes the central task center for existing jobs.
- `新建批次` remains a primary action but lives as a first-class workspace page rather than a hero CTA.
- `规则库` and `模型配置` become library/configuration tools with denser management-oriented layouts.
- `帮助文档` stays accessible but visually secondary to operational areas.

## Global Layout Specification

### Shell

- Left sidebar fixed on desktop
- Right side content area fills remaining width
- Content area uses a max width suitable for desktop readability, but should not feel like a narrow website column
- Top-of-page local header inside the content area for page title, context copy, and page-level actions
- Main content below organized into cards, toolbars, tables, and split panes

### Sidebar

The sidebar should feel like a desktop app rail, not a website nav.

- Product mark and product name at the top
- Navigation items stacked vertically
- Active item gets a clear warm accent state
- Lower utility area can hold secondary items if needed later, but this pass only needs the existing primary sections
- Width should support text labels comfortably, not icon-only navigation

### Workspace Header

Each page should begin with a consistent local header that may include:

- Eyebrow/kicker
- Page title
- One short supporting sentence
- Primary and secondary actions where relevant

This header replaces the current oversized landing style.

## Visual System

### Color

Primary direction:

- Background: warm ivory / soft cream
- Surfaces: near-white with subtle warmth
- Accent: apricot / soft orange
- Text: deep slate with warm-neutral support tones
- Borders: light visible neutral separators

Usage:

- Accent color reserved for active nav, key metrics, primary buttons, progress accents, and chart emphasis
- Avoid overusing saturated orange across large regions
- Tables and dense content should stay mostly neutral, with accent used for focus and state

### Typography

The redesign should favor a premium but readable desktop sans approach. Large decorative serif treatment is not appropriate for this tool-heavy interface. Titles may become slightly more expressive, but the system should remain highly legible in tables, forms, and detail panes.

Typography goals:

- Strong hierarchy without giant hero text
- Clean section titles
- Compact but readable body copy
- Stable numeric treatment for metrics and scores

### Shape and Surfaces

- Large rounded outer shell language
- Medium-to-large card radius
- Softer shadow system than current implementation
- High-opacity light cards for readability
- Optional mild translucency only where it does not reduce contrast

The design may borrow a little from glassmorphism, but only as a subtle polish layer. The product should remain crisp and readable in a desktop environment.

### Motion

- Short, restrained transitions
- Hover feedback on interactive elements
- Focus and selected states more important than animation spectacle
- Respect `prefers-reduced-motion`

Avoid bouncy transforms or effects that feel mobile-first.

## UX Rules For Desktop App Behavior

### Navigation

- Navigation should stay visible while the content changes
- Switching sections should preserve user orientation through consistent page headers and stable shell structure
- Active location must be obvious at a glance

### Scrolling

- Prefer page-local scrolling zones for dense lists and split-pane detail views
- Avoid forcing the user to scroll long distances to reach actions or context already visible elsewhere
- Review detail views should support stable dual-pane reading

### Tables and Dense Management Views

- Keep toolbars close to their tables
- Search, filters, and batch actions should sit above the data region
- Selected rows and statuses must be more visually distinct
- Table shells should feel integrated with the card system, not dropped into the page raw

### Forms and Multi-Step Workflows

- New batch creation should feel like a workstation panel, not a generic web form
- Group configuration sections clearly
- Keep system status visible during setup
- File import and parse summaries should be treated as a primary working surface

### Detail Reading

- For review details, preserve synchronized reading between source, issue list, and issue detail
- Use layout and spacing to make the relationship between those panes feel intentional and desktop-native

## Page-Level Designs

### 1. 工作台

Purpose:

- Give the user an operational snapshot and next-step entry point

Layout:

- Compact local header with current workspace summary and main action
- Top summary row with metrics such as documents, review jobs, enabled rules, annotations
- Main dashboard grid with:
  - Recent reviews
  - Quick actions
  - Rule/model readiness
  - Optional status summary cards

Behavior:

- Remove the current marketing-style hero framing
- Make “start new batch” available but not dominant over everything else
- Prioritize orientation and activity over explanation

### 2. 评审任务

Purpose:

- Central task center for monitoring, searching, selecting, exporting, retrying, and deleting reviews

Layout:

- Header with page context and key action
- Compact KPI row for total, running, completed, failed
- Prominent toolbar tied directly to the review table
- Table inside a higher-quality card shell with improved row states

Behavior:

- Preserve existing bulk action functionality
- Improve visual distinction for selection mode, active work, and row actions
- Keep density suitable for desktop scanning

### 3. 新建批次

Purpose:

- Launch a new review batch through a controlled multi-zone workspace

Layout:

- Desktop split or weighted grid layout
- Left/main zone for batch metadata and rule selection
- Right/support zone for file import, parse summaries, and current launch readiness
- Final submit area clearly visible and summarized

Behavior:

- The file workbench should feel like a real desktop import tray
- Summary inspection should read as a contextual side panel, not an afterthought card
- Readiness state should stay legible throughout the workflow

### 4. 评审详情

Purpose:

- Let the user inspect a completed review through synchronized source reading and issue inspection

Layout:

- Header snapshot card for status, provider, model, created date, score, issue counts
- Main split workspace:
  - Left: annotated source stream
  - Right top: issue navigator
  - Right bottom: active issue detail
- Report body below as a secondary reading surface, still visually integrated

Behavior:

- Preserve current source-to-issue linkage
- Improve active/focused state styling
- Ensure split-pane proportions feel optimized for desktop width
- Keep the report readable without overwhelming the main investigation flow

### 5. 规则库

Purpose:

- Manage review rules efficiently

Layout:

- Compact management header
- KPI strip
- Table/search area as the core of the page

Behavior:

- Maintain high information density
- Improve polish of filters, row actions, and library framing
- Ensure this page looks like a system console, not a brochure page

### 6. 模型配置

Purpose:

- Search, edit, enable, disable, and inspect model profiles

Layout:

- Similar desktop management layout to 规则库 for consistency
- Toolbar and metrics above
- Dense data table with clear status communication

Behavior:

- Preserve drawers and table actions
- Make enabled state, API key state, and editing affordances easier to scan

### 7. 帮助文档

Purpose:

- Provide support documentation without visually breaking the application shell

Layout:

- Retain the global shell
- Use a cleaner reading container inside the desktop workspace

Behavior:

- Docs can be slightly calmer and more reading-oriented, but still belong to the same product

## Shared Component/System Changes

The redesign will likely require a shared UI pass across:

- App shell
- Sidebar navigation
- Page headers
- Panel/card primitives
- Metric cards
- Table shell and toolbar styling
- Button hierarchy
- Pills/badges/status indicators
- Split-pane layouts
- Form sections

Implementation should favor updating the shared styling system so that pages inherit the new language rather than each page being restyled separately.

## Accessibility And Quality Constraints

- Preserve strong text contrast in the light theme
- Keep borders visible in light mode
- All interactive elements need clear hover, focus, and active states
- Keyboard navigation must remain supported
- Avoid low-opacity glass effects that reduce readability
- Respect reduced motion preferences
- Ensure no horizontal overflow in standard desktop widths

## Responsiveness

Primary target is desktop. However:

- The application must still render coherently on narrower widths
- Sidebar may collapse or adapt at smaller breakpoints, but desktop behavior is the design anchor
- No layout decision should sacrifice desktop efficiency in order to imitate a phone-first experience

## Risks And Mitigations

### Risk: Over-styling harms tool usability

Mitigation:

- Use the warm editorial direction mainly in shell, surfaces, spacing, and emphasis
- Keep tables, forms, and detail panes operationally neutral

### Risk: Dashboard styling becomes inconsistent across management pages

Mitigation:

- Define shared shell and page primitives first
- Then adapt each page to that system

### Risk: Desktop-first redesign accidentally regresses narrower layouts

Mitigation:

- Verify at representative desktop and tablet-width breakpoints during implementation

## Validation Criteria

The redesign is successful if:

1. The app feels like one coherent desktop product rather than a collection of web pages
2. The left navigation and page headers improve orientation and repeat usage
3. The home page becomes a real operational dashboard
4. Review task and configuration pages remain efficient for dense workflows
5. The review detail page feels stronger and more intentional as a split-pane investigation tool
6. The visual direction clearly reflects warm white + apricot accents without hurting readability

## Implementation Notes

Expected implementation should begin with shell and shared styles, then move page-by-page:

1. Global shell and navigation
2. Shared card/table/header primitives
3. Dashboard page
4. Task center and management pages
5. New batch workspace
6. Review detail split-pane polish

This sequence minimizes duplicated styling work and keeps the design system coherent during rollout.
