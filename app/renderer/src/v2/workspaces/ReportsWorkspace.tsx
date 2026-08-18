import { FaFileAlt, FaFileExport, FaFlag, FaQuoteRight } from 'react-icons/fa';
import type { SourceWithUsage } from '@shared/types';
import type { ParsedAssertionRecord } from '@renderer/services/piBridge';
import type { GraphSnapshot } from '@renderer/types/graph';
import type { AttentionItem } from '../features/attention/model';
import './evidence-reports.css';

type ReportsWorkspaceProps = {
  graph: GraphSnapshot;
  assertions: ParsedAssertionRecord[];
  sources: SourceWithUsage[];
  attentionItems: AttentionItem[];
  onGenerate: () => void;
};

export function ReportsWorkspace({ graph, assertions, sources, attentionItems, onGenerate }: ReportsWorkspaceProps) {
  const accepted = assertions.filter((assertion) => assertion.review_state === 'accepted');
  const citedSourceIds = new Set(accepted.map((assertion) => assertion.source_id).filter(Boolean));
  const citedSources = sources.filter((source) => citedSourceIds.has(source.id));
  const unresolvedHigh = attentionItems.filter((item) => item.severity === 'high');

  return (
    <div className="v2-workspace">
      <div className="v2-workspace-heading">
        <div>
          <span className="v2-eyebrow">Reports</span>
          <h1>Conclusions should remain traceable to evidence</h1>
          <p>Vitni 2 keeps the existing report generator available while the finding → assertion → source model is made explicit.</p>
        </div>
        <button type="button" className="v2-primary-button" onClick={onGenerate}><FaFileExport /> Generate report</button>
      </div>

      <div className="v2-metric-grid">
        <div className="v2-metric-card"><span className="v2-metric-icon"><FaFlag /></span><span>Accepted assertions</span><strong>{accepted.length}</strong><small>Reviewed claims currently eligible to support findings</small></div>
        <div className="v2-metric-card"><span className="v2-metric-icon"><FaQuoteRight /></span><span>Cited sources</span><strong>{citedSources.length}</strong><small>Source material used by accepted assertions</small></div>
        <div className={`v2-metric-card${unresolvedHigh.length ? ' is-warning' : ' is-success'}`}><span className="v2-metric-icon"><FaFlag /></span><span>High-priority gaps</span><strong>{unresolvedHigh.length}</strong><small>Resolve these before treating the report as defensible</small></div>
        <div className="v2-metric-card"><span className="v2-metric-icon"><FaFileAlt /></span><span>Case entities</span><strong>{graph.nodes.length}</strong><small>Available context for full-case and focused reports</small></div>
      </div>

      <section className="v2-panel v2-report-principle">
        <div className="v2-report-chain">
          <span><strong>Evidence</strong><small>Original source material</small></span>
          <b>→</b>
          <span><strong>Assertion</strong><small>A claim Vitni can review</small></span>
          <b>→</b>
          <span><strong>Finding</strong><small>A defensible conclusion</small></span>
          <b>→</b>
          <span><strong>Report</strong><small>Readable output with provenance</small></span>
        </div>
        <div className="v2-report-note">
          <FaQuoteRight />
          <p>The current report generator remains functional during migration. A later Vitni 2 phase will introduce explicit reviewed findings and deterministic citation/appendix structure before optional AI narrative assistance.</p>
        </div>
      </section>
    </div>
  );
}
