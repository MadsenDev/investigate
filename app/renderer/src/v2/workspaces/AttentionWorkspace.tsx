import { useMemo, useState } from 'react';
import { FaCheck, FaDatabase, FaExclamationTriangle, FaFlag, FaTimes } from 'react-icons/fa';
import { piBridge } from '@renderer/services/piBridge';
import type { AttentionItem } from '../features/attention/model';
import { ATTENTION_REASON_COPY } from '../features/attention/model';
import type { AttentionReason, InvestigationSelection } from '../types';

type AttentionWorkspaceProps = {
  items: AttentionItem[];
  onSelect: (selection: InvestigationSelection) => void;
  onRefresh: () => Promise<void>;
};

const filters: Array<{ id: 'all' | AttentionReason; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'unsupported', label: 'Unsupported' },
  { id: 'disputed', label: 'Disputed' },
  { id: 'unreviewed', label: 'Unreviewed' },
  { id: 'unverified', label: 'Unverified' }
];

export function AttentionWorkspace({ items, onSelect, onRefresh }: AttentionWorkspaceProps) {
  const [filter, setFilter] = useState<'all' | AttentionReason>('all');
  const [savingId, setSavingId] = useState<string | null>(null);
  const visibleItems = useMemo(
    () => filter === 'all' ? items : items.filter((item) => item.reasons.includes(filter)),
    [filter, items]
  );

  const updateReview = async (assertionId: string, state: 'accepted' | 'disputed' | 'rejected') => {
    setSavingId(assertionId);
    try {
      await piBridge.updateAssertion(assertionId, {
        review_state: state,
        reviewed_at: Date.now(),
        reviewed_by: 'local-user'
      });
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
          <h1>Things worth resolving, with a reason attached</h1>
          <p>This is the user-facing replacement for an abstract Review queue. Vitni tells you why a claim is here and what you can do next.</p>
        </div>
      </div>
      <div className="v2-filter-pills">
        {filters.map((item) => (
          <button type="button" key={item.id} className={filter === item.id ? 'is-active' : ''} onClick={() => setFilter(item.id)}>
            {item.label}
            <span>{item.id === 'all' ? items.length : items.filter((attention) => attention.reasons.includes(item.id)).length}</span>
          </button>
        ))}
      </div>

      <section className="v2-attention-workspace-list">
        {visibleItems.length === 0 ? (
          <div className="v2-panel v2-empty-state success">Nothing in this category currently needs attention.</div>
        ) : visibleItems.map((item) => (
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
              <button type="button" disabled={savingId === item.assertionId || item.reasons.includes('unsupported')} onClick={() => void updateReview(item.assertionId, 'accepted')} title={item.reasons.includes('unsupported') ? 'Attach a source before accepting this assertion' : 'Accept assertion'}><FaCheck /> Accept</button>
              <button type="button" disabled={savingId === item.assertionId} onClick={() => void updateReview(item.assertionId, 'disputed')}><FaExclamationTriangle /> Dispute</button>
              <button type="button" disabled={savingId === item.assertionId} onClick={() => void updateReview(item.assertionId, 'rejected')}><FaTimes /> Reject</button>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
