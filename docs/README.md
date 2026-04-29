# Documentation Layout

This repository keeps planning, design, and validation documents under `docs/`.

## Directory Rules

- `docs/deployment/`
  - Build, packaging, notarization, platform distribution, and release-adjacent operational notes.
  - Use this for platform-specific delivery instructions that are too detailed for the top-level `README.md`.

- `docs/plans/`
  - Product, architecture, and implementation planning documents that belong to the project itself.
  - Use this for human-authored or project-level plans that are not specific to the superpowers workflow.

- `docs/superpowers/specs/`
  - Design/spec documents produced through the superpowers brainstorming/spec flow.
  - These describe the intended solution and user-facing behavior before implementation.

- `docs/superpowers/plans/`
  - Step-by-step implementation plans produced from approved specs.
  - These are execution-oriented documents and should stay tracked when they drive real work.

- `docs/qa/`
  - Validation checklists, smoke-test notes, regression policies, and retrospectives.

## Audience And Ownership

- `README.md`
  - Audience: first-time readers, maintainers, and contributors who need the fastest accurate entry point.
  - Owns: project summary, current status, quick start, common commands, and links to deeper docs.
  - Must not become: a release retrospective, architecture diary, or platform-specific operations dump.

- `app/docs/page.tsx`
  - Audience: end users already inside the product.
  - Owns: operational guidance for product flows, page-to-page actions, and user-visible failure handling.
  - Must not include: implementation details, design rationale, internal migration notes, or release engineering instructions.

- `docs/deployment/`
  - Audience: developers handling build, packaging, signing, notarization, and distribution.
  - Owns: platform-specific build and release instructions that are too detailed for `README.md`.

- `docs/qa/`
  - Audience: developers and reviewers validating delivery quality.
  - Owns: smoke tests, regression checklists, incident validation notes, and retrospectives.

- `docs/plans/` and `docs/superpowers/`
  - Audience: people making or reviewing implementation decisions.
  - Owns: design rationale, solution proposals, execution plans, and design-stage tradeoffs.

## Tracking Policy

- All documents under `docs/` are tracked by default.
- Do not leave active specs or plans untracked if they influenced implementation, review, or acceptance.
- Temporary personal notes should live outside `docs/` if they are not meant to be versioned.

## Update Triggers

- If navigation, primary entry flows, onboarding, or user-facing page responsibilities change:
  - Review `README.md`
  - Review `app/docs/page.tsx`

- If commands, environment variables, build scripts, packaging flow, signing, notarization, or distribution instructions change:
  - Review `README.md`
  - Review `docs/deployment/`
  - Review any affected `docs/qa/` checklist

- If only implementation internals change and no user or operator workflow changes:
  - Prefer updating `docs/plans/`, `docs/superpowers/`, or `docs/qa/`
  - Do not expand `README.md` or in-product help unless the reader-facing workflow also changed

- If a document grows because a subsection serves a specialized audience:
  - Move the longform content into a dedicated file under `docs/`
  - Keep the top-level document as a short summary plus links

## Writing Rules

- State the current truth directly. Prefer “当前使用…” over “不再…而是…”.
- Keep one document focused on one audience and one primary purpose.
- Put migration history, rationale, and tradeoff discussion in plans/specs or retrospectives, not in entry docs.
- Avoid colloquial labels such as “朋友试用” or “熟人试用”. Use bounded terms such as “非正式分发” or “小范围内部试装”.
- Prefer short sections and concrete commands. If a section turns into a specialized runbook, split it into `docs/`.

## Naming

- Use dated filenames when the document records a concrete work item or milestone:
  - `YYYY-MM-DD-topic-name.md`
- Prefer keeping related design and implementation documents in the same family of names.

## Current Convention

- Design first:
  - `docs/plans/...-design.md` or `docs/superpowers/specs/...-design.md`
- Implementation next:
  - `docs/plans/...-implementation-plan.md` or `docs/superpowers/plans/...`
- Validation after delivery:
  - `docs/qa/...`

## Practical Rule

If a document is important enough to guide code changes, explain a decision, or support later review, it should be committed.

See also: [documentation-checklist.md](./documentation-checklist.md)
