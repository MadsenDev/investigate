import { useEffect, useMemo, useRef, useState } from 'react';
import { FaBullseye, FaExpandArrowsAlt, FaFilter, FaSearch } from 'react-icons/fa';
import { GraphCanvas } from '@renderer/components/GraphCanvas';
import { mapGraphElements } from '@renderer/features/graph/labeling';
import { GRAPH_LAYOUT_PRESETS, type GraphLayoutPresetId } from '@renderer/features/graph/layoutPresets';
import type { PersonalizationTheme } from '@renderer/features/personalization/theme';
import type { GraphCanvasApi } from '@renderer/types/graphCanvasApi';
import type { GraphSnapshot } from '@renderer/types/graph';
import type { InvestigationSelection } from '../types';

type GraphWorkspaceV2Props = {
  graph: GraphSnapshot;
  selection: InvestigationSelection;
  personalizationTheme: PersonalizationTheme;
  onSelect: (selection: InvestigationSelection) => void;
};

export function GraphWorkspaceV2({ graph, selection, personalizationTheme, onSelect }: GraphWorkspaceV2Props) {
  const graphApiRef = useRef<GraphCanvasApi | null>(null);
  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');
  const [focusMode, setFocusMode] = useState(true);
  const types = useMemo(() => Array.from(new Set(graph.nodes.map((node) => node.type))).sort(), [graph.nodes]);

  const visibleGraph = useMemo(() => {
    const queryValue = query.trim().toLowerCase();
    const selectedEntityId = selection?.kind === 'entity' || selection?.kind === 'event' ? selection.id : null;
    let focusIds: Set<string> | null = null;
    if (focusMode && selectedEntityId) {
      focusIds = new Set([selectedEntityId]);
      graph.edges.forEach((edge) => {
        if (edge.src_id === selectedEntityId) focusIds?.add(edge.dst_id);
        if (edge.dst_id === selectedEntityId) focusIds?.add(edge.src_id);
      });
    }

    const nodes = graph.nodes.filter((node) => {
      if (type !== 'all' && node.type !== type) return false;
      if (focusIds && !focusIds.has(node.id)) return false;
      if (!queryValue) return true;
      return `${node.label || ''} ${node.type} ${Object.values(node.properties).join(' ')}`.toLowerCase().includes(queryValue);
    });
    const ids = new Set(nodes.map((node) => node.id));
    const edges = graph.edges.filter((edge) => ids.has(edge.src_id) && ids.has(edge.dst_id));
    return { nodes, edges };
  }, [focusMode, graph.edges, graph.nodes, query, selection, type]);

  const elements = useMemo(
    () => mapGraphElements(visibleGraph, true, false, new Map<string, string>()),
    [visibleGraph]
  );

  useEffect(() => {
    if (!selection) return;
    const frame = window.requestAnimationFrame(() => {
      if (selection.kind === 'entity' || selection.kind === 'event') {
        graphApiRef.current?.selectElements([selection.id], []);
      } else if (selection.kind === 'relationship') {
        graphApiRef.current?.selectElements([], [selection.id]);
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [selection, visibleGraph]);

  const runLayout = (preset: GraphLayoutPresetId) => {
    graphApiRef.current?.runLayout(preset);
  };

  return (
    <div className="v2-workspace v2-graph-workspace">
      <div className="v2-workspace-heading is-compact">
        <div><span className="v2-eyebrow">Graph</span><h1>Explore relationships without losing the question</h1><p>Focus on a selected entity&apos;s neighborhood, then widen the investigation when needed.</p></div>
      </div>
      <div className="v2-graph-toolbar">
        <label className="v2-filter-search"><FaSearch /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search graph…" /></label>
        <label className="v2-select-control"><FaFilter /><select value={type} onChange={(event) => setType(event.target.value)}><option value="all">All entity types</option>{types.map((item) => <option key={item} value={item}>{item.replace(/_/g, ' ')}</option>)}</select></label>
        <button type="button" className={`v2-toggle-button${focusMode ? ' is-active' : ''}`} onClick={() => setFocusMode((value) => !value)}><FaBullseye /> Focus neighborhood</button>
        <select className="v2-layout-select" defaultValue="" onChange={(event) => { if (event.target.value) runLayout(event.target.value as GraphLayoutPresetId); event.target.value = ''; }}><option value="">Run layout…</option>{GRAPH_LAYOUT_PRESETS.map((preset) => <option key={preset.id} value={preset.id}>{preset.label}</option>)}</select>
        <button type="button" className="v2-icon-button" onClick={() => graphApiRef.current?.fitToScreen()} title="Fit graph"><FaExpandArrowsAlt /></button>
        <span className="v2-result-count">{visibleGraph.nodes.length} entities · {visibleGraph.edges.length} relationships</span>
      </div>
      <section className="v2-graph-stage">
        {visibleGraph.nodes.length === 0 ? <div className="v2-empty-state">No graph entities match the current focus and filters.</div> : (
          <GraphCanvas
            elements={elements}
            personalizationTheme={personalizationTheme}
            apiRef={graphApiRef}
            onSelectNode={(id) => onSelect({ kind: 'entity', id })}
            onUnselectNode={() => undefined}
            onSelectEdge={(id) => onSelect({ kind: 'relationship', id })}
            onUnselectEdge={() => undefined}
            onTapNode={(id) => onSelect({ kind: 'entity', id })}
            onSelectionChange={(nodeIds, edgeIds) => {
              if (nodeIds.length === 1) onSelect({ kind: 'entity', id: nodeIds[0] });
              else if (edgeIds.length === 1) onSelect({ kind: 'relationship', id: edgeIds[0] });
            }}
          />
        )}
      </section>
    </div>
  );
}
