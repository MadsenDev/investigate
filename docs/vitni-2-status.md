# Vitni 2 — implementation status

Last updated: **2026-08-18**

This file is the short operational companion to [`vitni-2.md`](./vitni-2.md). The product principles and long-term migration contract live there; this file records what has actually landed or is actively being validated so a later development session can resume without relying on conversation history.

## Preservation / architecture

- ✅ Canonical repository remains `vardirhq/vitni`.
- ✅ Legacy UI preserved on `legacy/v0.6-ui`.
- ✅ Electron remains the Vitni 2 runtime; no Tauri migration during the renderer/product redesign.
- ✅ Existing SQLite case model, Electron main/preload boundary, IPC, settings, imports, media, reporting and release infrastructure are reused.
- ✅ New UI lives under `app/renderer/src/v2/` during migration.
- ✅ Renderer can be selected with `?ui=v2` or `?ui=legacy`; the choice is persisted in local storage.
- ✅ Fresh installs remain on the legacy renderer until Vitni 2 reaches the canonical-switch threshold.

## Foundation implemented on PR #17

### Shell and shared context

- ✅ Case-oriented left navigation.
- ✅ Investigation top bar.
- ✅ Shared Vitni 2 workspace store.
- ✅ Application-level `InvestigationSelection` covering entity, relationship, assertion, source and event context.
- ✅ Shared contextual Inspector.
- ✅ V2 selection is bridged to legacy selected node/edge state where existing components need it.
- ✅ Existing Settings UI is bridged into Vitni 2 rather than duplicated.
- ✅ Explicit Legacy UI escape hatch during migration.

### Overview

- ✅ Uses real current case data, not mock metrics.
- ✅ Entity count.
- ✅ Assertion count.
- ✅ Source count.
- ✅ Needs Attention count.
- ✅ Recent activity derived from entity/assertion/source timestamps.
- ✅ Top attention items with human-readable reasons.
- ✅ Relationship summary based on real graph degree/edges.
- ✅ Event/incident chronology summary.
- ✅ Does **not** invent an overall case-confidence percentage.

### Needs Attention / Review redesign

- ✅ Derived `AttentionItem` model built from existing persisted assertions, sources, review state and confidence.
- ✅ Initial reasons: `unsupported`, `disputed`, `unreviewed`, `unverified`.
- ✅ One assertion appears once even when several reasons apply.
- ✅ Severity derived from reasons.
- ✅ Unit tests cover derivation and priority behavior.
- ✅ Dedicated Needs Attention workspace.
- ✅ Filter by attention reason.
- ✅ Selecting an item opens the same assertion Inspector used elsewhere.
- ✅ Accept / Dispute / Reject write through the existing assertion review API.
- ✅ Unsupported assertions cannot be accepted until their source resolves.
- ✅ Review state and confidence are deliberately separate: accepted + unverified claims remain as explicit verification work.
- ✅ Rejected claims are completed analyst decisions and leave Needs Attention.
- ✅ Assertion-scoped audit history is readable in the resolution panel, preserving prior review/evidence decisions instead of showing only current state.
- ⏳ Future: stale-review detection, source-content contradiction modelling, missing-field attention and AI suggestion review.

### Entities / Assertions / Sources

- ✅ Searchable Entities workspace with type filtering, connection counts and attention counts.
- ✅ Searchable Assertions workspace with review-state filtering, confidence/review state and attention status.
- ✅ Searchable Sources workspace with source usage counts.
- ✅ All three open the shared Inspector.
- ✅ Entity Inspector tabs: Details, Relationships, Assertions, Sources.
- ✅ Assertion Inspector: claim, review state, confidence, source, attention reasons and review note.
- ✅ Source Inspector: metadata and assertion/entity usage.
- ✅ Relationship Inspector: endpoints and properties.

### Graph

- ✅ Existing proven Cytoscape `GraphCanvas` reused inside the Vitni 2 shell.
- ✅ Search.
- ✅ Entity type filtering.
- ✅ Selected-entity neighborhood focus mode.
- ✅ Existing graph layout presets can run.
- ✅ Fit-to-screen.
- ✅ Entity/relationship selection shares the global Inspector context.
- ⏳ Relationship/evidence-strength filtering.
- ⏳ Better large-case progressive disclosure and clustering.
- ⏳ Saved-view compatibility in the new shell.
- ⏳ Selection-aware handoff into Timeline beyond event selection.

### Timeline

- ✅ Dedicated Vitni 2 Timeline workspace.
- ✅ Uses real `event` and `incident` entities.
- ✅ Parses common event-date properties with creation timestamp as fallback.
- ✅ Search and event/incident filtering.
- ✅ Chronological grouping by year.
- ✅ Event selection uses the same global Inspector context.
- ⏳ Scale controls and richer grouping.
- ⏳ Highlight/filter chronology by selected entity, assertion or source.

### Search

- ✅ `Ctrl/Cmd+K` opens Vitni 2 investigation search.
- ✅ Reuses existing indexed search implementation.
- ✅ Searches entities, relationships, assertions and sources.
- ✅ Search results land in the shared selection/Inspector model.
- ⏳ Saved investigative perspectives remain to be integrated with this surface.

