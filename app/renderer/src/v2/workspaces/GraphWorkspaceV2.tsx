import { useEffect, useMemo, useRef, useState } from 'react';
import { FaBullseye, FaExpandArrowsAlt, FaFilter, FaProjectDiagram, FaSearch } from 'react-icons/fa';
import { GraphCanvas } from '@renderer/components/GraphCanvas';
import { mapGraphElements } from '@renderer/features/graph/labeling';
import { GRAPH_LAYOUT_PRESETS, type GraphLayoutPresetId } from '@renderer/features/graph/layoutPresets';
import type { PersonalizationTheme } from '@renderer/features/personalization/theme';
import type { ParsedAssertionRecord } from '@renderer/services/piBridge';
import type { GraphCanvasApi } from '@renderer/types/graphCanvasApi';
import type { GraphSnapshot } from '@renderer/types/graph';
import { deriveInvestigationContext } from '../features/context/investigationContext';
import type { InvestigationSelection } from '../types';

type GraphWorkspaceV2Props = {
  graph: GraphSnapshot;
  assertions: ParsedAssertionRecord[];
  selection: InvestigationSelection;
  personalizationTheme: PersonalizationTheme;
  onSelect: (selection: InvestigationSelection) => void;
};

type EvidenceFilter = 'all' | 'cited' | 'attention';

