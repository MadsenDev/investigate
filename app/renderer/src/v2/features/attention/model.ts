import type { SourceRecord } from '@shared/types';
import type { ParsedAssertionRecord } from '@renderer/services/piBridge';
import type { GraphSnapshot } from '@renderer/types/graph';
import type { AttentionReason, AttentionSeverity } from '../../types';

export type AttentionItem = {
  assertionId: string;
  subjectId: string;
  subjectLabel: string;
  assertionPath: string;
  valueLabel: string;
  sourceId: string | null;
  sourceTitle: string | null;
  reasons: AttentionReason[];
  severity: AttentionSeverity;
  createdAt: number;
};

const REASON_PRIORITY: AttentionReason[] = ['unsupported', 'disputed', 'unreviewed', 'unverified'];

export const ATTENTION_REASON_COPY: Record<AttentionReason, { label: string; description: string }> = {
  unsupported: {
    label: 'Unsupported assertion',
    description: 'The claim does not resolve to a source in this investigation.'
  },
  disputed: {
    label: 'Conflicting evidence',
    description: 'The assertion is currently marked as disputed and needs a decision.'
  },
  unreviewed: {
    label: 'Unreviewed claim',
    description: 'The assertion has not been reviewed yet.'
  },
  unverified: {
    label: 'Unverified claim',
    description: 'The assertion confidence is still unverified.'
  }
};

function stringifyValue(value: Record<string, unknown>): string {
  const primitive = Object.values(value).find(
    (candidate) => typeof candidate === 'string' || typeof candidate === 'number' || typeof candidate === 'boolean'
  );
  if (primitive !== undefined) return String(primitive);
  const keys = Object.keys(value);
  return keys.length > 0 ? keys.join(', ') : 'No value';
}

function severityForReasons(reasons: AttentionReason[]): AttentionSeverity {
  if (reasons.includes('unsupported') || reasons.includes('disputed')) return 'high';
  if (reasons.includes('unverified')) return 'medium';
  return 'low';
}

export function buildAttentionItems(
  assertions: ParsedAssertionRecord[],
  sources: SourceRecord[],
  graph: GraphSnapshot
): AttentionItem[] {
  const sourceById = new Map(sources.map((source) => [source.id, source]));
  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));

  return assertions
    .map((assertion): AttentionItem | null => {
      const reasons: AttentionReason[] = [];
      const source = assertion.source_id ? sourceById.get(assertion.source_id) : undefined;

      if (!assertion.source_id || !source) reasons.push('unsupported');
      if (assertion.review_state === 'disputed') reasons.push('disputed');
      if (assertion.review_state === 'unreviewed') reasons.push('unreviewed');
      if (assertion.confidence === 'unverified') reasons.push('unverified');

      if (reasons.length === 0) return null;

      reasons.sort((left, right) => REASON_PRIORITY.indexOf(left) - REASON_PRIORITY.indexOf(right));
      const node = nodeById.get(assertion.subject_id);

      return {
        assertionId: assertion.id,
        subjectId: assertion.subject_id,
        subjectLabel: node?.label || node?.id || assertion.subject_id,
        assertionPath: assertion.path,
        valueLabel: stringifyValue(assertion.value),
        sourceId: source?.id ?? null,
        sourceTitle: source?.title || source?.locator || null,
        reasons,
        severity: severityForReasons(reasons),
        createdAt: assertion.created_at
      };
    })
    .filter((item): item is AttentionItem => item !== null)
    .sort((left, right) => {
      const rank = { high: 0, medium: 1, low: 2 } as const;
      return rank[left.severity] - rank[right.severity] || right.createdAt - left.createdAt;
    });
}
