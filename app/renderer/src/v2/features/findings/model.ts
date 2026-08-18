import type { FindingRecord, SourceWithUsage } from '@shared/types';
import type { ParsedAssertionRecord } from '@renderer/services/piBridge';

export type FindingHealth = {
  linked: ParsedAssertionRecord[];
  allAccepted: boolean;
  allSourced: boolean;
  reportReady: boolean;
  sourceCount: number;
};

export function deriveFindingHealth(
  finding: FindingRecord,
  assertionById: ReadonlyMap<string, ParsedAssertionRecord>,
  sourceById: ReadonlyMap<string, SourceWithUsage>
): FindingHealth {
  const linked = finding.assertion_ids
    .map((id) => assertionById.get(id))
    .filter((value): value is ParsedAssertionRecord => Boolean(value));
  const allAccepted = linked.length > 0 && linked.every((assertion) => assertion.review_state === 'accepted');
  const allSourced = linked.length > 0 && linked.every(
    (assertion) => Boolean(assertion.source_id && sourceById.has(assertion.source_id))
  );
  const sourceIds = new Set(
    linked
      .map((assertion) => assertion.source_id)
      .filter((sourceId) => Boolean(sourceId && sourceById.has(sourceId)))
  );
  return {
    linked,
    allAccepted,
    allSourced,
    reportReady: finding.status === 'reviewed' && allAccepted && allSourced,
    sourceCount: sourceIds.size
  };
}
