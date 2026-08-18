import { useEffect, useState } from 'react';
import type { AuditRecord } from '@shared/types';
import { piBridge } from '@renderer/services/piBridge';

type ReviewHistoryProps = {
  assertionId: string;
  refreshKey?: string | number | null;
};

function formatTimestamp(value: number): string {
  const millis = value < 10_000_000_000 ? value * 1000 : value;
  return new Date(millis).toLocaleString();
}

function actionLabel(action: string): string {
  if (action === 'review_assertion') return 'Review decision';
  if (action === 'link_source') return 'Evidence linked';
  return action.replace(/_/g, ' ');
}

export function ReviewHistory({ assertionId, refreshKey }: ReviewHistoryProps) {
  const [entries, setEntries] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void piBridge.listAuditBySubject('assertion', assertionId)
      .then((nextEntries) => {
        if (!cancelled) setEntries(nextEntries);
      })
      .catch((error) => {
        console.error('Failed to load assertion review history:', error);
        if (!cancelled) setEntries([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [assertionId, refreshKey]);

  return (
    <div className="mt-4 border-t border-slate-800 pt-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Decision history</p>
        <span className="text-xs text-slate-600">{entries.length} event{entries.length === 1 ? '' : 's'}</span>
      </div>

      {loading ? <p className="mt-2 text-xs text-slate-500">Loading history…</p> : null}
      {!loading && entries.length === 0 ? (
        <p className="mt-2 text-xs text-slate-500">No analyst decisions have been recorded for this assertion yet.</p>
      ) : null}

      {entries.length > 0 ? (
        <ol className="mt-3 space-y-2">
          {entries.slice(0, 8).map((entry) => (
            <li key={entry.id} className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2">
              <div className="flex items-start justify-between gap-3">
                <strong className="text-xs font-medium text-slate-200">{actionLabel(entry.action)}</strong>
                <time className="shrink-0 text-[11px] text-slate-600">{formatTimestamp(entry.created_at)}</time>
              </div>
              {entry.reason ? <p className="mt-1 text-xs leading-relaxed text-slate-400">{entry.reason}</p> : null}
              <p className="mt-1 text-[11px] text-slate-600">{entry.actor}</p>
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}
