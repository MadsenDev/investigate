# Vitni 2 — product and migration plan

Status: **active migration**

Vitni 2 is a product and renderer redesign of Vitni, not a new application and not a new case format.

The existing Vitni repository remains canonical. The pre-Vitni-2 UI is preserved on the `legacy/v0.6-ui` branch and in Git history. Do **not** copy the old application into an `archive/` directory: Git is the archive.

## North star

Vitni should feel like **one investigation workspace**, not a collection of investigation tools.

The product should help an investigator answer four questions continuously:

1. **What do we know?**
2. **Why do we think we know it?**
3. **What conflicts with it or remains weak?**
4. **What needs attention next?**

Graph, Timeline, Sources, Assertions, Review, Search and Reports are different ways of answering those questions. They should share selection, context and evidence provenance rather than behaving like disconnected mini-apps.

## Product principles

### Evidence before decoration

Vitni's strongest differentiator is the chain:

`Evidence / Source -> Assertion -> Reviewed finding -> Report`

A relationship graph is useful, but it is not the source of truth. Assertions and their supporting or conflicting evidence are.

### Guide the investigation, do not expose the database

Users should not need to understand Vitni's internal model before they can work. Prefer language such as:

- "Needs attention"
- "Unsupported assertion"
- "Conflicting evidence"
- "Unreviewed claim"
- "No source attached"

rather than asking the user to infer meaning from raw review-state fields.

### Progressive disclosure

The default surface should expose the current investigation, important changes, weak/conflicting claims and the current selection. Advanced filters, transforms, AI and detailed metadata should remain available without competing with primary work.

### One contextual inspector

Selecting an entity, assertion, source, relationship or event anywhere should update one consistent Inspector surface. The Inspector owns contextual detail; individual workspaces should not invent incompatible detail panels.

### Views talk to each other

A selection made in Graph should be meaningful in Timeline and Inspector. A Needs Attention item should take the user directly to the relevant assertion/evidence context. Search should land in the same selection model.

### AI is subordinate to evidence

AI may extract, summarize, suggest relationships, surface contradictions or assist reporting. AI output must remain distinguishable from reviewed case facts and should enter the workflow as suggestions or unreviewed assertions.

## Runtime decision: stay on Electron

Vitni 2 remains **Electron + React**.

Reasons:

- Vitni already has a working and newly modernized Electron 43 main/preload boundary.
- Native SQLite via `better-sqlite3`, local file/project management, process spawning, local AI integration, packaging and release workflows already work.
- The current product problem is renderer UX and information architecture, not the desktop runtime.
- Replatforming to Tauri while redesigning the product would combine two high-risk migrations without user benefit.

A future Electron -> Tauri evaluation is allowed **after Vitni 2 stabilizes**. If Vitni were started from scratch today, Tauri + React + Rust + SQLite would be worth serious consideration, but that is not sufficient reason to discard working infrastructure now.

## Repository strategy

Canonical repository: `vardirhq/vitni`

Preservation branch: `legacy/v0.6-ui`

Active migration branches use the `agent/vitni-2-*` prefix.

During migration, new renderer code lives under `app/renderer/src/v2/`. The old renderer remains available while workflows move incrementally. Once Vitni 2 provides the intended workflow parity, v2 becomes the canonical renderer and superseded UI code is deleted from `main`.

Do not maintain two permanent applications.

## Workflow parity, not feature parity

Vitni 2 does not need to reproduce every existing button before becoming canonical.

The replacement threshold is that these workflows are clearly usable and materially better than the legacy UI:

- create/open a case
- add/import evidence
- create and inspect entities
- create and inspect relationships
- create assertions and attach sources
- understand what needs attention and why
- investigate through graph and timeline
- search and navigate to context
- resolve/review assertions
- produce a source-traceable report/export

Existing features that do not support those workflows should be evaluated rather than copied automatically.

## Information architecture

### Primary workspace

