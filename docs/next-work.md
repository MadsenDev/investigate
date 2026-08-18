# Vitni — Near-term work

Vitni has enough product surface now that the next phase should focus less on adding isolated features and more on making investigations feel coherent, durable, and release-ready.

## Immediate product priorities

### 1. Evidence and source workflow audit

The assertion/source model is Vitni's strongest differentiator. Audit the full path from importing or attaching evidence through promoting facts, resolving conflicts, reviewing assertions, and exporting defensible findings.

Focus on:

- friction when attaching or reusing sources
- visibility of source provenance while editing fields
- conflict handling when multiple assertions target the same property
- confidence/review-state clarity
- preserving source references in reports and exports

### 2. Investigation workspace UX pass

The graph is the daily-driver surface and should feel substantially more deliberate than a generic Cytoscape canvas.

Review:

- selection and multi-selection
- keyboard navigation and command palette coverage
- node creation and relationship creation
- layout switching and layout persistence
- canvas performance on larger cases
- inspector transitions and contextual actions
- filtering without losing orientation

### 3. Import and extraction pipeline

Move beyond the current CSV/PDF entry points toward a unified intake workflow where imported material becomes structured, reviewable case data rather than a pile of attachments.

Likely sequence:

1. intake preview
2. field/entity suggestions
3. source assignment
4. duplicate/conflict detection
5. explicit confirmation before case mutation

### 4. Reporting

Reports should expose why a conclusion is defensible, not merely restate nodes from the graph.

Improve:

- source citations and evidence appendix generation
- assertion confidence/review state in reports
- timeline-focused narrative reports
- person/entity profiles
- deterministic report generation before optional AI prose
- reproducible export bundles

### 5. Case integrity and recovery

Before 1.0, deliberately test the boring catastrophic paths humans only discover after losing a week of work.

Cover:

- migration failure and rollback
- interrupted writes
- corrupt or partially copied case folders
- missing attachments
- duplicate case opening
- backup/restore flow
- portable case export/import

## Engineering priorities

- Increase coverage outside the renderer. Main-process persistence, migrations, IPC boundaries, transforms, and report generation deserve direct tests.
- Add fixture-based migration tests covering representative historical case databases.
- Add smoke tests that create/open a case, write core entities/assertions, reopen it, and export a report.
- The runtime/toolchain modernization is now established on Node 22+, Electron 43, React 19, Vite 8, TypeScript 5.9, and Vitest 4. Follow up separately on the remaining tooling-only migrations such as ESLint flat config and whether Tailwind 4 is worth the CSS migration cost.
- Keep `CHANGELOG.md` current under `[Unreleased]`; CI now treats release metadata as part of correctness.

## Release workflow

The repository should follow this rhythm:

1. Normal work lands through PRs and must pass CI.
2. Changes accumulate under `CHANGELOG.md` → `[Unreleased]`.
3. Prepare a release with `npm run release:prepare -- <major|minor|patch>`.
4. The release preparation updates `package.json`, `package-lock.json`, the sample case manifest, and the changelog together.
5. Merge the release commit to `main`.
6. Run the Release workflow manually with no tag to release the version on `main`, or push the matching `vX.Y.Z` tag.
7. GitHub Actions validates metadata, packages Linux and Windows builds, produces checksums and provenance attestations, then publishes the GitHub Release.

## Suggested next session

Start with a focused evidence/source workflow audit against the existing sample case. That will tell us whether Vitni's strongest conceptual feature is actually pleasant to use before we spend time adding more surface area.
