import { FaArrowRight, FaClock, FaDatabase, FaFlag, FaProjectDiagram, FaRegListAlt, FaUserFriends } from 'react-icons/fa';
import type { SourceWithUsage } from '@shared/types';
import type { ParsedAssertionRecord } from '@renderer/services/piBridge';
import type { GraphSnapshot } from '@renderer/types/graph';
import { displayNameForNode } from '@renderer/features/graph/labeling';
import type { InvestigationActivityItem } from '../features/activity/model';
import type { AttentionItem } from '../features/attention/model';
import { ATTENTION_REASON_COPY } from '../features/attention/model';
import type { InvestigationSelection, Vitni2Workspace } from '../types';

type OverviewWorkspaceProps = {
  graph: GraphSnapshot;
  assertions: ParsedAssertionRecord[];
  sources: SourceWithUsage[];
  attentionItems: AttentionItem[];
  recentActivity: InvestigationActivityItem[];
  onSelect: (selection: InvestigationSelection) => void;
  onNavigate: (workspace: Vitni2Workspace) => void;
};

function formatTime(timestamp: number): string {
  if (!timestamp) return 'Unknown';
  const delta = Date.now() - timestamp;
  if (delta < 60_000) return 'Just now';
  if (delta < 3_600_000) return `${Math.max(1, Math.round(delta / 60_000))}m ago`;
  if (delta < 86_400_000) return `${Math.max(1, Math.round(delta / 3_600_000))}h ago`;
  if (delta < 604_800_000) return `${Math.max(1, Math.round(delta / 86_400_000))}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

function valueForDate(properties: Record<string, unknown>): string | null {
  for (const key of ['date', 'eventDate', 'event_date', 'occurredAt', 'occurred_at', 'startDate', 'start_date']) {
    const value = properties[key];
    if (typeof value === 'string' && value.trim()) return value;
  }
  return null;
}

function metricTone(attention: number): string {
  if (attention > 20) return 'danger';
  if (attention > 0) return 'warning';
  return 'success';
}

export function OverviewWorkspace({
  graph,
  assertions,
  sources,
  attentionItems,
  recentActivity,
  onSelect,
  onNavigate
}: OverviewWorkspaceProps) {
  const relationshipCount = graph.edges.length;
  const eventNodes = graph.nodes
    .filter((node) => node.type === 'event' || node.type === 'incident')
    .map((node) => ({ node, date: valueForDate(node.properties) }))
    .sort((left, right) => String(left.date || '').localeCompare(String(right.date || '')))
    .slice(-6);

  const topConnected = graph.nodes
    .map((node) => ({
      node,
      degree: graph.edges.filter((edge) => edge.src_id === node.id || edge.dst_id === node.id).length
    }))
    .sort((left, right) => right.degree - left.degree)
    .slice(0, 5);

  return (
    <div className="v2-workspace v2-overview">
      <div className="v2-workspace-heading">
        <div>
          <span className="v2-eyebrow">Investigation overview</span>
          <h1>What needs your attention?</h1>
          <p>Case health, recent evidence and the strongest investigative context in one place.</p>
        </div>
      </div>

      <div className="v2-metric-grid">
        <button type="button" className="v2-metric-card" onClick={() => onNavigate('entities')}>
          <span className="v2-metric-icon"><FaUserFriends /></span>
          <span>Entities</span>
          <strong>{graph.nodes.length}</strong>
          <small>People, organizations, events and evidence objects</small>
        </button>
        <button type="button" className="v2-metric-card" onClick={() => onNavigate('assertions')}>
          <span className="v2-metric-icon"><FaRegListAlt /></span>
          <span>Assertions</span>
          <strong>{assertions.length}</strong>
          <small>Claims currently recorded in this case</small>
        </button>
        <button type="button" className="v2-metric-card" onClick={() => onNavigate('sources')}>
          <span className="v2-metric-icon"><FaDatabase /></span>
          <span>Sources</span>
          <strong>{sources.length}</strong>
          <small>Documents, media and source records</small>
        </button>
        <button type="button" className={`v2-metric-card is-${metricTone(attentionItems.length)}`} onClick={() => onNavigate('attention')}>
          <span className="v2-metric-icon"><FaFlag /></span>
          <span>Needs attention</span>
          <strong>{attentionItems.length}</strong>
          <small>Weak, disputed or unreviewed assertions</small>
        </button>
      </div>

      <div className="v2-overview-columns">
        <section className="v2-panel">
          <div className="v2-panel-heading">
            <div><span>Recent activity</span><small>Latest changes across the case</small></div>
          </div>
          <div className="v2-activity-list">
            {recentActivity.length === 0 ? <div className="v2-empty-state">No recent case activity yet.</div> : recentActivity.map((activity) => (
              <button
                type="button"
                key={activity.id}
                className="v2-activity-item"
                onClick={() => {
                  if (activity.kind === 'entity') onSelect({ kind: 'entity', id: activity.targetId });
                  if (activity.kind === 'assertion') onSelect({ kind: 'assertion', id: activity.targetId });
                  if (activity.kind === 'source') onSelect({ kind: 'source', id: activity.targetId });
                }}
              >
                <span className={`v2-activity-kind is-${activity.kind}`}>
                  {activity.kind === 'entity' ? <FaUserFriends /> : activity.kind === 'source' ? <FaDatabase /> : <FaFlag />}
                </span>
                <span className="v2-activity-copy"><strong>{activity.title}</strong><small>{activity.description}</small></span>
                <time>{formatTime(activity.occurredAt)}</time>
              </button>
            ))}
          </div>
        </section>

        <section className="v2-panel">
          <div className="v2-panel-heading">
            <div><span>Needs attention</span><small>Vitni can explain why each item is here</small></div>
            <button type="button" className="v2-text-button" onClick={() => onNavigate('attention')}>View all <FaArrowRight /></button>
          </div>
          <div className="v2-attention-list">
            {attentionItems.length === 0 ? (
              <div className="v2-empty-state success">No unresolved attention items. The current assertions are reviewed, supported and verified.</div>
            ) : attentionItems.slice(0, 5).map((item) => (
              <button type="button" key={item.assertionId} className="v2-attention-item" onClick={() => onSelect({ kind: 'assertion', id: item.assertionId })}>
                <span className={`v2-severity-marker is-${item.severity}`} />
                <span className="v2-attention-copy">
                  <strong>{ATTENTION_REASON_COPY[item.reasons[0]].label}</strong>
                  <small>{item.subjectLabel} · {item.assertionPath}</small>
                  <em>{item.valueLabel}</em>
                </span>
                <span className={`v2-severity-chip is-${item.severity}`}>{item.severity}</span>
              </button>
            ))}
          </div>
        </section>
      </div>

      <div className="v2-overview-lower">
        <section className="v2-panel v2-network-summary">
          <div className="v2-panel-heading">
            <div><span>Investigation graph</span><small>{graph.nodes.length} entities · {relationshipCount} relationships</small></div>
            <button type="button" className="v2-text-button" onClick={() => onNavigate('graph')}>Open graph <FaArrowRight /></button>
          </div>
          <div className="v2-network-stage">
            <div className="v2-network-hub"><FaProjectDiagram /><strong>{relationshipCount}</strong><span>relationships</span></div>
            <div className="v2-network-entities">
              {topConnected.map(({ node, degree }) => (
                <button type="button" key={node.id} onClick={() => onSelect({ kind: 'entity', id: node.id })}>
                  <span>{degree}</span><strong>{displayNameForNode(node)}</strong><small>{node.type.replace(/_/g, ' ')}</small>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="v2-panel v2-timeline-summary">
          <div className="v2-panel-heading">
            <div><span>Timeline</span><small>Events already represented in this investigation</small></div>
            <button type="button" className="v2-text-button" onClick={() => onNavigate('timeline')}>Open timeline <FaArrowRight /></button>
          </div>
          <div className="v2-mini-timeline">
            {eventNodes.length === 0 ? <div className="v2-empty-state">Add event or incident entities to build chronology.</div> : eventNodes.map(({ node, date }) => (
              <button type="button" key={node.id} onClick={() => onSelect({ kind: 'event', id: node.id })}>
                <span className="v2-mini-timeline-dot"><FaClock /></span>
                <strong>{displayNameForNode(node)}</strong>
                <small>{date || new Date(node.created_at).toLocaleDateString()}</small>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
