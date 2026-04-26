# DevFeed — Documentation

This folder is the source of truth for everything design, engineering, and process for **DevFeed** — an aggregator for engineering blogs from companies and individual creators.

> **Working name:** DevFeed (not yet purchased; see [`../PLAN.md`](../PLAN.md) for domain candidates).

## What's where

```
docs/
  README.md             ← you are here
  MOCKUPS.md            ← visual gallery of all 23 mockups
  EXECUTION-PLAN.md     ← phased agent runbook with mandatory test gates
  TESTING.md            ← what we test, how, and with what tools
  CI-CD.md              ← GitHub Actions YAML + Vercel + branch protection
  design/
    00-overview.md      ← brand, audience, IA, mockup index
    01-tokens.md        ← color, type, spacing, radius, shadow, motion
    02-components.md    ← component library: anatomy, states, props, a11y
    03-pages.md         ← every screen: layout, sections, states, edge cases
    04-flows.md         ← user + system flows as mermaid diagrams
    05-accessibility.md ← WCAG checklist, keyboard map, screen-reader notes
  assets/               ← (TODO) mockup PNGs to be copied here from
                        ~/.cursor/projects/Users-manoj-playground-cursor-trial/assets/
                        once we exit plan mode
```

## Reading order

### If you're reviewing the design

1. [`design/00-overview.md`](design/00-overview.md) — product north star
2. [`MOCKUPS.md`](MOCKUPS.md) — visual gallery (open in Cursor markdown preview to see images inline)
3. [`design/03-pages.md`](design/03-pages.md) — every screen documented
4. [`design/04-flows.md`](design/04-flows.md) — user flows as diagrams

### If you're reviewing the engineering plan

1. [`../PLAN.md`](../PLAN.md) — stack, schema, hosting, costs
2. [`EXECUTION-PLAN.md`](EXECUTION-PLAN.md) — phased runbook
3. [`TESTING.md`](TESTING.md) — test strategy
4. [`CI-CD.md`](CI-CD.md) — pipelines

### If you're about to write code (the agent)

1. [`EXECUTION-PLAN.md`](EXECUTION-PLAN.md) — find the current phase, read its goals + checkboxes
2. [`design/02-components.md`](design/02-components.md) — component you're building
3. [`design/03-pages.md`](design/03-pages.md) — page you're building
4. [`TESTING.md`](TESTING.md) — what tests this work needs
5. [`design/05-accessibility.md`](design/05-accessibility.md) — checklist before merge

## Status

- [x] Design tokens locked
- [x] Component library documented
- [x] All pages documented (unified publisher model: company + person)
- [x] All flows documented
- [x] All 23 mockups generated (10 hero + 9 secondary + 4 publisher-unification)
- [x] Mockups physically present in `assets/` and embedded in `MOCKUPS.md`
- [x] Execution plan written (12 phases with test gates)
- [x] Testing strategy written
- [x] CI/CD pipeline written (YAML ready to ship)
- [x] AI agent publisher type removed across schema, design spec, and mockups (2026-04-25)
- [ ] Old `/docs` folder at workspace root deleted (still pending shell op — has only "MOVED" stubs in it now)
- [ ] CI YAML files materialized into `.github/workflows/` (currently still inside `CI-CD.md` as code blocks)
- [ ] Implementation started (Phase 1)

## Open questions

1. Final brand name + domain — `DevFeed` is placeholder.
2. Whether the suggestion form requires auth or allows email-verified anonymous submissions — currently auth-required to prevent spam.
3. Whether to add Storybook in v1 or wait until Phase 11.
