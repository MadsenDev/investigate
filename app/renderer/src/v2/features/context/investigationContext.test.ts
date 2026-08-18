import { describe, expect, it } from 'vitest';
import type { ParsedAssertionRecord } from '@renderer/services/piBridge';
import type { GraphSnapshot } from '@renderer/types/graph';
import { deriveInvestigationContext } from './investigationContext';

const graph: GraphSnapshot = {
  nodes: [
    { id: 'a', type: 'person', label: 'A', properties: {}, created_at: 1, updated_at: 1 },
    { id: 'b', type: 'event', label: 'B', properties: {}, created_at: 1, updated_at: 1 },
    { id: 'c', type: 'location', label: 'C', properties: {}, created_at: 1, updated_at: 1 },
    { id: 'd', type: 'person', label: 'D', properties: {}, created_at: 1, updated_at: 1 }
  ],
  edges: [
    { id: 'ab', src_id: 'a', dst_id: 'b', type: 'attended', properties: {}, created_at: 1, updated_at: 1 },
    { id: 'bc', src_id: 'b', dst_id: 'c', type: 'occurred_at', properties: {}, created_at: 1, updated_at: 1 }
  ]
};

const assertions: ParsedAssertionRecord[] = [
  {
    id: 'claim-a', subject_kind: 'entity', subject_id: 'a', path: 'role', value: { value: 'Captain' },
    source_id: 'source-1', confidence: 'asserted', review_state: 'accepted', created_at: 1
  },
  {
    id: 'claim-b', subject_kind: 'entity', subject_id: 'b', path: 'date', value: { value: '2026-01-01' },
    source_id: 'source-1', confidence: 'verified', review_state: 'accepted', created_at: 1
  }
];

describe('deriveInvestigationContext', () => {
  it('expands an entity selection by neighborhood depth', () => {
    const oneHop = deriveInvestigationContext({ kind: 'entity', id: 'a' }, graph, assertions, 1);
    expect(Array.from(oneHop.relatedEntityIds).sort()).toEqual(['a', 'b']);

    const twoHop = deriveInvestigationContext({ kind: 'entity', id: 'a' }, graph, assertions, 2);
    expect(Array.from(twoHop.relatedEntityIds).sort()).toEqual(['a', 'b', 'c']);
  });

  it('resolves assertion context to its subject entity', () => {
    const context = deriveInvestigationContext({ kind: 'assertion', id: 'claim-a' }, graph, assertions, 1);
    expect(context.anchorEntityIds).toEqual(['a']);
    expect(context.relatedEntityIds.has('b')).toBe(true);
  });

  it('resolves a source to every entity supported by assertions using it', () => {
    const context = deriveInvestigationContext({ kind: 'source', id: 'source-1' }, graph, assertions, 0);
    expect(context.anchorEntityIds.sort()).toEqual(['a', 'b']);
    expect(Array.from(context.relatedEntityIds).sort()).toEqual(['a', 'b']);
  });

  it('resolves relationships to both endpoints', () => {
    const context = deriveInvestigationContext({ kind: 'relationship', id: 'ab' }, graph, assertions, 1);
    expect(context.anchorEntityIds.sort()).toEqual(['a', 'b']);
  });
});
