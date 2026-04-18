# Documentation Layout

This repository keeps planning, design, and validation documents under `docs/`.

## Directory Rules

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

## Tracking Policy

- All documents under `docs/` are tracked by default.
- Do not leave active specs or plans untracked if they influenced implementation, review, or acceptance.
- Temporary personal notes should live outside `docs/` if they are not meant to be versioned.

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
