import { useMemo } from 'react';
import {
  FaClone,
  FaDatabase,
  FaExclamationTriangle,
  FaFileImport,
  FaImages,
  FaLink,
  FaPlus,
  FaUnlink
} from 'react-icons/fa';
import type { SourceWithUsage } from '@shared/types';
import type { GraphSnapshot } from '@renderer/types/graph';
import { displayNameForNode } from '@renderer/features/graph/labeling';
import type { InvestigationSelection } from '../types';
import './evidence-reports.css';

type EvidenceWorkspaceProps = {
  graph: GraphSnapshot;
  sources: SourceWithUsage[];
  selection: InvestigationSelection;
  onSelect: (selection: InvestigationSelection) => void;
  onOpenMedia: () => void;
  onImportCsv: () => void;
  onAttachSource: () => void;
};

type DuplicateGroup = {
  key: string;
  label: string;
  sources: SourceWithUsage[];
};

function normalizeLocator(locator: string): string {
  return locator.trim().replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase();
}

function duplicateGroups(sources: SourceWithUsage[]): DuplicateGroup[] {
  const groups = new Map<string, SourceWithUsage[]>();

  for (const source of sources) {
    const key = source.hash
      ? `hash:${source.hash.toLowerCase()}`
      : normalizeLocator(source.locator)
        ? `locator:${normalizeLocator(source.locator)}`
        : null;
    if (!key) continue;
    const current = groups.get(key) ?? [];
    current.push(source);
    groups.set(key, current);
  }

  return Array.from(groups.entries())
    .filter(([, entries]) => entries.length > 1)
    .map(([key, entries]) => ({
      key,
      label: key.startsWith('hash:') ? 'Matching file hash' : 'Matching locator',
      sources: entries
    }))
    .sort((left, right) => right.sources.length - left.sources.length);
}

