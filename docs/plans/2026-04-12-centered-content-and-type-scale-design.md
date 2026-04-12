# Centered Content And Type Scale Refresh Design

## Goal

Tighten the main reading width across the app so most pages feel centered and breathable on large screens, while also lowering oversized type so the interface reads more like a working tool than a poster.

## Design Direction

The new default should be:

- Most pages use a centered single-column content well
- Main content should visually occupy about 60% to 68% of the viewport on large screens
- Left and right breathing room is a first-order layout rule, not an afterthought
- Split layouts are reserved for pages with genuinely parallel content, such as review detail

This means "帮助", "新建评审", "评审列表", "规则管理", and "模型设置" should all read as centered pages first. Home can remain more expressive, but it should still stop stretching edge-to-edge. Review detail can stay dual-pane, but both panes should sit inside a centered frame rather than using the full window.

## Layout Rules

### 1. Centered content is the default

The app should adopt a stronger centered content shell for page bodies. Instead of letting panels naturally expand to near-full width, page-level content should sit inside a constrained container with consistent side margins.

Recommended behavior:

- Global app shell remains responsive
- Standard page content is constrained by a centered max-width rule
- Dense or document-heavy pages may opt into a slightly wider frame, but still remain centered

This creates a predictable rhythm:

- navigation and chrome
- centered page header
- centered primary content

### 2. Single-column before split layout

If a page does not contain two simultaneously valuable reading streams, it should not use a left-right layout. This keeps attention on the task and prevents static helper content from claiming horizontal space.

Implication by page:

- `/docs`: centered document page
- `/reviews`: centered task page
- `/reviews/new`: centered launch form
- `/rules`: centered management page
- `/models`: centered management page
- `/`: still allowed to use richer layout blocks, but those blocks should live inside a centered content frame
- `/reviews/[id]`: asymmetric split layout within a centered frame

### 3. Type should step down one level

Several page and card text styles currently read too large for a tool UI. The adjustment should be modest but global:

- section titles shrink slightly
- hero title shrinks slightly
- supporting copy becomes less billboard-like
- list item titles and document paragraphs become a touch denser

The intent is not to flatten hierarchy. It is to reduce visual noise and let spacing, grouping, and contrast carry more of the structure.

## Page-Specific Changes

### Homepage

Homepage remains an operations dashboard, but its content blocks should sit inside a centered frame and stop feeling stretched across the full screen. Grid sections can remain, but should use narrower bounds and slightly smaller headings/copy.

### Help Page

Help page should be explicitly centered and treated like a reading page. It should not feel like a half-filled dashboard lane.

### Review Detail

Review detail keeps the non-symmetric dual-pane structure, but the whole layout should sit inside a centered width constraint. The source pane remains dominant, the issue pane remains secondary, and both should inherit slightly tighter typography.

## CSS Strategy

Use a small number of shared primitives rather than page-specific one-offs:

- strengthen the centered width behavior of `.page` / `.page-stack`
- add a wider-but-centered variant for detail-heavy pages if needed
- reduce global heading and supporting-copy scales slightly
- trim card/panel padding only where necessary after width changes

This keeps the system maintainable and makes future pages default to the right behavior.

## Success Criteria

- Most pages visually sit in the middle of the screen with obvious left/right breathing room on desktop
- Help page reads as a centered document page
- Homepage no longer feels edge-to-edge
- Review detail remains usable, but now lives inside a centered frame
- Titles and supporting text feel calmer and less oversized