- **Overview** — case status, activity, attention queue, focused graph/timeline context
- **Graph** — relationships and focused network exploration
- **Timeline** — chronology and event context
- **Entities** — structured case objects
- **Assertions** — claims and their evidence state
- **Sources** — evidence/source catalog and usage
- **Needs Attention** — investigation quality-control queue; replaces Review as the user-facing concept
- **Saved Views** — reusable investigative perspectives

### Case operations

- **Evidence** — intake and attachment workflow
- **Reports** — findings and report generation
- **Exports** — portable outputs
- **Investigation Profiles** — profile-specific defaults/terminology

### Tools

- Search
- AI Assistant
- Transforms
- Settings

Transforms are useful but should not visually compete with the investigation itself.

## Shared selection model

Vitni 2 treats selection as application-level context.

Conceptually:

```ts
type InvestigationSelection =
  | { kind: 'entity'; id: string }
  | { kind: 'relationship'; id: string }
  | { kind: 'assertion'; id: string }
  | { kind: 'source'; id: string }
  | { kind: 'event'; id: string }
  | null;
```

The same selection drives:

- Inspector
- workspace highlighting
- Graph focus
- Timeline focus
- search navigation
- Needs Attention handoff

The existing legacy `selectedNodeId`/`selectedEdgeId` state can be bridged during migration, but new v2 components should target the unified abstraction.

## Needs Attention

The existing assertion review state remains valid persisted data. Vitni 2 adds a user-facing derived layer called **AttentionItem**.

Initial reasons require no schema migration:

```ts
type AttentionReason =
  | 'unsupported'
  | 'disputed'
  | 'unreviewed'
  | 'unverified';
```

Initial rules:

- assertion source ID is missing or cannot be resolved -> `unsupported`
- review state is `disputed` -> `disputed`
- review state is `unreviewed` -> `unreviewed`
- confidence is `unverified` -> `unverified`

One assertion may have several reasons but should appear once in the queue with ordered reasons.

Future reasons may include stale review, contradictory source sets, missing required fields, duplicate entities, unresolved AI suggestions and import validation failures once the underlying data supports those states honestly.

The queue must always explain **why** the item appears and provide a concrete next action.

## Overview

The Overview is the home of an open investigation. It should answer "where are we?" without requiring the user to choose a tool first.

Initial content:

- entity count
- assertion count
- source count
- needs-attention count
- recent case activity derived from entity/assertion/source timestamps
- top attention items with reasons
- focused relationship summary
- recent/important event summary
- contextual Inspector when something is selected

Do not invent an overall numeric "case confidence" score until there is a defensible model for it. A percentage looks authoritative even when its calculation is arbitrary.

## Graph

Graph remains a primary Vitni capability but should answer questions rather than display the entire database by default.

Priorities:

- focus / neighborhood exploration
- type and relationship filtering
- evidence/review strength indication
- stable orientation and saved perspectives
- selection synchronized with Inspector/Timeline
- progressive disclosure for large cases
- clear edge semantics

Avoid "spaghetti graph" as a default state.

## Timeline

Timeline should use the same selection context and support:

- event/type filtering
- scale changes
- grouping related events
- highlighting selected entities/assertions/sources
- jumping between graph relationships and chronology

## Inspector

Inspector is consistent across workspaces.

Entity tabs initially:

- Details
- Relationships
- Assertions
- Sources

Assertion Inspector should prominently show:

- claim/path/value
- review state
- confidence
- supporting source
- attention reasons
- review note/history where available

Source Inspector should show source metadata plus every assertion/entity using it.

## Evidence intake

Long-term intake flow:

1. add evidence
2. preview/extract
3. suggest entities/events/assertions
4. detect likely duplicates/conflicts
5. assign provenance
6. explicitly confirm mutations

CSV, documents, media and AI extraction should converge on this flow rather than remaining unrelated entry points.

## Reports

Reports should be traceable rather than merely attractive.

The report model should be able to preserve:

`Finding -> assertion(s) -> source(s) -> original evidence`

Deterministic report structure comes before optional AI prose.

## Visual direction

The Vitni 2 mockup direction is a useful target, not a literal pixel contract:

