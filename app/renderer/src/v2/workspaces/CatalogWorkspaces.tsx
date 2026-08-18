import { useMemo, useState } from 'react';
import { FaDatabase, FaFlag, FaSearch, FaUserFriends } from 'react-icons/fa';
import type { SourceWithUsage } from '@shared/types';
import type { ParsedAssertionRecord } from '@renderer/services/piBridge';
import type { GraphSnapshot } from '@renderer/types/graph';
import { displayNameForNode } from '@renderer/features/graph/labeling';
import type { AttentionItem } from '../features/attention/model';
import type { InvestigationSelection } from '../types';

function SearchField({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <label className="v2-filter-search">
      <FaSearch aria-hidden="true" />
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </label>
  );
}

export function EntitiesWorkspace({ graph, attentionItems, onSelect }: { graph: GraphSnapshot; attentionItems: AttentionItem[]; onSelect: (selection: InvestigationSelection) => void }) {
  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');
  const types = useMemo(() => Array.from(new Set(graph.nodes.map((node) => node.type))).sort(), [graph.nodes]);
  const attentionBySubject = useMemo(() => {
    const counts = new Map<string, number>();
    attentionItems.forEach((item) => counts.set(item.subjectId, (counts.get(item.subjectId) || 0) + 1));
    return counts;
  }, [attentionItems]);
  const rows = useMemo(() => graph.nodes.filter((node) => {
    if (type !== 'all' && node.type !== type) return false;
    const haystack = `${displayNameForNode(node)} ${node.type} ${Object.values(node.properties).join(' ')}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  }), [graph.nodes, query, type]);

  return (
    <div className="v2-workspace">
      <div className="v2-workspace-heading"><div><span className="v2-eyebrow">Entities</span><h1>The things in this investigation</h1><p>People, organizations, locations, evidence objects and events, without making the graph carry the entire case.</p></div></div>
      <div className="v2-toolbar"><SearchField value={query} onChange={setQuery} placeholder="Search entities…" /><select value={type} onChange={(event) => setType(event.target.value)}><option value="all">All types</option>{types.map((item) => <option key={item} value={item}>{item.replace(/_/g, ' ')}</option>)}</select><span className="v2-result-count">{rows.length} result{rows.length === 1 ? '' : 's'}</span></div>
      <section className="v2-panel v2-table-panel">
        <div className="v2-data-table">
          <div className="v2-data-row is-header"><span>Name</span><span>Type</span><span>Connections</span><span>Attention</span><span>Updated</span></div>
          {rows.map((node) => {
            const connections = graph.edges.filter((edge) => edge.src_id === node.id || edge.dst_id === node.id).length;
            const attention = attentionBySubject.get(node.id) || 0;
            return <button type="button" className="v2-data-row" key={node.id} onClick={() => onSelect({ kind: node.type === 'event' || node.type === 'incident' ? 'event' : 'entity', id: node.id })}><span className="v2-table-primary"><FaUserFriends /><strong>{displayNameForNode(node)}</strong></span><span>{node.type.replace(/_/g, ' ')}</span><span>{connections}</span><span>{attention ? <em className="v2-table-alert">{attention}</em> : '—'}</span><span>{new Date(node.updated_at).toLocaleDateString()}</span></button>;
          })}
          {rows.length === 0 ? <div className="v2-empty-state">No entities match the current filters.</div> : null}
        </div>
      </section>
    </div>
  );
}

function assertionValue(assertion: ParsedAssertionRecord): string {
  const value = Object.values(assertion.value).find((candidate) => ['string', 'number', 'boolean'].includes(typeof candidate));
  return value === undefined ? JSON.stringify(assertion.value) : String(value);
}

export function AssertionsWorkspace({ graph, assertions, attentionItems, onSelect }: { graph: GraphSnapshot; assertions: ParsedAssertionRecord[]; attentionItems: AttentionItem[]; onSelect: (selection: InvestigationSelection) => void }) {
  const [query, setQuery] = useState('');
  const [review, setReview] = useState('all');
  const attentionByAssertion = useMemo(() => new Map(attentionItems.map((item) => [item.assertionId, item])), [attentionItems]);
  const nodeById = useMemo(() => new Map(graph.nodes.map((node) => [node.id, node])), [graph.nodes]);
  const rows = assertions.filter((assertion) => {
    if (review !== 'all' && assertion.review_state !== review) return false;
    const node = nodeById.get(assertion.subject_id);
    return `${node ? displayNameForNode(node) : assertion.subject_id} ${assertion.path} ${assertionValue(assertion)}`.toLowerCase().includes(query.toLowerCase());
  });

  return (
    <div className="v2-workspace">
      <div className="v2-workspace-heading"><div><span className="v2-eyebrow">Assertions</span><h1>What the investigation currently claims</h1><p>Every claim stays tied to a subject, confidence, review state and source context.</p></div></div>
      <div className="v2-toolbar"><SearchField value={query} onChange={setQuery} placeholder="Search assertions…" /><select value={review} onChange={(event) => setReview(event.target.value)}><option value="all">All review states</option><option value="unreviewed">Unreviewed</option><option value="accepted">Accepted</option><option value="disputed">Disputed</option><option value="rejected">Rejected</option></select><span className="v2-result-count">{rows.length} assertions</span></div>
      <section className="v2-panel v2-table-panel"><div className="v2-data-table"><div className="v2-data-row is-header"><span>Subject / claim</span><span>Field</span><span>Confidence</span><span>Review</span><span>Attention</span></div>{rows.map((assertion) => {
        const node = nodeById.get(assertion.subject_id);
        const attention = attentionByAssertion.get(assertion.id);
        return <button type="button" className="v2-data-row" key={assertion.id} onClick={() => onSelect({ kind: 'assertion', id: assertion.id })}><span className="v2-table-primary"><FaFlag /><span><strong>{node ? displayNameForNode(node) : assertion.subject_id}</strong><small>{assertionValue(assertion)}</small></span></span><span>{assertion.path.replace(/_/g, ' ')}</span><span><em className={`v2-state-chip is-${assertion.confidence}`}>{assertion.confidence}</em></span><span><em className={`v2-state-chip is-${assertion.review_state}`}>{assertion.review_state}</em></span><span>{attention ? <em className={`v2-severity-chip is-${attention.severity}`}>{attention.reasons.length}</em> : '—'}</span></button>;
      })}{rows.length === 0 ? <div className="v2-empty-state">No assertions match the current filters.</div> : null}</div></section>
    </div>
  );
}

export function SourcesWorkspace({ sources, onSelect }: { sources: SourceWithUsage[]; onSelect: (selection: InvestigationSelection) => void }) {
  const [query, setQuery] = useState('');
  const rows = sources.filter((source) => `${source.title || ''} ${source.locator} ${source.kind} ${source.display_name || ''}`.toLowerCase().includes(query.toLowerCase()));
  return (
    <div className="v2-workspace">
      <div className="v2-workspace-heading"><div><span className="v2-eyebrow">Sources</span><h1>Why the investigation believes what it believes</h1><p>See evidence metadata and exactly where each source is used.</p></div></div>
      <div className="v2-toolbar"><SearchField value={query} onChange={setQuery} placeholder="Search sources…" /><span className="v2-result-count">{rows.length} sources</span></div>
      <section className="v2-panel v2-table-panel"><div className="v2-data-table"><div className="v2-data-row is-header"><span>Source</span><span>Kind</span><span>Usage</span><span>Added</span><span>Location</span></div>{rows.map((source) => <button type="button" className="v2-data-row" key={source.id} onClick={() => onSelect({ kind: 'source', id: source.id })}><span className="v2-table-primary"><FaDatabase /><span><strong>{source.title || source.display_name || source.file_name || source.kind}</strong><small>{source.mime || source.locator}</small></span></span><span>{source.kind}</span><span>{source.usage.length} assertion{source.usage.length === 1 ? '' : 's'}</span><span>{new Date(source.added_at).toLocaleDateString()}</span><span className="v2-truncate">{source.locator}</span></button>)}{rows.length === 0 ? <div className="v2-empty-state">No sources match the search.</div> : null}</div></section>
    </div>
  );
}
