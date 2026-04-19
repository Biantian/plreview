# Desktop Surface Refactor Retrospective (2026-04-20)

## Summary

This delivery finished two closely related desktop refinements:

1. flattening the global workspace away from nested web-card surfaces
2. rebuilding the help docs area into a three-pane desktop reader

The code changes landed successfully, but the final acceptance feedback also exposed a product rule that should remain explicit going forward: user-facing copy must stay operational and content-oriented, not explanatory about layout intent or design rationale.

## What Worked

### Desktop pane framing was clearer than card framing

Replacing nested cards with edge-aligned panes, borders, and shared workspace rails made the app feel more like a docked desktop surface and less like a responsive website.

The strongest improvements came from a few simple rules:

- remove outer canvas cards before tuning inner components
- use `1px` dividers instead of stacked shadows
- keep side rails visually quiet and structurally fixed
- let the content area read as a continuous surface

### Help docs benefited from a real master-detail layout

The docs page became easier to scan once it was split into:

- a fixed directory pane
- a flexible reading pane
- a fixed article TOC pane

Independent vertical scrolling inside each pane was important. Without that behavior, the layout would have looked right but still felt like a long web page.

### Sidebar actions reduced local page chrome

Moving `新建批次` and `返回评审任务` out of the docs page header and into the app sidebar footer helped the docs page stay focused on reading instead of competing with global controls.

## What We Learned

### Do not ship design-rationale copy in the UI

Acceptance feedback made this rule unambiguous: the frontend should not explain design intent to users.

Bad examples include copy that tells the user:

- why the layout is structured a certain way
- how panes conceptually relate to each other
- what reading flow the design expects them to follow

That kind of explanation belongs in specs, plans, or internal docs, not in product surfaces. User-facing text should describe the thing itself, the current state, or the next available action.

### Flat layouts require scoped styling discipline

When surfaces become flatter, shared selectors become riskier. During this work we had to scope docs-only reader styles so the help page changes would not leak into other reading surfaces.

The lesson: when removing shells and card wrappers, verify whether the remaining CSS is generic infrastructure or page-specific decoration. Flattening one page can easily destabilize another if selectors stay too broad.

### Acceptance criteria should include copy constraints, not just layout constraints

The initial implementation satisfied the structure and spacing requirements, but acceptance still found a gap because the page contained explanatory copy that did not belong in the shipped UI.

Future specs for desktop refinements should explicitly call out:

- prohibited design-rationale copy
- which instructional text is still allowed
- whether headings are purely structural or also descriptive

## Regression Guardrails Added

This work now has stronger protection in automated coverage:

- docs page structure tests assert the three-pane workspace contract
- sidebar tests assert the relocated footer actions
- global style tests assert the docs workspace shell rules
- a user-facing copy test blocks specific design-rationale phrases from being reintroduced

The copy test is especially valuable because this class of issue is easy to reintroduce during otherwise harmless content tweaks.

## Follow-Up Working Rules

For future desktop UI cleanup passes:

1. remove the biggest enclosing card first
2. convert layout separation to rails and `1px` dividers before adjusting component cosmetics
3. keep operational actions at stable app edges instead of local hero headers
4. ban design-rationale storytelling from user-facing surfaces
5. add regression coverage for both structure and copy before closing the branch
