# Documentation Checklist

Use this checklist before merging a change that touches user workflows, developer commands, build/distribution steps, or repository-facing project documentation.

## 1. Choose The Right Home

- Is this an entry-point summary for newcomers?
  - Put it in `README.md`.

- Is this an in-product usage explanation for people already inside the app?
  - Put it in `app/docs/page.tsx`.

- Is this a build, packaging, signing, notarization, or platform distribution procedure?
  - Put it in `docs/deployment/`.

- Is this a smoke test, validation checklist, or retrospective?
  - Put it in `docs/qa/`.

- Is this design rationale, scope discussion, or implementation planning?
  - Put it in `docs/plans/` or `docs/superpowers/`.

## 2. Check Update Triggers

- Did navigation, page responsibilities, or the primary usage flow change?
  - Review `README.md`
  - Review `app/docs/page.tsx`

- Did commands, environment variables, scripts, or packaging behavior change?
  - Review `README.md`
  - Review `docs/deployment/`
  - Review related `docs/qa/` files

- Did only implementation details change?
  - Update design, plan, or QA docs instead of expanding entry docs

## 3. Apply Writing Rules

- Describe the current behavior directly.
- Avoid “不再…而是…”, “已经改成…”, or similar migration narration in entry docs.
- Avoid vague or colloquial labels such as “朋友试用”.
- Prefer explicit scope labels such as “非正式分发”, “正式发布”, or “小范围内部试装”.
- Keep one section focused on one audience and one question.

## 4. Keep README Short

- `README.md` should cover:
  - what the project is
  - current status
  - quick start
  - common commands
  - links to deeper docs

- Move long specialized instructions into `docs/` and replace them with links.

## 5. Verify Against Source Of Truth

- Commands match `package.json`
- Environment variables match `.env.example`
- Packaging instructions match current scripts and platform flow
- User help reflects current UI flow and actual capabilities

## 6. Final Review

- Did this document stay within its audience boundary?
- Did any long subsection deserve its own file?
- Are links pointing to the right place?
- Would a new reader know where to go next?
