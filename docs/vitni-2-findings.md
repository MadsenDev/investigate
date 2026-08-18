# Vitni 2 — Findings and report provenance

Last updated: **2026-08-18**

This document defines the Vitni 2 conclusion/reporting model introduced in PR #21. It is intentionally separate from the visual report template. The core rule is that presentation must never become the source of truth for an investigation.

## North star

Vitni treats the investigation chain as:

**Evidence → Assertion → Finding → Report**

- **Evidence / source** is original or imported material.
- **Assertion** is a specific claim about an entity/event that can be reviewed and assigned confidence.
- **Finding** is an investigator-authored conclusion supported by one or more assertions.
- **Report** is a presentation of reviewed findings plus their provenance.

A finding never directly owns source IDs. Its evidence is derived through its linked assertions. This prevents a source list from drifting away from the claims that actually justify the conclusion.

## Persistence

Migration `007_add_findings.sql` adds two tables:

### `finding`

- `id`
- `title`
- `body`
- `status`
- `created_at`
- `updated_at`

### `finding_assertion`

Join table between findings and assertions. It stores an explicit position so the support order is stable and export output is deterministic.

Deleting a finding deletes its finding/assertion links. Deleting an assertion removes only the corresponding link; the finding remains and will no longer be report-ready.

## Finding states

### Draft

Working conclusion. May have zero or more supporting assertions. Never appears in reviewed-findings provenance exports.

### Reviewed

A conclusion the investigator is prepared to include in a defensible report.

The main process refuses this transition unless:

1. at least one assertion is linked;
2. every linked assertion currently has `review_state = accepted`;
3. every linked assertion resolves to an existing source.

This is a persistence/API invariant, not merely a disabled UI control.

### Disputed

A finding whose conclusion is actively contested or under reconsideration. It remains in case history but does not enter report provenance.

### Withdrawn

A conclusion deliberately removed from active reporting without deleting its historical record.

## Report-ready findings

The renderer derives a finding health model from current case state. A finding is report-ready only when it is `reviewed` and all linked assertions remain accepted and sourced.

This is recalculated from live data. If a supporting assertion later becomes disputed or its source disappears, the finding automatically stops being report-ready even though its own status remains visible for review.

## Evidence bundle

The Reports workspace can export a deterministic provenance bundle containing:

- `findings-evidence.json`
- `findings-evidence.md`

The JSON format identifier is:

`vitni-findings-evidence-v1`

Only reviewed findings are included. Findings are ordered from persistent finding state, assertion links are ordered by their stored position, source records are sorted by ID, and each assertion embeds the source record it resolves to.

The Markdown file provides a human-readable form of the same chain and an evidence appendix containing source IDs, locators, kinds, and hashes when available.

## Narrative report integration

Existing HTML report generation remains the presentation engine during the Vitni 2 migration.

Every generated report directory now also receives the deterministic findings evidence JSON and Markdown files. This means the HTML narrative, optional AI-generated prose, copied attachments, and provenance files live in the same export directory.

The narrative layer therefore cannot silently redefine what evidence supports a finding.

## AI boundary

AI may eventually:

- propose wording for a finding;
- summarize reviewed findings;
- generate transitions/executive summaries;
- suggest that two findings overlap;
- identify claims that may need review.

AI must not:

- mark findings reviewed automatically;
- invent supporting assertions;
- create source provenance that does not exist;
- silently alter the deterministic evidence bundle;
- turn an unsupported conclusion into a report-ready finding.

Human review remains the authority boundary.

## Audit behavior

Finding creation and updates write audit records. Audit reasons record meaningful transitions such as status changes and support-link changes. Standalone evidence-bundle exports write a case-level audit event.

Deletion removes the finding but first records a deletion audit event so the action itself remains visible in case history.

## Reports workspace UX

The Vitni 2 Reports workspace now serves two jobs:

1. **Findings management** — create draft findings, attach/remove accepted assertions, inspect assertion/source provenance, change finding state, and identify report-readiness problems.
2. **Output** — export the deterministic evidence bundle or invoke the existing narrative report generator.

The workspace deliberately shows why a finding is not report-ready rather than presenting a mysterious validation error only at export time.

## Future work

The core provenance model should remain stable. Follow-up work may improve presentation without changing the chain:

- better finding editing and reordering;
- citation labels inside HTML/PDF narrative reports;
- report sections built directly from finding order;
- finding-specific notes/history UI;
- bundle schema/version migration tests;
- export signing or checksums;
- reproducibility tests against a fixed sample case;
- optional AI narrative generated strictly from reviewed findings.
