import type { ParsedAssertionRecord } from '@renderer/services/piBridge';
import type { GraphSnapshot } from '@renderer/types/graph';
import type { InvestigationSelection } from '../../types';

export type InvestigationContext = {
  anchorEntityIds: string[];
  relatedEntityIds: Set<string>;
  reason: 'none' | 'entity' | 'relationship' | 'assertion' | 'source';
};

function expandNeighborhood(graph: GraphSnapshot, seeds: Iterable<string>, depth: number): Set<string> {
  const seen = new Set(seeds);
  let frontier = new Set(seen);

  for (let step = 0; step < depth; step += 1) {
    const next = new Set<string>();
    for (const edge of graph.edges) {
      if (frontier.has(edge.src_id) && !seen.has(edge.dst_id)) next.add(edge.dst_id);
      if (frontier.has(edge.dst_id) && !seen.has(edge.src_id)) next.add(edge.src_id);
    }
    if (next.size === 0) break;
    next.forEach((id) => seen.add(id));
    frontier = next;
  }

  return seen;
}

export function deriveInvestigationContext(
  selection: InvestigationSelection,
  graph: GraphSnapshot,
  assertions: ParsedAssertionRecord[],
  neighborhoodDepth = 1
): InvestigationContext {
  if (!selection) return { anchorEntityIds: [], relatedEntityIds: new Set(), reason: 'none' };

  if (selection.kind === 'entity' || selection.kind === 'event') {
    return {
      anchorEntityIds: [selection.id],
      relatedEntityIds: expandNeighborhood(graph, [selection.id], neighborhoodDepth),
      reason: 'entity'
    };
  }

  if (selection.kind === 'relationship') {
    const edge = graph.edges.find((candidate) => candidate.id === selection.id);
    if (!edge) return { anchorEntityIds: [], relatedEntityIds: new Set(), reason: 'relationship' };
    const anchors = [edge.src_id, edge.dst_id];
    return {
      anchorEntityIds: anchors,
      relatedEntityIds: expandNeighborhood(graph, anchors, Math.max(0, neighborhoodDepth - 1)),
      reason: 'relationship'
    };
  }

  if (selection.kind === 'assertion') {
    const assertion = assertions.find((candidate) => candidate.id === selection.id);
    if (!assertion) return { anchorEntityIds: [], relatedEntityIds: new Set(), reason: 'assertion' };
    return {
      anchorEntityIds: [assertion.subject_id],
      relatedEntityIds: expandNeighborhood(graph, [assertion.subject_id], neighborhoodDepth),
      reason: 'assertion'
    };
  }

  const anchors = Array.from(new Set(
    assertions
      .filter((assertion) => assertion.source_id === selection.id)
      .map((assertion) => assertion.subject_id)
  ));

  return {
    anchorEntityIds: anchors,
    relatedEntityIds: expandNeighborhood(graph, anchors, neighborhoodDepth),
    reason: 'source'
  };
}
