import type { SourceRecord } from '@shared/types';
import type { ParsedAssertionRecord } from '@renderer/services/piBridge';
import type { GraphSnapshot } from '@renderer/types/graph';

export type InvestigationActivityItem = {
  id: string;
  kind: 'entity' | 'assertion' | 'source';
  title: string;
  description: string;
  occurredAt: number;
  targetId: string;
};

export function buildRecentActivity(
  graph: GraphSnapshot,
  assertions: ParsedAssertionRecord[],
  sources: SourceRecord[],
  limit = 8
): InvestigationActivityItem[] {
  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));

  const entityActivity = graph.nodes.map((node): InvestigationActivityItem => ({
    id: `entity:${node.id}`,
    kind: 'entity',
    title: 'Entity added',
    description: node.label || node.id,
    occurredAt: node.created_at,
    targetId: node.id
  }));

  const assertionActivity = assertions.map((assertion): InvestigationActivityItem => ({
    id: `assertion:${assertion.id}`,
    kind: 'assertion',
    title: 'Assertion added',
    description: `${nodeById.get(assertion.subject_id)?.label || assertion.subject_id} · ${assertion.path}`,
    occurredAt: assertion.created_at,
    targetId: assertion.id
  }));

  const sourceActivity = sources.map((source): InvestigationActivityItem => ({
    id: `source:${source.id}`,
    kind: 'source',
    title: 'Source added',
    description: source.title || source.locator,
    occurredAt: source.added_at,
    targetId: source.id
  }));

  return [...entityActivity, ...assertionActivity, ...sourceActivity]
    .filter((item) => Number.isFinite(item.occurredAt))
    .sort((left, right) => right.occurredAt - left.occurredAt)
    .slice(0, limit);
}