export function EvidenceWorkspace({
  graph,
  sources,
  selection,
  onSelect,
  onOpenMedia,
  onImportCsv,
  onAttachSource
}: EvidenceWorkspaceProps) {
  const linked = sources.filter((source) => source.usage.length > 0);
  const unlinked = sources.filter((source) => source.usage.length === 0);
  const media = sources.filter((source) => Boolean(source.mime?.startsWith('image/') || source.mime?.startsWith('video/') || source.mime?.startsWith('audio/')));
  const duplicates = useMemo(() => duplicateGroups(sources), [sources]);
  const selectedEntity = selection?.kind === 'entity' || selection?.kind === 'event'
    ? graph.nodes.find((node) => node.id === selection.id) ?? null
    : null;

  return (
    <div className="v2-workspace">
      <div className="v2-workspace-heading">
        <div>
          <span className="v2-eyebrow">Evidence</span>
          <h1>Bring material into the case, then connect it to claims</h1>
          <p>Vitni 2 treats intake as the start of provenance, not a dumping ground for attachments.</p>
        </div>
      </div>

      <div className="v2-evidence-actions">
        <button type="button" className="v2-action-card" onClick={onOpenMedia}>
          <span><FaImages /></span><strong>Add or manage files</strong><small>Documents, images, audio and video</small>
        </button>
        <button type="button" className="v2-action-card" onClick={onImportCsv}>
          <span><FaFileImport /></span><strong>Import structured data</strong><small>Review CSV rows before they become case data</small>
        </button>
        <button type="button" className="v2-action-card" disabled={!selectedEntity} onClick={onAttachSource}>
          <span><FaPlus /></span><strong>Attach source to selection</strong><small>{selectedEntity ? displayNameForNode(selectedEntity) : 'Select an entity first'}</small>
        </button>
      </div>

      <div className="v2-metric-grid v2-evidence-metrics">
        <button type="button" className="v2-metric-card" onClick={onOpenMedia}><span className="v2-metric-icon"><FaDatabase /></span><span>Total sources</span><strong>{sources.length}</strong><small>Everything currently registered as source material</small></button>
        <div className="v2-metric-card"><span className="v2-metric-icon"><FaLink /></span><span>Linked</span><strong>{linked.length}</strong><small>Sources already cited by at least one assertion</small></div>
        <div className={`v2-metric-card${unlinked.length ? ' is-warning' : ' is-success'}`}><span className="v2-metric-icon"><FaUnlink /></span><span>Unlinked</span><strong>{unlinked.length}</strong><small>Evidence present in the case but not yet used</small></div>
        <div className={`v2-metric-card${duplicates.length ? ' is-warning' : ' is-success'}`}><span className="v2-metric-icon"><FaClone /></span><span>Duplicate signals</span><strong>{duplicates.length}</strong><small>Groups sharing a file hash or normalized locator</small></div>
      </div>

      {(unlinked.length > 0 || duplicates.length > 0) ? (
        <section className="v2-panel">
          <div className="v2-panel-heading">
            <div><span>Evidence triage</span><small>Mechanical provenance checks Vitni can explain without guessing</small></div>
          </div>
          <div className="grid gap-4 p-4 xl:grid-cols-2">
            <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-4">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 text-amber-300"><FaUnlink /></span>
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">Unlinked evidence</h3>
                  <p className="mt-1 text-xs text-slate-500">Material in the case that does not currently support any assertion.</p>
                </div>
              </div>
              <div className="mt-3 space-y-1">
                {unlinked.slice(0, 6).map((source) => (
                  <button
                    type="button"
                    key={source.id}
                    onClick={() => onSelect({ kind: 'source', id: source.id })}
                    className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left hover:bg-slate-900/70"
                  >
                    <span className="min-w-0">
                      <strong className="block truncate text-sm font-medium text-slate-200">{source.title || source.display_name || source.file_name || source.locator}</strong>
                      <small className="block truncate text-xs text-slate-500">{source.kind} · {source.locator}</small>
                    </span>
                    <span className="text-xs text-amber-300">Inspect</span>
                  </button>
                ))}
                {unlinked.length > 6 ? <p className="px-3 pt-2 text-xs text-slate-500">+ {unlinked.length - 6} more unlinked source{unlinked.length - 6 === 1 ? '' : 's'}</p> : null}
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-4">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 text-amber-300"><FaClone /></span>
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">Possible duplicates</h3>
                  <p className="mt-1 text-xs text-slate-500">Same hash is strong evidence of the same file. Matching locators are a weaker signal and should be reviewed.</p>
                </div>
              </div>
              <div className="mt-3 space-y-2">
                {duplicates.slice(0, 5).map((group) => (
                  <div key={group.key} className="rounded-lg border border-slate-800 px-3 py-2">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-semibold uppercase tracking-wide text-amber-300">{group.label}</span>
                      <span className="text-xs text-slate-500">{group.sources.length} records</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {group.sources.slice(0, 4).map((source) => (
                        <button
                          type="button"
                          key={source.id}
                          onClick={() => onSelect({ kind: 'source', id: source.id })}
                          className="max-w-full truncate rounded border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:border-slate-500"
                        >
                          {source.title || source.display_name || source.file_name || source.locator}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
                {duplicates.length === 0 ? <p className="py-3 text-xs text-slate-500">No duplicate signals detected.</p> : null}
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="v2-panel p-4">
          <div className="flex items-center gap-3 text-sm text-emerald-200">
            <FaExclamationTriangle className="text-emerald-400" />
            Evidence intake is clean: every source is linked and no duplicate hash/locator groups are present.
          </div>
        </section>
      )}

      <section className="v2-panel">
        <div className="v2-panel-heading"><div><span>Recent evidence</span><small>Newest source records in this investigation</small></div><button type="button" className="v2-text-button" onClick={onOpenMedia}>Open library</button></div>
        <div className="v2-evidence-list">
          {[...sources].sort((a, b) => b.added_at - a.added_at).slice(0, 12).map((source) => (
            <button type="button" className="v2-evidence-row" key={source.id} onClick={() => onSelect({ kind: 'source', id: source.id })}>
              <span className="v2-evidence-icon"><FaDatabase /></span>
              <span className="v2-evidence-copy"><strong>{source.title || source.display_name || source.file_name || source.kind}</strong><small>{source.locator}</small></span>
              <span>{source.kind}</span>
              <span>{source.usage.length ? `${source.usage.length} reference${source.usage.length === 1 ? '' : 's'}` : <em className="v2-table-alert">unlinked</em>}</span>
              <time>{new Date(source.added_at < 10_000_000_000 ? source.added_at * 1000 : source.added_at).toLocaleDateString()}</time>
            </button>
          ))}
          {sources.length === 0 ? <div className="v2-empty-state">No evidence has been added to this investigation yet.</div> : null}
        </div>
      </section>
    </div>
  );
}
