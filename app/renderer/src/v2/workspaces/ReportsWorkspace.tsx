import { useEffect, useMemo, useState } from 'react';
import {
  FaCheckCircle,
  FaChevronDown,
  FaChevronUp,
  FaFileAlt,
  FaFileExport,
  FaFlag,
  FaLink,
  FaPlus,
  FaQuoteRight,
  FaTrash
} from 'react-icons/fa';
import type { FindingRecord, FindingStatus, SourceWithUsage } from '@shared/types';
import { piBridge, type ParsedAssertionRecord } from '@renderer/services/piBridge';
import type { GraphSnapshot } from '@renderer/types/graph';
import type { AttentionItem } from '../features/attention/model';
import { deriveFindingHealth } from '../features/findings/model';
import './evidence-reports.css';

type ReportsWorkspaceProps = {
  graph: GraphSnapshot;
  assertions: ParsedAssertionRecord[];
  sources: SourceWithUsage[];
  attentionItems: AttentionItem[];
  onGenerate: () => void;
};

const FINDING_STATUSES: Array<{ value: FindingStatus; label: string }> = [
  { value: 'draft', label: 'Draft' },
  { value: 'reviewed', label: 'Reviewed' },
  { value: 'disputed', label: 'Disputed' },
  { value: 'withdrawn', label: 'Withdrawn' }
];

function assertionValue(assertion: ParsedAssertionRecord): string {
  const values = Object.values(assertion.value ?? {});
  if (values.length === 0) return assertion.path;
  if (values.length === 1) return String(values[0]);
  return JSON.stringify(assertion.value);
}