- dark, restrained investigative workspace
- stronger hierarchy than legacy Vitni
- left navigation, central workspace, right contextual Inspector
- clear panels without turning the product into a generic card dashboard
- purple used as Vitni identity/accent, not everywhere
- semantic status colors only where they communicate meaning
- dense enough for professional work, but with progressive disclosure

Claude Design or another design pass may refine the visual system. Product workflow and evidence semantics take precedence over cosmetic fidelity.

## Migration phases

### Phase 0 — preservation and documentation

- [x] Keep canonical repository
- [x] Preserve legacy UI on `legacy/v0.6-ui`
- [x] Stay on Electron for Vitni 2
- [x] Document product north star and migration rules

### Phase 1 — Vitni 2 foundation

- [ ] Create `app/renderer/src/v2/`
- [ ] Add v2 workspace/navigation model
- [ ] Add unified investigation selection model
- [ ] Add shared v2 shell components and design tokens
- [ ] Add Overview workspace using real current case data
- [ ] Add contextual Entity/Assertion/Source Inspector foundation
- [ ] Add derived Needs Attention model and tests
- [ ] Add migration toggle so legacy UI remains available during development

### Phase 2 — core investigation model

- [ ] Entities workspace
- [ ] Assertions workspace
- [ ] Sources workspace
- [ ] Needs Attention full workflow
- [ ] review actions from attention context
- [ ] source/assertion provenance presentation

### Phase 3 — Graph

- [ ] migrate/rebuild graph into v2 shell
- [ ] focus mode / neighborhood navigation
- [ ] shared selection integration
- [ ] relationship/evidence filtering
- [ ] large-case progressive disclosure
- [ ] saved view compatibility

### Phase 4 — Timeline

- [ ] migrate timeline into v2 shell
- [ ] shared selection integration
- [ ] entity/source/assertion highlighting
- [ ] scale/type/group controls

### Phase 5 — Evidence intake

- [ ] unified evidence entry point
- [ ] attachment/media intake
- [ ] CSV intake migration
- [ ] extraction suggestion review
- [ ] duplicate/conflict checks before mutation

### Phase 6 — reporting and conclusions

- [ ] reviewed findings workflow
- [ ] citation/evidence appendix model
- [ ] deterministic reports
- [ ] optional AI narrative assistance
- [ ] reproducible export bundle

### Phase 7 — remaining capabilities

Evaluate and migrate where justified:

- transforms
- local/cloud AI
- media library
- investigation profiles
- personalization
- advanced settings
- terminology
- tutorials

### Phase 8 — canonical switch

- [ ] workflow-parity audit using Operation Glass Harbor
- [ ] migration/compatibility test existing case folders
- [ ] make Vitni 2 default renderer
- [ ] remove superseded legacy renderer code from `main`
- [ ] update manual/screenshots
- [ ] release as an intentional major product milestone

## Validation case

Use `samples/operation-glass-harbor.vitni` as the primary UX integration case during migration.

Every phase should be exercised as an investigator, not only compiled:

- Where do I go next?
- Why is this item here?
- What supports this claim?
- What conflicts with it?
- Can I get from evidence to conclusion without learning Vitni's implementation vocabulary?

If the answer repeatedly requires documentation, the UI still needs work.

## Engineering guardrails

- Existing case files remain readable throughout the migration.
- Do not create a second persisted case model for v2.
- Reuse main/preload/domain functionality unless there is a concrete reason to replace it.
- New v2 product state should be explicit and testable.
- Prefer derived UI models over database migrations when the data already exists.
- Add schema migrations only for durable product concepts, not presentation convenience.
- Keep CI green while v2 is opt-in.
- Maintain `[Unreleased]` changelog entries as phases land.

## Current implementation log

This section is deliberately maintained as work progresses so future sessions do not need conversation history.

- 2026-08-18: Vitni 2 direction approved. Keep Electron and existing repository. Preserve old UI with Git rather than an archive directory.
- 2026-08-18: Created `legacy/v0.6-ui` preservation branch.
- 2026-08-18: Started `agent/vitni-2-foundation` for Phase 1.
