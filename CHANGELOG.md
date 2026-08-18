# Changelog

All notable changes to Vitni should be documented in this file.

This project loosely follows the spirit of [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and uses the version defined in `package.json`.

## [Unreleased]

### Added

- Started the opt-in Vitni 2 renderer migration under `app/renderer/src/v2/`, with the existing product preserved on `legacy/v0.6-ui` and the full product/migration contract recorded in `docs/vitni-2.md` plus a live implementation status in `docs/vitni-2-status.md`.
- Added a new investigation-oriented Vitni 2 shell with case navigation, top-level investigation search, a shared application selection model, and one contextual Inspector for entities, relationships, assertions, sources, and events.
- Added a live Overview workspace using real case data for entity/assertion/source counts, recent activity, attention items, relationship context, and event chronology without inventing an overall case-confidence score.
- Added a derived Needs Attention model and workspace that explains unsupported, disputed, unreviewed, and unverified assertions, includes unit tests, and writes Accept/Dispute/Reject actions through the existing persisted review API.
- Added Vitni 2 Entity, Assertion, Source, Graph, Timeline, Search, Evidence, and Reports workspaces. Existing Cytoscape graph rendering, media management, CSV import, source attachment, Settings, and report generation are reused behind the new product flow instead of being forked.
- Added pull-request and `main` CI covering release metadata, linting, type checking, renderer tests, and production builds.
- Added unified release tooling that validates and prepares `package.json`, `package-lock.json`, the sample case manifest, and `CHANGELOG.md` together, and can extract release notes for GitHub Releases.
- Added a tag/manual Release workflow that packages Linux and Windows builds, publishes checksums, and creates GitHub build-provenance attestations before publishing the release.
- Added a near-term Vitni product and engineering roadmap focused on evidence/source workflows, investigation UX, intake, reporting, and case integrity.

### Changed

- Reframed the user-facing Review concept for Vitni 2 as `Needs Attention`, preserving the existing persisted assertion review state while deriving concrete reasons and next actions from source, confidence, and review data.
- Kept Electron as the Vitni 2 runtime during the product redesign; a possible Tauri migration is explicitly deferred until the new product workflow stabilizes.
- Modernized the application baseline to Node 22+, Electron 43, React 19, Vite 8, TypeScript 5.9, Vitest 4, and compatible Electron/React build tooling; refreshed the dependency lockfile from a clean resolution and updated source/ref typings for the newer toolchain.
- Aligned Framer Motion with its current 12.43 dependency set so its renderer/runtime dependencies remain internally compatible after the dependency refresh.
- Raised the shared TypeScript output/library target to ES2022.
- Modernized the existing release packaging workflow so releases are gated by matching version/changelog metadata instead of starting only after a GitHub Release is manually created.
- Kept the existing `version:patch`, `version:minor`, and `version:major` commands as aliases for the unified release preparation flow.

## [0.6.0]

### Added

- Added a GitHub Release workflow that builds Linux and Windows packages and uploads the generated artifacts to the release.
- Added a `1.0.0` release-readiness checklist covering product scope, release quality, smoke testing, privacy, documentation, and maintenance.

### Changed

- Refreshed the README with current screenshots, clearer workflow coverage, sample-case instructions, and links into the user manual.

### Fixed

- Made the desktop dev workflow recover when port `5173` is already occupied by selecting a shared free Vite port for both the renderer and Electron startup flow.

## [0.5.0]

### Changed

- Expanded personalization with a larger built-in preset library, including true light themes.
- Reworked the personalization settings into a preset-first experience with clearer advanced theme controls.
- Made the graph canvas and shared shell styling respond more cleanly to light and dark theme modes.
- Updated the investigation workspace sidebars so light themes no longer leave the floating panels stuck in a dark shell.
- Retuned the welcome screen, node launcher rows, and top toolbar so light themes use first-class surface and text styling instead of dark-mode carryovers.
- Added a shared themed primitive layer and migrated major workflow surfaces like Review, Timeline, and CSV import onto theme-token-based panels, cards, inputs, and buttons.
- Continued the theme-system migration across the inspector internals, settings scaffolding, media-library shell, and welcome-screen atmosphere so more of the app now follows the active preset instead of falling back to dark-biased component styling.
- Migrated the personalization controls and the media-library filtering/upload workflow further onto shared themed inputs, cards, buttons, and sections so light mode is no longer split between a themed shell and dark-only inner controls.
- Continued the media-library migration through its result cards, list view, detail sidebar, and asset actions, and brought more of the settings shell/navigation onto theme tokens so the app’s light-mode chrome is more consistent end to end.
- Migrated the AI, advanced, and footer sections of Settings onto the shared theme primitives as well, so setup/status flows and device configuration controls now match the active preset instead of reverting to dark-only panels and buttons.
- Migrated common workflow overlays and forms like export, consent, search, filtering, creation/deletion modals, the location picker, and the add-fact form onto shared theme tokens and primitives, reducing the app’s remaining dependency on dark-only styling.

## [0.1.3]

### Added

- Dedicated `Review` workspace as a top-level mode alongside `Investigation` and `Timeline`.
- Assertion-first field workflow, including field-to-fact promotion and field-level fact controls.
- Structured CSV import into an existing case.
- OpenStreetMap-based location preview and map picker for location nodes.
- Artifact-specific inspector treatment for media, documents, and identity documents.
- Node-specific remote tools for domain, website, and IP investigation lookups.
- Personalization controls for colors, canvas background, background images, blur, and icon packs.
- Local AI model tiers, self-test flow, and optional cloud AI report generation.
- Packaged Linux and Windows builds, including AppImage and Windows portable outputs.

### Changed

- Repositioned Vitni as a local-first investigation workspace with PI-focused workflows.
- Reworked the graph workspace so sidebars float as overlays instead of resizing the canvas.
- Redesigned the node launcher/sidebar and aligned the inspector structure with it.
- Improved graph layout quality using stronger layout engines and smarter edge decluttering.
- Reworked review from an inspector/sidebar add-on into a dedicated workflow surface.
- Rewrote the project README as a product-style front page for Vitni.
- Cleaned up lint/type issues across the codebase and added orientation comments to major modules.

### Fixed

- Packaged-app startup issues around renderer path resolution, file-based asset loading, and local database key handling.
- Local AI setup behavior around runtime detection, installer fallbacks, model detection, and noisy error states.
- Titlebar and overlay stacking issues in the floating workspace layout.
- Filter usability by adding an explicit `Show all` action.

## [0.1.2]

### Changed

- Version bump helper scripts were added for patch, minor, and major releases.

## [0.1.1]

### Changed
