import { describe, expect, it } from 'vitest';
import type { FindingRecord, SourceWithUsage } from '@shared/types';
import type { ParsedAssertionRecord } from '@renderer/services/piBridge';
import { deriveFindingHealth } from './model';

function assertion(overrides: Partial<ParsedAssertionRecord> = {}): ParsedAssertionRecord {
  return {
    id: 'assertion-1',
    subject_kind: 'entity',
    subject_id: 'entity-1',
    path: 'identity.name',
    value: { value: 'Ada' },
    source_id: 'source-1',
    confidence: 'verified',
    review_state: 'accepted',
    review_note: null,
    reviewed_by: null,
    reviewed_at: null,
    created_at: 1,
    ...overrides
  };
}

function source(id = 'source-1'): SourceWithUsage {
  return {
    id,
    kind: 'document',
    locator: 'source.pdf',
    title: 'Source',
    added_at: 1,
    hash: null,
    mime: 'application/pdf',
    usage: []
  };
}

function finding(overrides: Partial<FindingRecord> = {}): FindingRecord {
  return {
    id: 'finding-1',
    title: 'Identity established',
    body: 'The identity is established by the cited record.',
    status: 'reviewed',
    created_at: 1,
    updated_at: 1,
    assertion_ids: ['assertion-1'],
    ...overrides
  };
}

describe('deriveFindingHealth', () => {
  it('marks a reviewed finding ready only when its assertions are accepted and sourced', () => {
    const assertions = new Map([['assertion-1', assertion()]]);
    const sources = new Map([['source-1', source()]]);
    expect(deriveFindingHealth(finding(), assertions, sources)).toMatchObject({
      allAccepted: true,
      allSourced: true,
      reportReady: true,
      sourceCount: 1
    });
  });

  it('keeps drafts out of reports even when their evidence chain is healthy', () => {
    const assertions = new Map([['assertion-1', assertion()]]);
    const sources = new Map([['source-1', source()]]);
    expect(deriveFindingHealth(finding({ status: 'draft' }), assertions, sources).reportReady).toBe(false);
  });

  it('blocks report readiness when a supporting assertion is disputed', () => {
    const assertions = new Map([['assertion-1', assertion({ review_state: 'disputed' })]]);
    const sources = new Map([['source-1', source()]]);
    expect(deriveFindingHealth(finding(), assertions, sources)).toMatchObject({
      allAccepted: false,
      reportReady: false
    });
  });

  it('blocks report readiness when a linked source no longer resolves', () => {
    const assertions = new Map([['assertion-1', assertion()]]);
    expect(deriveFindingHealth(finding(), assertions, new Map())).toMatchObject({
      allSourced: false,
      reportReady: false,
      sourceCount: 1
    });
  });

  it('does not consider an empty reviewed finding defensible', () => {
    expect(deriveFindingHealth(finding({ assertion_ids: [] }), new Map(), new Map())).toMatchObject({
      allAccepted: false,
      allSourced: false,
      reportReady: false,
      sourceCount: 0
    });
  });
});