export function GraphWorkspaceV2({ graph, assertions, selection, personalizationTheme, onSelect }: GraphWorkspaceV2Props) {
  const graphApiRef = useRef<GraphCanvasApi | null>(null);
  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');
  const [relationshipType, setRelationshipType] = useState('all');
  const [evidenceFilter, setEvidenceFilter] = useState<EvidenceFilter>('all');
  const [contextMode, setContextMode] = useState(true);
  const [connectedOnly, setConnectedOnly] = useState(false);
  const [depth, setDepth] = useState<1 | 2>(1);
  const types = useMemo(() => Array.from(new Set(graph.nodes.map((node) => node.type))).sort(), [graph.nodes]);
  const relationshipTypes = useMemo(() => Array.from(new Set(graph.edges.map((edge) => edge.type))).sort(), [graph.edges]);
  const context = useMemo(
    () => deriveInvestigationContext(selection, graph, assertions, depth),
    [assertions, depth, graph, selection]
  );
  const citedEntityIds = useMemo(() => new Set(assertions.filter((assertion) => Boolean(assertion.source_id)).map((assertion) => assertion.subject_id)), [assertions]);
  const attentionEntityIds = useMemo(() => new Set(
    assertions
      .filter((assertion) => !assertion.source_id || assertion.review_state === 'unreviewed' || assertion.review_state === 'disputed' || assertion.confidence === 'unverified')
      .map((assertion) => assertion.subject_id)
  ), [assertions]);

  const visibleGraph = useMemo(() => {
    const queryValue = query.trim().toLowerCase();
    const contextIds = contextMode && context.relatedEntityIds.size > 0 ? context.relatedEntityIds : null;

    let nodes = graph.nodes.filter((node) => {
      if (type !== 'all' && node.type !== type) return false;
      if (contextIds && !contextIds.has(node.id)) return false;
      if (evidenceFilter === 'cited' && !citedEntityIds.has(node.id)) return false;
      if (evidenceFilter === 'attention' && !attentionEntityIds.has(node.id)) return false;
      if (!queryValue) return true;
      return `${node.label || ''} ${node.type} ${Object.values(node.properties).join(' ')}`.toLowerCase().includes(queryValue);
    });

    let ids = new Set(nodes.map((node) => node.id));
    let edges = graph.edges.filter((edge) => {
      if (!ids.has(edge.src_id) || !ids.has(edge.dst_id)) return false;
      if (relationshipType !== 'all' && edge.type !== relationshipType) return false;
      return true;
    });

    if (connectedOnly) {
      const connectedIds = new Set<string>();
      edges.forEach((edge) => {
        connectedIds.add(edge.src_id);
        connectedIds.add(edge.dst_id);
      });
      nodes = nodes.filter((node) => connectedIds.has(node.id) || context.anchorEntityIds.includes(node.id));
      ids = new Set(nodes.map((node) => node.id));
      edges = edges.filter((edge) => ids.has(edge.src_id) && ids.has(edge.dst_id));
    }

    return { nodes, edges };
  }, [attentionEntityIds, citedEntityIds, connectedOnly, context.anchorEntityIds, context.relatedEntityIds, contextMode, evidenceFilter, graph.edges, graph.nodes, query, relationshipType, type]);

  const elements = useMemo(
    () => mapGraphElements(visibleGraph, true, false, new Map<string, string>()),
    [visibleGraph]
  );

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (!selection) return;
      if (selection.kind === 'entity' || selection.kind === 'event') {
        graphApiRef.current?.selectElements([selection.id], []);
      } else if (selection.kind === 'relationship') {
        graphApiRef.current?.selectElements([], [selection.id]);
      } else if (context.anchorEntityIds.length > 0) {
        graphApiRef.current?.selectElements(context.anchorEntityIds, []);
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [context.anchorEntityIds, selection, visibleGraph]);

  const runLayout = (preset: GraphLayoutPresetId) => {
    graphApiRef.current?.runLayout(preset);
  };

  const contextLabel = !selection
    ? 'No context selected'
    : context.reason === 'source'
      ? `${context.anchorEntityIds.length} source-linked entities`
      : context.reason === 'assertion'
        ? 'Assertion subject + neighborhood'
        : context.reason === 'relationship'
          ? 'Relationship endpoints'
          : `${depth}-hop neighborhood`;

  return (
    <div className="v2-workspace v2-graph-workspace">
      <div className="v2-workspace-heading is-compact">
        <div><span className="v2-eyebrow">Graph</span><h1>Explore relationships without losing the question</h1><p>Selection context follows entities, relationships, assertions and evidence into the graph, while evidence filters help separate useful structure from database noise.</p></div>
      </div>
      <div className="v2-graph-toolbar">
        <label className="v2-filter-search"><FaSearch /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search graph…" /></label>
        <label className="v2-select-control"><FaFilter /><select value={type} onChange={(event) => setType(event.target.value)}><option value="all">All entity types</option>{types.map((item) => <option key={item} value={item}>{item.replace(/_/g, ' ')}</option>)}</select></label>
        <label className="v2-select-control"><FaProjectDiagram /><select value={relationshipType} onChange={(event) => setRelationshipType(event.target.value)}><option value="all">All relationships</option>{relationshipTypes.map((item) => <option key={item} value={item}>{item.replace(/_/g, ' ')}</option>)}</select></label>
        <select className="v2-layout-select" value={evidenceFilter} onChange={(event) => setEvidenceFilter(event.target.value as EvidenceFilter)}><option value="all">All evidence states</option><option value="cited">Has cited assertions</option><option value="attention">Needs claim attention</option></select>
        <button type="button" className={`v2-toggle-button${contextMode ? ' is-active' : ''}`} disabled={!selection} onClick={() => setContextMode((value) => !value)}><FaBullseye /> Context</button>
        <select className="v2-layout-select" value={depth} disabled={!selection || !contextMode} onChange={(event) => setDepth(Number(event.target.value) as 1 | 2)}><option value={1}>1 hop</option><option value={2}>2 hops</option></select>
        <button type="button" className={`v2-toggle-button${connectedOnly ? ' is-active' : ''}`} onClick={() => setConnectedOnly((value) => !value)}><FaProjectDiagram /> Connected only</button>
        <select className="v2-layout-select" defaultValue="" onChange={(event) => { if (event.target.value) runLayout(event.target.value as GraphLayoutPresetId); event.target.value = ''; }}><option value="">Run layout…</option>{GRAPH_LAYOUT_PRESETS.map((preset) => <option key={preset.id} value={preset.id}>{preset.label}</option>)}</select>
        <button type="button" className="v2-icon-button" onClick={() => graphApiRef.current?.fitToScreen()} title="Fit graph"><FaExpandArrowsAlt /></button>
        <span className="v2-result-count">{visibleGraph.nodes.length} entities · {visibleGraph.edges.length} relationships</span>
      </div>
      {selection ? <div className="px-1 pb-2 text-xs text-slate-500">Context: <span className="text-slate-300">{contextLabel}</span>{contextMode ? '' : ' · showing full graph'}</div> : null}
      <section className="v2-graph-stage">
        {visibleGraph.nodes.length === 0 ? <div className="v2-empty-state">No graph entities match the current context and filters.</div> : (
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
