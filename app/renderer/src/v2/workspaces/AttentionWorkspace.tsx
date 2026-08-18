import { useMemo, useState } from 'react';
import {
  FaCheck,
  FaDatabase,
  FaExclamationTriangle,
  FaExternalLinkAlt,
  FaFlag,
  FaLink,
  FaSearch,
  FaShieldAlt,
  FaTimes
} from 'react-icons/fa';
import type { SourceWithUsage } from '@shared/types';
import { piBridge, type ParsedAssertionRecord } from '@renderer/services/piBridge';
import type { AttentionItem } from '../features/attention/model';
import { ATTENTION_REASON_COPY } from '../features/attention/model';
import { ReviewHistory } from '../components/ReviewHistory';
import type { AttentionReason, InvestigationSelection, Vitni2Workspace } from '../types';

type AttentionWorkspaceProps = {
  items: AttentionItem[];
  assertions: ParsedAssertionRecord[];
  sources: SourceWithUsage[];
  onSelect: (selection: InvestigationSelection) => void;
  onNavigate: (workspace: Vitni2Workspace) => void;
  onRefresh: () => Promise<void>;
};

type AttentionFilter = 'all' | AttentionReason;

const filters: Array<{ id: AttentionFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'unsupported', label: 'Unsupported' },
  { id: 'disputed', label: 'Disputed' },
  { id: 'unreviewed', label: 'Unreviewed' },
  { id: 'unverified', label: 'Unverified' }
];

function countItemsForFilter(items: AttentionItem[], filter: AttentionFilter): number {
  if (filter === 'all') return items.length;
  return items.filter((item) => item.reasons.includes(filter)).length;
}

function reviewedDate(value: number | null | undefined): string | null {
  if (!value) return null;
  const millis = value < 10_000_000_000 ? value * 1000 : value;
  return new Date(millis).toLocaleString();
}

