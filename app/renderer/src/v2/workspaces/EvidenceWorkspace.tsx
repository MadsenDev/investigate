import { FaDatabase, FaFileImport, FaImages, FaLink, FaPlus, FaUnlink } from 'react-icons/fa';
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
        <div className="v2-metric-card"><span className="v2-metric-icon"><FaImages /></span><span>Media</span><strong>{media.length}</strong><small>Image, video and audio evidence</small></div>
      </div>

      <section className="v2-panel">
        <div className="v2-panel-heading"><div><span>Recent evidence</span><small>Newest source records in this investigation</small></div><button type="button" className="v2-text-button" onClick={onOpenMedia}>Open library</button></div>
        <div className="v2-evidence-list">
          {[...sources].sort((a, b) => b.added_at - a.added_at).slice(0, 12).map((source) => (
            <button type="button" className="v2-evidence-row" key={source.id} onClick={() => onSelect({ kind: 'source', id: source.id })}>
              <span className="v2-evidence-icon"><FaDatabase /></span>
              <span className="v2-evidence-copy"><strong>{source.title || source.display_name || source.file_name || source.kind}</strong><small>{source.locator}</small></span>
              <span>{source.kind}</span>
              <span>{source.usage.length ? `${source.usage.length} reference${source.usage.length === 1 ? '' : 's'}` : <em className="v2-table-alert">unlinked</em>}</span>
              <time>{new Date(source.added_at).toLocaleDateString()}</time>
            </button>
          ))}
          {sources.length === 0 ? <div className="v2-empty-state">No evidence has been added to this investigation yet.</div> : null}
        </div>
      </section>
    </div>
  );
}