export function ReportsWorkspace({ graph, assertions, sources, attentionItems, onGenerate }: ReportsWorkspaceProps) {
  const [findings, setFindings] = useState<FindingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [selectedAssertions, setSelectedAssertions] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  const accepted = useMemo(
    () => assertions.filter((assertion) => assertion.review_state === 'accepted'),
    [assertions]
  );
  const assertionById = useMemo(() => new Map(assertions.map((assertion) => [assertion.id, assertion])), [assertions]);
  const sourceById = useMemo(() => new Map(sources.map((source) => [source.id, source])), [sources]);
  const nodeById = useMemo(() => new Map(graph.nodes.map((node) => [node.id, node])), [graph.nodes]);
  const unresolvedHigh = attentionItems.filter((item) => item.severity === 'high');

  const loadFindings = async () => {
    setLoading(true);
    try {
      setFindings(await piBridge.listFindings());
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadFindings();
  }, []);

  const findingHealth = (finding: FindingRecord) => deriveFindingHealth(finding, assertionById, sourceById);

  const reviewedReady = findings.filter((finding) => findingHealth(finding).reportReady);
  const findingSourceIds = new Set(
    reviewedReady.flatMap((finding) => findingHealth(finding).linked.map((assertion) => assertion.source_id).filter(Boolean))
  );

  const createFinding = async () => {
    if (!title.trim()) return;
    setBusyId('create');
    try {
      await piBridge.createFinding({ title: title.trim(), body: body.trim(), assertion_ids: selectedAssertions });
      setTitle('');
      setBody('');
      setSelectedAssertions([]);
      await loadFindings();
    } finally {
      setBusyId(null);
    }
  };

  const updateFinding = async (finding: FindingRecord, updates: Partial<Pick<FindingRecord, 'status' | 'assertion_ids'>>) => {
    setBusyId(finding.id);
    try {
      await piBridge.updateFinding(finding.id, updates);
      await loadFindings();
    } finally {
      setBusyId(null);
    }
  };

  const deleteFinding = async (finding: FindingRecord) => {
    if (!window.confirm(`Delete finding “${finding.title}”?`)) return;
    setBusyId(finding.id);
    try {
      await piBridge.deleteFinding(finding.id);
      if (expandedId === finding.id) setExpandedId(null);
      await loadFindings();
    } finally {
      setBusyId(null);
    }
  };

  const exportEvidenceBundle = async () => {
    setBusyId('export');
    setExportMessage(null);
    try {
      const result = await piBridge.exportFindingsBundle();
      setExportMessage(`Exported ${result.findingCount} reviewed finding${result.findingCount === 1 ? '' : 's'} with ${result.sourceCount} cited source${result.sourceCount === 1 ? '' : 's'}.`);
      await piBridge.revealPath(result.outputDir);
    } catch (cause) {
      setExportMessage(`Export failed: ${cause instanceof Error ? cause.message : String(cause)}`);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="v2-workspace">
      <div className="v2-workspace-heading">
        <div>
          <span className="v2-eyebrow">Findings & Reports</span>
          <h1>Conclusions should remain traceable to evidence</h1>
          <p>A finding is a reviewed conclusion supported by explicit assertions. Sources are derived from those assertions, so provenance cannot quietly drift away from the claim.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="v2-toggle-button" disabled={busyId === 'export'} onClick={() => void exportEvidenceBundle()}><FaLink /> Export evidence bundle</button>
          <button type="button" className="v2-primary-button" onClick={onGenerate}><FaFileExport /> Generate narrative report</button>
        </div>
      </div>

      <div className="v2-metric-grid">
        <div className="v2-metric-card"><span className="v2-metric-icon"><FaFlag /></span><span>Findings</span><strong>{findings.length}</strong><small>Durable case conclusions, including drafts and disputed work</small></div>
        <div className="v2-metric-card"><span className="v2-metric-icon"><FaCheckCircle /></span><span>Report-ready</span><strong>{reviewedReady.length}</strong><small>Reviewed findings backed by accepted assertions and resolvable evidence</small></div>
        <div className="v2-metric-card"><span className="v2-metric-icon"><FaQuoteRight /></span><span>Cited sources</span><strong>{findingSourceIds.size}</strong><small>Evidence reachable from report-ready findings</small></div>
        <div className={`v2-metric-card${unresolvedHigh.length ? ' is-warning' : ' is-success'}`}><span className="v2-metric-icon"><FaFlag /></span><span>High-priority gaps</span><strong>{unresolvedHigh.length}</strong><small>Resolve these before treating the case narrative as settled</small></div>
      </div>

      {exportMessage ? <div className="rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3 text-sm text-slate-300">{exportMessage}</div> : null}
      {error ? <div className="rounded-xl border border-red-900/60 bg-red-950/20 px-4 py-3 text-sm text-red-200">Findings could not be loaded: {error}</div> : null}

      <section className="v2-panel">
        <div className="v2-panel-heading">
          <div><span>Create finding</span><small>Start from a conclusion, then choose the reviewed assertions that actually support it.</small></div>
        </div>
        <div className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
          <div className="space-y-3">
            <input className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-700" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Finding title" />
            <textarea className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-sky-700" rows={5} value={body} onChange={(event) => setBody(event.target.value)} placeholder="State the conclusion in plain language. Interpretation belongs here; supporting facts belong in assertions." />
            <button type="button" className="v2-primary-button" disabled={!title.trim() || busyId === 'create'} onClick={() => void createFinding()}><FaPlus /> Create draft finding</button>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Supporting accepted assertions</p>
            <div className="mt-2 max-h-56 space-y-1 overflow-y-auto rounded-xl border border-slate-800 bg-slate-950/30 p-2">
              {accepted.map((assertion) => {
                const checked = selectedAssertions.includes(assertion.id);
                const subject = nodeById.get(assertion.subject_id);
                return (
                  <label key={assertion.id} className="flex cursor-pointer items-start gap-3 rounded-lg px-2 py-2 hover:bg-slate-900/70">
                    <input type="checkbox" className="mt-1" checked={checked} onChange={() => setSelectedAssertions((current) => checked ? current.filter((id) => id !== assertion.id) : [...current, assertion.id])} />
                    <span className="min-w-0"><strong className="block text-sm font-medium text-slate-200">{assertionValue(assertion)}</strong><small className="block text-xs text-slate-500">{subject?.label || assertion.subject_id} · {assertion.path} · {assertion.confidence}</small></span>
                  </label>
                );
              })}
              {accepted.length === 0 ? <p className="p-3 text-xs text-slate-500">No accepted assertions are available yet. Resolve claims in Needs Attention first.</p> : null}
            </div>
          </div>
        </div>
      </section>

      <section className="v2-panel">
        <div className="v2-panel-heading"><div><span>Case findings</span><small>Reviewed findings become eligible for the provenance export only when all linked assertions remain accepted and sourced.</small></div></div>
        <div className="divide-y divide-slate-800/80">
          {findings.map((finding) => {
            const health = findingHealth(finding);
            const expanded = expandedId === finding.id;
            return (
              <article key={finding.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setExpandedId(expanded ? null : finding.id)}>
                    <span className="flex items-center gap-2"><strong className="text-base text-slate-100">{finding.title}</strong>{health.reportReady ? <span className="rounded-full border border-emerald-800 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">report-ready</span> : null}</span>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-400">{finding.body || 'No narrative recorded.'}</p>
                    <small className="mt-2 block text-xs text-slate-500">{finding.assertion_ids.length} assertion{finding.assertion_ids.length === 1 ? '' : 's'} · {health.sourceCount} source{health.sourceCount === 1 ? '' : 's'} · {finding.status}</small>
                  </button>
                  <div className="flex items-center gap-2">
                    <select className="v2-layout-select" value={finding.status} disabled={busyId === finding.id} onChange={(event) => void updateFinding(finding, { status: event.target.value as FindingStatus })}>
                      {FINDING_STATUSES.map((status) => <option key={status.value} value={status.value} disabled={status.value === 'reviewed' && (!health.allAccepted || !health.allSourced)}>{status.label}</option>)}
                    </select>
                    <button type="button" className="v2-icon-button" onClick={() => setExpandedId(expanded ? null : finding.id)} title={expanded ? 'Collapse' : 'Inspect provenance'}>{expanded ? <FaChevronUp /> : <FaChevronDown />}</button>
                    <button type="button" className="v2-icon-button" disabled={busyId === finding.id} onClick={() => void deleteFinding(finding)} title="Delete finding"><FaTrash /></button>
                  </div>
                </div>

                {!health.allAccepted || !health.allSourced ? (
                  <div className="mt-3 rounded-lg border border-amber-900/50 bg-amber-950/15 px-3 py-2 text-xs text-amber-200">
                    {!finding.assertion_ids.length ? 'Add at least one supporting assertion before this finding can be reviewed.' : !health.allAccepted ? 'One or more supporting assertions are no longer accepted.' : 'One or more supporting assertions do not resolve to evidence.'}
                  </div>
                ) : null}

                {expanded ? (
                  <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
                    <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Finding → assertion → source</p>
                      <div className="mt-3 space-y-2">
                        {health.linked.map((assertion) => {
                          const source = sourceById.get(assertion.source_id);
                          const subject = nodeById.get(assertion.subject_id);
                          return (
                            <div key={assertion.id} className="rounded-lg border border-slate-800 p-3">
                              <strong className="block text-sm text-slate-200">{assertionValue(assertion)}</strong>
                              <small className="mt-1 block text-xs text-slate-500">{subject?.label || assertion.subject_id} · {assertion.path} · {assertion.review_state}/{assertion.confidence}</small>
                              <div className="mt-2 flex items-center gap-2 text-xs text-sky-300"><FaQuoteRight /> {source ? source.title || source.display_name || source.file_name || source.locator : 'Missing evidence source'}</div>
                            </div>
                          );
                        })}
                        {health.linked.length === 0 ? <p className="py-3 text-xs text-slate-500">No supporting assertions linked.</p> : null}
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-950/30 p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Edit support</p>
                      <div className="mt-2 max-h-64 space-y-1 overflow-y-auto">
                        {accepted.map((assertion) => {
                          const checked = finding.assertion_ids.includes(assertion.id);
                          return (
                            <label key={assertion.id} className="flex cursor-pointer items-start gap-2 rounded px-2 py-1.5 hover:bg-slate-900/70">
                              <input type="checkbox" className="mt-1" checked={checked} disabled={busyId === finding.id} onChange={() => void updateFinding(finding, { assertion_ids: checked ? finding.assertion_ids.filter((id) => id !== assertion.id) : [...finding.assertion_ids, assertion.id] })} />
                              <span className="text-xs text-slate-300">{assertionValue(assertion)}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })}
          {!loading && findings.length === 0 ? <div className="v2-empty-state">No findings yet. Create a draft from reviewed assertions above.</div> : null}
          {loading ? <div className="v2-empty-state">Loading findings…</div> : null}
        </div>
      </section>

      <section className="v2-panel v2-report-principle">
        <div className="v2-report-chain">
          <span><strong>Evidence</strong><small>Original source material</small></span><b>→</b>
          <span><strong>Assertion</strong><small>A reviewable claim</small></span><b>→</b>
          <span><strong>Finding</strong><small>A durable conclusion</small></span><b>→</b>
          <span><strong>Report</strong><small>Narrative output with provenance</small></span>
        </div>
        <div className="v2-report-note"><FaFileAlt /><p>The JSON/Markdown evidence bundle is deterministic in ordering and contains only reviewed findings. Narrative HTML/PDF generation remains a separate presentation layer, so a prose generator cannot silently rewrite the evidentiary backbone.</p></div>
      </section>
    </div>
  );
}
