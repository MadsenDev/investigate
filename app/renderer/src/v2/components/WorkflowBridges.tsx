import { ExportReportModal } from '@renderer/components/ExportReportModal';
import { MediaLibraryModal } from '@renderer/components/MediaLibraryModal';
import { SourceCreationModal } from '@renderer/components/SourceCreationModal';
import type { SourceRecord } from '@shared/types';
import type { GraphSnapshot } from '@renderer/types/graph';
import type { InvestigationSelection } from '../types';

type WorkflowBridgesProps = {
  graph: GraphSnapshot;
  selection: InvestigationSelection;
  mediaOpen: boolean;
  sourceOpen: boolean;
  reportOpen: boolean;
  onMediaClose: () => void;
  onSourceClose: () => void;
  onReportClose: () => void;
  onRefresh: () => Promise<void>;
  onOpenMediaForSelection: (onSelect: (source: SourceRecord) => void) => void;
};

export function WorkflowBridges({
  graph,
  selection,
  mediaOpen,
  sourceOpen,
  reportOpen,
  onMediaClose,
  onSourceClose,
  onReportClose,
  onRefresh,
  onOpenMediaForSelection
}: WorkflowBridgesProps) {
  const selectedEntity = selection?.kind === 'entity' || selection?.kind === 'event'
    ? graph.nodes.find((node) => node.id === selection.id) ?? null
    : null;

  return (
    <>
      <MediaLibraryModal isOpen={mediaOpen} mode="manage" onClose={onMediaClose} />
      <SourceCreationModal
        isOpen={sourceOpen}
        entity={selectedEntity}
        onClose={onSourceClose}
        onSourceCreated={() => void onRefresh()}
        onOpenMediaLibrary={onOpenMediaForSelection}
      />
      <ExportReportModal isOpen={reportOpen} onClose={onReportClose} />
    </>
  );
}
