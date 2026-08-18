import { useState } from 'react';
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
  onRefresh
}: WorkflowBridgesProps) {
  const [mediaSelection, setMediaSelection] = useState<((source: SourceRecord) => void) | null>(null);
  const selectedEntity = selection?.kind === 'entity' || selection?.kind === 'event'
    ? graph.nodes.find((node) => node.id === selection.id) ?? null
    : null;
  const libraryOpen = mediaOpen || mediaSelection !== null;
  const libraryMode = mediaSelection ? 'select' : 'manage';

  const closeLibrary = () => {
    setMediaSelection(null);
    onMediaClose();
  };

  return (
    <>
      <MediaLibraryModal
        isOpen={libraryOpen}
        mode={libraryMode}
        onClose={closeLibrary}
        onSelect={mediaSelection
          ? (source) => {
              mediaSelection(source);
              setMediaSelection(null);
              onMediaClose();
            }
          : undefined}
      />
      <SourceCreationModal
        isOpen={sourceOpen}
        entity={selectedEntity}
        onClose={onSourceClose}
        onSourceCreated={() => void onRefresh()}
        onOpenMediaLibrary={(onSelect) => setMediaSelection(() => onSelect)}
      />
      <ExportReportModal isOpen={reportOpen} onClose={onReportClose} />
    </>
  );
}
