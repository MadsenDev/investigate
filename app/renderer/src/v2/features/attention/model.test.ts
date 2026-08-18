import { describe, expect, it } from 'vitest';
import type { SourceRecord } from '@shared/types';
import type { ParsedAssertionRecord } from '@renderer/services/piBridge';
import type { GraphSnapshot } from '@renderer/types/graph';
import { buildAttentionItems } from './model';

const graph: GraphSnapshot = {
  nodes: [
    {
      id: 'person-1',
      type: 'person',
      label: 'Erik Northwinds',
      properties: {},
      created_at: 1,
      updated_at: 1
    }
  ],
  edges: []
};

const source: SourceRecord = {
  id: 'source-1',
  kind: 'document',
  locator: 'crew-manifest.pdf',
  title: 'Crew Manifest',
  added_at: 1,
  hash: null,
  mime: 'application/pdf'
};

function assertion(overrides: Partial<ParsedAssertionRecord> = {}): ParsedAssertionRecord {
  return {
    id: 'assertion-1',
    subject_kind: 'entity',
    subject_id: 'person-1',
    path: 'role',
    value: { value: 'Captain' },
    source_id: 'source-1',
    confidence: 'verified',
    review_state: 'accepted',
    created_at: 10,
    ...overrides
  };
}

describe('buildAttentionItems', () => {
  it('omits reviewed and verified assertions with a resolvable source', () => {
    expect(buildAttentionItems([assertion()], [source], graph)).toEqual([]);
  });

  it('combines attention reasons into one item in priority order', () => {
    const items = buildAttentionItems(
      [assertion({ source_id: 'missing', confidence: 'unverified', review_state: 'disputed' })],
      [source],
      graph
    );

    expect(items).toHaveLength(1);
    expect(items[0].reasons).toEqual(['unsupported', 'disputed', 'unverified']);
    expect(items[0].severity).toBe('high');
    expect(items[0].subjectLabel).toBe('Erik Northwinds');
  });

  it('marks ordinary imported/unreviewed-style claims as low priority until another problem exists', () => {
    const items = buildAttentionItems([assertion({ review_state: 'unreviewed' })], [source], graph);
    expect(items[0].reasons).toEqual(['unreviewed']);
    expect(items[0].severity).toBe('low');
  });

  it('keeps accepted but unverified claims visible as verification work', () => {
    const items = buildAttentionItems([assertion({ confidence: 'unverified', review_state: 'accepted' })], [source], graph);
    expect(items).toHaveLength(1);
    expect(items[0].reasons).toEqual(['unverified']);
    expect(items[0].severity).toBe('medium');
  });

  it('treats rejection as a completed review decision even when evidence is missing', () => {
    const items = buildAttentionItems(
      [assertion({ source_id: 'missing', confidence: 'unverified', review_state: 'rejected' })],
      [source],
      graph
    );
    expect(items).toEqual([]);
  });
});
