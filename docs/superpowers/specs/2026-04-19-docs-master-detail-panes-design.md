# PLReview Docs Master-Detail Panes Design

Date: 2026-04-19
Status: Approved in conversation, pending written spec review

## Goal

Refactor the help documentation page into a standard desktop three-pane master-detail workspace.

The page should stop feeling like a generic web page with a top header and nested surfaces. Instead, it should behave like a native desktop reading workspace:

- left pane for document selection
- center pane for article reading
- right pane for section-level navigation

This redesign is limited to the help documentation area and must not change the underlying documentation content model.

## Non-Goals

- No new documentation search feature in this pass
- No change to the document data structure
- No change to application routing
- No redesign of the global app sidebar beyond moving the docs-related actions out of the page header

## Approved Direction

The user approved the following structure:

- remove the page-level header block from the docs page
- convert the docs workspace into three horizontal panes
- keep all three panes full height within the workspace
- give each pane its own vertical scroll area
- use physical `1px` pane dividers instead of card shells
- flatten the directory and article TOC into text-first lists
- use light neutral selection states instead of boxed cards
- move `新建批次` and `返回评审任务` out of the docs page header and into the main sidebar footer area

## Layout Specification

### Overall Workspace

The docs page should render directly as a work surface without a local hero/header section.

- The page body becomes a single pane workspace container.
- The workspace fills the available right-side app canvas.
- The workspace height should match the available app area so the panes feel docked rather than floating.
- The outer docs shell should not render as a rounded card.

### Pane Structure

Use a three-column layout:

1. Left pane: document directory
2. Center pane: article content
3. Right pane: article table of contents

Desktop widths:

- left pane: fixed `240px`
- center pane: `minmax(0, 1fr)`
- right pane: fixed `200px`

Each pane must:

- stretch to the full height of the docs workspace
- use `overflow-y: auto`
- keep its own scroll position independently

### Pane Dividers

Pane separation should rely on borders, not cards.

- left pane: `border-right: 1px solid #E5E7EB`
- right pane: `border-left: 1px solid #E5E7EB`
- center pane: no card border or shadow, only the adjacent pane dividers

This should create a grounded desktop split-pane appearance.

## Pane Content Rules

### Left Pane: Directory

Purpose:

- choose the active document

Structure:

- fixed pane header with the label `DIRECTORY`
- document list below it

Styling:

- no card wrappers around list items
- no individual borders around each item by default
- text-first rows with compact vertical rhythm
- active item uses a very light neutral background such as `#F3F4F6`
- active item may use a small radius for readability, but should not look like a floating card

Interaction:

- the entire row remains clickable
- hover and focus states should be subtle and stable
- no collapse toggle in this version

### Center Pane: Docs Body

Purpose:

- read the active document comfortably in a focused content area

Structure:

- fixed pane header with the label `DOCS`
- article title and intro below the header
- article sections in a single reading column

Layout:

- pane takes the remaining horizontal space
- content area uses generous horizontal padding, targeting about `40px`
- reading width should remain comfortable without introducing another nested card

Styling:

- pure white canvas
- no outer card shell
- no decorative pills required at the top of the article
- sections are separated by spacing and simple structure rather than boxed surfaces

### Right Pane: Article TOC

Purpose:

- jump between sections inside the active article

Structure:

- fixed pane header with the label `ARTICLE TOC`
- list of section anchors below it

Styling:

- no bordered list-item cards
- text-first list treatment matching the left pane
- current or hovered item may use a light neutral highlight

Interaction:

- anchors remain simple text navigation
- no collapse toggle in this version

## Alignment and Typography

All three pane headers should align visually as a shared pane-header row system.

Requirements:

- `DIRECTORY`, `DOCS`, and `ARTICLE TOC` use the same font size
- pane headers share the same top padding and bottom spacing
- the first content row below each header aligns consistently across panes

Typography goals:

- compact, neutral, desktop-oriented
- strong legibility over personality
- no oversized page hero styling inside the docs workspace

## Visual Simplification Rules

The redesign should explicitly remove the remaining web-card feeling from the docs area.

Remove:

- page-level intro block
- rounded outer docs workspace shell
- boxy directory buttons
- boxy TOC links
- extra background fills that create card-in-card layering

Keep:

- clear labels
- calm spacing
- visible pane dividers
- readable content rhythm

## Sidebar Action Migration

The docs page currently owns `新建批次` and `返回评审任务` as page-level actions. In the new design:

- these actions should no longer appear in a docs page header
- they should move into the main application sidebar footer area
- the sidebar footer treatment should remain secondary to the primary navigation list

This keeps docs focused on reading while preserving quick operational exits.

## Component and File Impact

Primary files expected to change:

- `app/docs/page.tsx`
- `components/docs-shell.tsx`
- `components/app-sidebar.tsx`
- `app/globals.css`
- associated docs and sidebar tests

Expected structural changes:

- `app/docs/page.tsx` removes `PageIntro` and renders the docs workspace directly
- `DocsShell` drops left/right collapse state and renders a fixed three-pane shell
- `AppSidebar` gains a footer action area for `新建批次` and `返回评审任务`
- shared CSS replaces surface/card styling in the docs workspace with pane styling

## Accessibility and Behavior

- All panes remain keyboard reachable
- Active document state should still be reflected via `aria-current` or equivalent active semantics
- Article TOC links remain valid anchors
- Focus states must remain visible after flattening the visual style
- Pane scrolling must not cause the whole page to feel unstable

## Responsive Behavior

Desktop is the priority for this redesign.

For narrower widths:

- the desktop three-pane layout may stack or compress according to existing responsive rules
- desktop pane behavior must remain the primary target
- responsive fallback should avoid horizontal overflow when possible

This pass should not compromise the desktop layout in order to over-optimize mobile presentation.

## Testing Expectations

Update tests to reflect the new workspace model:

- docs page no longer expects a `PageIntro`
- docs shell still renders three semantic regions
- docs shell no longer expects collapse toggles
- tests should assert pane presence and active document switching
- style token tests may need updates if docs-specific pane rules become part of shared shell expectations

## Implementation Notes

- Prefer reusing the existing docs data model
- Keep the DOM simple and explicit
- Avoid introducing another generic card abstraction for pane chrome
- Use borders and spacing as the main grouping tools

## Self-Review

Checked for:

- no placeholder text
- no conflicting guidance about header presence or button placement
- scope limited to the docs workspace and related sidebar action migration
- clear pane widths, divider rules, and scrolling behavior