### Evidence

- ✅ Dedicated Evidence workspace.
- ✅ Shows total, linked, unlinked and media-source counts.
- ✅ Recent evidence list opens source context in Inspector.
- ✅ Existing media library is available from the new workspace.
- ✅ Existing CSV import is available from the new workspace.
- ✅ Existing source-attachment flow can attach evidence to the currently selected entity/event.
- ✅ Existing media-library selection flow is preserved when attaching an existing source.
- ✅ Evidence intake surfaces unlinked material and probable duplicate source groups using deterministic hash/locator checks.
- ⏳ Unified preview/extraction review flow.
- ⏳ Suggested entity/event/assertion staging before mutation.
- ⏳ Richer contradiction signals between source contents/claims.

### Reports

- ✅ Dedicated Reports workspace.
- ✅ Shows accepted assertions, cited sources and high-priority unresolved attention items.
- ✅ Existing report generator remains functional through a bridge.
- ✅ UI communicates the intended Evidence → Assertion → Finding → Report chain.
- ⏳ Durable Finding model/workflow.
- ⏳ Deterministic citation/evidence appendix model.
- ⏳ Reproducible report/export bundles.
- ⏳ AI narrative assistance only after deterministic findings/citations are established.

## Visual capture / screenshot infrastructure

- ✅ PR #17 is merged and Vitni 2 foundation is now on `main`.
- ✅ PR #18 is merged and provides deterministic real-Electron screenshot capture infrastructure.
- ✅ Screenshot mode opens the repository showcase investigation before renderer boot and forces Vitni 2.
- ✅ Capture uses Electron `webContents.capturePage()` rather than a browser mock.
- ✅ Fixed screenshot viewport: 1600×1000.
- ✅ Renderer exposes a screenshot-only workspace navigation hook guarded by `?screenshot=1`.
- ✅ Planned capture set: Overview, Graph, Timeline, Entities, Assertions, Sources, Needs Attention, Evidence, Reports, Search.
- ✅ GitHub Actions prepares the sample SQLite database, launches Electron under Xvfb, and preserves screenshot/diagnostic artifacts for 14 days.
- ✅ Screenshot workflow is manual-only through `workflow_dispatch`; it does not run on normal pull requests or pushes because rebuilding Electron/native SQLite is intentionally expensive.
- 🚧 Production renderer readiness still needs to be fully proven before the ten-workspace capture set is considered reliable.

Rule going forward: run the manual screenshot workflow at meaningful Vitni 2 visual checkpoints, then review the real Electron artifact alongside normal CI. Screenshot generation must not block routine PR iteration.

## Deliberately not migrated yet

These currently show an explicit migration state or remain accessible through legacy/settings surfaces. They should not be copied blindly; each should be evaluated against the Vitni 2 product model.

- Transforms
- Saved Views / saved investigative perspectives
- AI Assistant workspace
- Investigation Profiles dedicated workspace
- Export management outside report generation
- terminology management as a dedicated v2 surface
- tutorials/onboarding
- advanced personalization UX

## Recommended next work

### PR #19 — Attention + evidence workflow depth (active)

- ✅ `Needs Attention` now exposes evidence and analyst-decision context instead of acting as an abstract queue.
- ✅ Review state and confidence are separate, explicit axes; accepted + unverified claims remain as verification work.
- ✅ Rejected claims are completed decisions and leave the queue.
- ✅ Assertions can attach or replace an existing evidence source in place, preserving assertion identity.
- ✅ Evidence relinking validates source existence in the main process.
- ✅ Review notes, review metadata, confidence changes, and evidence-link decisions are persisted/audited.
- ✅ Assertion review/evidence audit history is readable directly from the resolution panel.
- ✅ Evidence intake surfaces unlinked sources and deterministic duplicate signals.
- ⏳ Full source-content contradiction modelling remains future work.
- ⏳ Unified preview/extraction staging before case mutation remains future work.

### PR #20 — Graph + timeline investigation flow

- relationship/evidence filtering
- neighborhood expansion controls
- selected-entity chronology
- selected-source/assertion highlights
- saved investigative perspectives
- larger-case performance/decluttering pass

### PR #21 — Findings + reporting

- durable finding concept if the existing schema cannot express it cleanly
- deterministic finding → assertion → source provenance
- report citations/evidence appendix
- reproducible export bundle
- optional AI narrative on top, never as source of truth

### PR #22 — Remaining capability migration

Evaluate transforms, AI, profiles, personalization, terminology and onboarding. Remove features that do not earn a place in the Vitni 2 workflow instead of preserving them out of nostalgia.

### Canonical-switch PR

Only after an end-to-end Operation Glass Harbor workflow audit:

1. Create/open case.
2. Add/import evidence.
3. Inspect/create entities and relationships.
4. Create assertions and attach sources.
5. Understand and resolve Needs Attention.
6. Investigate through Graph and Timeline.
7. Search without losing context.
8. Produce a traceable report/export.

When those workflows are materially better than the legacy renderer, Vitni 2 becomes default and superseded legacy renderer code is deleted from `main`. Git history and `legacy/v0.6-ui` remain the archive.