export function AttentionWorkspace({
  items,
  assertions,
  sources,
  onSelect,
  onNavigate,
  onRefresh
}: AttentionWorkspaceProps) {
  const [filter, setFilter] = useState<AttentionFilter>('all');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sourceQuery, setSourceQuery] = useState('');
  const [notes, setNotes] = useState<Record<string, string>>({});

  const assertionById = useMemo(
    () => new Map(assertions.map((assertion) => [assertion.id, assertion])),
    [assertions]
  );
  const visibleItems = useMemo(
    () => filter === 'all' ? items : items.filter((item) => item.reasons.includes(filter)),
    [filter, items]
  );
  const matchingSources = useMemo(() => {
    const needle = sourceQuery.trim().toLowerCase();
    const sorted = [...sources].sort((left, right) => right.added_at - left.added_at);
    if (!needle) return sorted.slice(0, 8);
    return sorted.filter((source) => {
      const haystack = [source.title, source.display_name, source.file_name, source.kind, source.locator]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(needle);
    }).slice(0, 12);
  }, [sourceQuery, sources]);

  const getNote = (assertion: ParsedAssertionRecord) => notes[assertion.id] ?? assertion.review_note ?? '';

  const recordDecision = async (assertionId: string, reason: string) => {
    await piBridge.recordAudit({
      action: 'review_assertion',
      subject_kind: 'assertion',
      subject_id: assertionId,
      actor: 'local-user',
      reason,
      transform_run_id: null
    });
  };

  const updateReview = async (
    assertion: ParsedAssertionRecord,
    state: 'accepted' | 'disputed' | 'rejected'
  ) => {
    setSavingId(assertion.id);
    try {
      const note = getNote(assertion).trim();
      await piBridge.updateAssertion(assertion.id, {
        review_state: state,
        review_note: note || null,
        reviewed_at: Math.floor(Date.now() / 1000),
        reviewed_by: 'Analyst'
      });
      await recordDecision(assertion.id, `${state}${note ? ` — ${note}` : ''}`);
      await onRefresh();
    } finally {
      setSavingId(null);
    }
  };

  const updateConfidence = async (
    assertion: ParsedAssertionRecord,
    confidence: 'asserted' | 'verified'
  ) => {
    setSavingId(assertion.id);
    try {
      await piBridge.updateAssertion(assertion.id, { confidence });
      await recordDecision(assertion.id, `Confidence changed to ${confidence}`);
      await onRefresh();
    } finally {
      setSavingId(null);
    }
  };

  const attachSource = async (assertion: ParsedAssertionRecord, source: SourceWithUsage) => {
    setSavingId(assertion.id);
    try {
      await piBridge.updateAssertion(assertion.id, { source_id: source.id });
      await piBridge.recordAudit({
        action: 'link_source',
        subject_kind: 'assertion',
        subject_id: assertion.id,
        actor: 'local-user',
        reason: `Evidence linked: ${source.title || source.display_name || source.locator}`,
        transform_run_id: null
      });
      setSourceQuery('');
      await onRefresh();
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="v2-workspace">
      <div className="v2-workspace-heading">
        <div>
          <span className="v2-eyebrow">Needs attention</span>
          <h1>Resolve the problem, not the queue</h1>
          <p>Every item explains why it needs attention, shows its evidence state, and gives you the action that changes the underlying investigation.</p>
        </div>
      </div>

      <div className="v2-filter-pills">
        {filters.map((item) => (
          <button type="button" key={item.id} className={filter === item.id ? 'is-active' : ''} onClick={() => setFilter(item.id)}>
            {item.label}
            <span>{countItemsForFilter(items, item.id)}</span>
          </button>
        ))}
      </div>

      <section className="v2-attention-workspace-list">
        {visibleItems.length === 0 ? (
          <div className="v2-panel v2-empty-state success">Nothing in this category currently needs attention.</div>
        ) : visibleItems.map((item) => {
          const assertion = assertionById.get(item.assertionId);
          if (!assertion) return null;
          const expanded = expandedId === item.assertionId;
          const reviewed = reviewedDate(assertion.reviewed_at);

          return (
            <article className={`v2-attention-card is-${item.severity}`} key={item.assertionId}>
              <button type="button" className="v2-attention-card-main" onClick={() => onSelect({ kind: 'assertion', id: item.assertionId })}>
                <span className={`v2-attention-card-icon is-${item.severity}`}><FaFlag /></span>
                <span className="v2-attention-card-copy">
                  <span className="v2-attention-card-reasons">
                    {item.reasons.map((reason) => <em key={reason}>{ATTENTION_REASON_COPY[reason].label}</em>)}
                  </span>
                  <strong>{item.subjectLabel}</strong>
                  <small>{item.assertionPath.replace(/_/g, ' ')} · {item.valueLabel}</small>
                  <p>{ATTENTION_REASON_COPY[item.reasons[0]].description}</p>
                  {item.sourceTitle ? <span className="v2-attention-source"><FaDatabase /> {item.sourceTitle}</span> : null}
                </span>
              </button>

              <div className="v2-attention-actions">
                <button type="button" onClick={() => setExpandedId(expanded ? null : item.assertionId)}>
                  <FaDatabase /> {expanded ? 'Hide context' : 'Resolve'}
                </button>
                <button
                  type="button"
                  disabled={savingId === item.assertionId || item.reasons.includes('unsupported')}
                  onClick={() => void updateReview(assertion, 'accepted')}
                  title={item.reasons.includes('unsupported') ? 'Attach evidence before accepting this assertion' : 'Mark review complete'}
                >
                  <FaCheck /> Accept
                </button>
                <button type="button" disabled={savingId === item.assertionId} onClick={() => void updateReview(assertion, 'disputed')}>
                  <FaExclamationTriangle /> Dispute
                </button>
                <button type="button" disabled={savingId === item.assertionId} onClick={() => void updateReview(assertion, 'rejected')}>
                  <FaTimes /> Reject
                </button>
              </div>

              {expanded ? (
                <div className="border-t border-slate-800/80 px-5 py-4">
                  <div className="grid gap-4 xl:grid-cols-2">
                    <section className="rounded-xl border border-slate-800 bg-slate-950/30 p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Evidence</p>
                          <h3 className="mt-1 text-sm font-semibold text-slate-100">What supports this claim?</h3>
                        </div>
                        {item.sourceId ? (
                          <button type="button" className="text-xs text-sky-300 hover:text-sky-200" onClick={() => onSelect({ kind: 'source', id: item.sourceId! })}>
                            Inspect source <FaExternalLinkAlt className="ml-1 inline" />
                          </button>
                        ) : null}
                      </div>

                      {item.sourceId ? (
                        <div className="mb-3 rounded-lg border border-emerald-900/60 bg-emerald-950/20 p-3 text-sm text-emerald-100">
                          <div className="flex items-center gap-2 font-medium"><FaLink /> {item.sourceTitle || 'Linked evidence'}</div>
                          <p className="mt-1 text-xs text-emerald-300/70">This assertion resolves to an evidence source. You can replace it below if the wrong source was attached.</p>
                        </div>
                      ) : (
                        <div className="mb-3 rounded-lg border border-amber-900/60 bg-amber-950/20 p-3 text-sm text-amber-100">
                          <div className="flex items-center gap-2 font-medium"><FaExclamationTriangle /> No resolvable evidence</div>
                          <p className="mt-1 text-xs text-amber-300/70">Choose an existing source below. The assertion stays the same record; only its evidence link changes.</p>
                        </div>
                      )}

                      <label className="relative block">
                        <FaSearch className="pointer-events-none absolute left-3 top-3 text-xs text-slate-500" />
                        <input
                          value={sourceQuery}
                          onChange={(event) => setSourceQuery(event.target.value)}
                          placeholder="Find evidence by title, file, kind, or locator"
                          className="w-full rounded-lg border border-slate-800 bg-slate-950 py-2 pl-9 pr-3 text-sm text-slate-100 outline-none focus:border-sky-700"
                        />
                      </label>

                      <div className="mt-2 max-h-44 space-y-1 overflow-y-auto">
                        {matchingSources.length > 0 ? matchingSources.map((source) => (
                          <button
                            type="button"
                            key={source.id}
                            disabled={savingId === item.assertionId || source.id === item.sourceId}
                            onClick={() => void attachSource(assertion, source)}
                            className="flex w-full items-start justify-between gap-3 rounded-lg border border-transparent px-3 py-2 text-left hover:border-slate-800 hover:bg-slate-900/70 disabled:opacity-50"
                          >
                            <span>
                              <strong className="block text-sm font-medium text-slate-200">{source.title || source.display_name || source.file_name || source.locator}</strong>
                              <small className="block text-xs text-slate-500">{source.kind} · used by {source.usage.length} assertion{source.usage.length === 1 ? '' : 's'}</small>
                            </span>
                            <span className="text-xs text-sky-300">{source.id === item.sourceId ? 'Linked' : 'Use'}</span>
                          </button>
                        )) : (
                          <p className="py-3 text-xs text-slate-500">No existing evidence matches this search.</p>
                        )}
                      </div>

                      <button
                        type="button"
                        className="mt-3 text-xs font-medium text-sky-300 hover:text-sky-200"
                        onClick={() => {
                          onSelect({ kind: 'entity', id: item.subjectId });
                          onNavigate('evidence');
                        }}
                      >
                        Need new evidence? Open Evidence intake →
                      </button>
                    </section>

                    <section className="rounded-xl border border-slate-800 bg-slate-950/30 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Analyst decision</p>
                      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="rounded-lg border border-slate-800 px-2 py-2">
                          <span className="block text-slate-500">Review</span>
                          <strong className="mt-1 block capitalize text-slate-200">{assertion.review_state}</strong>
                        </div>
                        <div className="rounded-lg border border-slate-800 px-2 py-2">
                          <span className="block text-slate-500">Confidence</span>
                          <strong className="mt-1 block capitalize text-slate-200">{assertion.confidence}</strong>
                        </div>
                        <div className="rounded-lg border border-slate-800 px-2 py-2">
                          <span className="block text-slate-500">Last review</span>
                          <strong className="mt-1 block text-slate-200">{reviewed ? reviewed.split(',')[0] : 'Never'}</strong>
                        </div>
                      </div>

                      {assertion.review_state === 'accepted' && assertion.confidence === 'unverified' ? (
                        <div className="mt-3 rounded-lg border border-sky-900/60 bg-sky-950/20 p-3 text-xs text-sky-200">
                          Review is complete, but verification is not. That is why this claim still appears here.
                        </div>
                      ) : null}

                      <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-slate-500">Review note</label>
                      <textarea
                        rows={3}
                        value={getNote(assertion)}
                        onChange={(event) => setNotes((current) => ({ ...current, [assertion.id]: event.target.value }))}
                        placeholder="Why did you accept, dispute, or reject this claim?"
                        className="mt-2 w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-700"
                      />
                      {reviewed ? <p className="mt-2 text-xs text-slate-500">Last reviewed {reviewed}{assertion.reviewed_by ? ` by ${assertion.reviewed_by}` : ''}.</p> : null}

                      <div className="mt-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Confidence</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={savingId === assertion.id || assertion.confidence === 'asserted'}
                            onClick={() => void updateConfidence(assertion, 'asserted')}
                            className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-200 hover:border-slate-500 disabled:opacity-40"
                          >
                            <FaFlag className="mr-1 inline" /> Mark asserted
                          </button>
                          <button
                            type="button"
                            disabled={savingId === assertion.id || assertion.confidence === 'verified' || !item.sourceId}
                            onClick={() => void updateConfidence(assertion, 'verified')}
                            className="rounded-lg border border-emerald-800 px-3 py-2 text-xs font-medium text-emerald-200 hover:border-emerald-600 disabled:opacity-40"
                            title={!item.sourceId ? 'Attach evidence before marking verified' : 'Mark verified'}
                          >
                            <FaShieldAlt className="mr-1 inline" /> Mark verified
                          </button>
                        </div>
                      </div>

                      <ReviewHistory
                        assertionId={assertion.id}
                        refreshKey={`${assertion.reviewed_at ?? 0}:${assertion.source_id}:${assertion.confidence}`}
                      />
                    </section>
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}
      </section>
    </div>
  );
}
