import { useMemo } from 'react';
import { FaDatabase, FaFlag, FaLink, FaProjectDiagram, FaTimes, FaUserCircle } from 'react-icons/fa';
import type { SourceWithUsage } from '@shared/types';
import type { ParsedAssertionRecord } from '@renderer/services/piBridge';
import type { GraphSnapshot } from '@renderer/types/graph';
import { displayNameForNode } from '@renderer/features/graph/labeling';
import type { AttentionItem } from '../features/attention/model';
import { ATTENTION_REASON_COPY } from '../features/attention/model';
import type { InspectorTab, InvestigationSelection } from '../types';

type InspectorProps = {
  selection: InvestigationSelection;
  graph: GraphSnapshot;
  assertions: ParsedAssertionRecord[];
  sources: SourceWithUsage[];
  attentionItems: AttentionItem[];
  tab: InspectorTab;
  onTabChange: (tab: InspectorTab) => void;
  onClose: () => void;
  onSelect: (selection: InvestigationSelection) => void;
};

function formatLabel(value: string): string {
  return value.replace(/[_-]+/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.map(formatValue).join(', ');
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function AssertionValue({ assertion }: { assertion: ParsedAssertionRecord }) {
  const value = Object.values(assertion.value).find(
    (candidate) => typeof candidate === 'string' || typeof candidate === 'number' || typeof candidate === 'boolean'
  );
  return <>{formatValue(value ?? assertion.value)}</>;
}

export function Inspector({
  selection,
  graph,
  assertions,
  sources,
  attentionItems,
  tab,
  onTabChange,
  onClose,
  onSelect
}: InspectorProps) {
  const entity = useMemo(() => {
    if (!selection || (selection.kind !== 'entity' && selection.kind !== 'event')) return null;
    return graph.nodes.find((node) => node.id === selection.id) ?? null;
  }, [graph.nodes, selection]);
  const relationship = useMemo(() => {
    if (selection?.kind !== 'relationship') return null;
    return graph.edges.find((edge) => edge.id === selection.id) ?? null;
  }, [graph.edges, selection]);
  const assertion = useMemo(() => {
    if (selection?.kind !== 'assertion') return null;
    return assertions.find((item) => item.id === selection.id) ?? null;
  }, [assertions, selection]);
  const source = useMemo(() => {
    if (selection?.kind !== 'source') return null;
    return sources.find((item) => item.id === selection.id) ?? null;
  }, [selection, sources]);

  if (!selection) {
    return (
      <aside className="v2-inspector is-empty">
        <div className="v2-inspector-empty-icon"><FaProjectDiagram /></div>
        <strong>Nothing selected</strong>
        <p>Select an entity, assertion, source, relationship or event to keep its context visible here.</p>
      </aside>
    );
  }

  if (entity) {
    const entityAssertions = assertions.filter((item) => item.subject_id === entity.id);
    const entitySourceIds = new Set(entityAssertions.map((item) => item.source_id).filter(Boolean));
    const entitySources = sources.filter((item) => entitySourceIds.has(item.id) || item.usage.some((usage) => usage.entity_id === entity.id));
    const relationships = graph.edges.filter((edge) => edge.src_id === entity.id || edge.dst_id === entity.id);
    const relatedAttention = attentionItems.filter((item) => item.subjectId === entity.id);
    const tabs: Array<{ id: InspectorTab; label: string; count?: number }> = [
      { id: 'details', label: 'Details' },
      { id: 'relationships', label: 'Relationships', count: relationships.length },
      { id: 'assertions', label: 'Assertions', count: entityAssertions.length },
      { id: 'sources', label: 'Sources', count: entitySources.length }
    ];

    return (
      <aside className="v2-inspector">
        <div className="v2-inspector-header">
          <div className="v2-inspector-avatar"><FaUserCircle /></div>
          <div className="v2-inspector-title">
            <span>{formatLabel(entity.type)}</span>
            <strong>{displayNameForNode(entity)}</strong>
          </div>
          <button type="button" className="v2-icon-button" onClick={onClose} aria-label="Close inspector"><FaTimes /></button>
        </div>
        {relatedAttention.length > 0 ? (
          <button type="button" className="v2-inspector-attention" onClick={() => onSelect({ kind: 'assertion', id: relatedAttention[0].assertionId })}>
            <FaFlag />
            <span>{relatedAttention.length} item{relatedAttention.length === 1 ? '' : 's'} need attention</span>
          </button>
        ) : null}
        <div className="v2-inspector-tabs">
          {tabs.map((item) => (
            <button type="button" key={item.id} className={tab === item.id ? 'is-active' : ''} onClick={() => onTabChange(item.id)}>
              {item.label}{item.count !== undefined ? <span>{item.count}</span> : null}
            </button>
          ))}
        </div>
        <div className="v2-inspector-body">
          {tab === 'details' ? (
            <div className="v2-property-list">
              <div className="v2-property-row"><span>Entity type</span><strong>{formatLabel(entity.type)}</strong></div>
              <div className="v2-property-row"><span>Name</span><strong>{displayNameForNode(entity)}</strong></div>
              {Object.entries(entity.properties).map(([key, value]) => (
                <div className="v2-property-row" key={key}><span>{formatLabel(key)}</span><strong>{formatValue(value)}</strong></div>
              ))}
            </div>
          ) : null}
          {tab === 'relationships' ? (
            <div className="v2-inspector-list">
              {relationships.length === 0 ? <div className="v2-empty-state compact">No relationships yet.</div> : relationships.map((edge) => {
                const otherId = edge.src_id === entity.id ? edge.dst_id : edge.src_id;
                const other = graph.nodes.find((node) => node.id === otherId);
                return (
                  <button type="button" key={edge.id} className="v2-inspector-list-item" onClick={() => onSelect({ kind: 'relationship', id: edge.id })}>
                    <FaLink /><span><strong>{formatLabel(edge.type)}</strong><small>{other ? displayNameForNode(other) : otherId}</small></span>
                  </button>
                );
              })}
            </div>
          ) : null}
          {tab === 'assertions' ? (
            <div className="v2-inspector-list">
              {entityAssertions.length === 0 ? <div className="v2-empty-state compact">No assertions yet.</div> : entityAssertions.map((item) => (
                <button type="button" key={item.id} className="v2-inspector-list-item" onClick={() => onSelect({ kind: 'assertion', id: item.id })}>
                  <FaFlag /><span><strong>{formatLabel(item.path)}</strong><small><AssertionValue assertion={item} /></small></span>
                </button>
              ))}
            </div>
          ) : null}
          {tab === 'sources' ? (
            <div className="v2-inspector-list">
              {entitySources.length === 0 ? <div className="v2-empty-state compact">No sources linked yet.</div> : entitySources.map((item) => (
                <button type="button" key={item.id} className="v2-inspector-list-item" onClick={() => onSelect({ kind: 'source', id: item.id })}>
                  <FaDatabase /><span><strong>{item.title || item.display_name || item.file_name || item.kind}</strong><small>{item.locator}</small></span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </aside>
    );
  }

  if (assertion) {
    const assertionSource = sources.find((item) => item.id === assertion.source_id);
    const subject = graph.nodes.find((node) => node.id === assertion.subject_id);
    const attention = attentionItems.find((item) => item.assertionId === assertion.id);
    return (
      <aside className="v2-inspector">
        <div className="v2-inspector-header">
          <div className="v2-inspector-avatar is-assertion"><FaFlag /></div>
          <div className="v2-inspector-title"><span>Assertion</span><strong>{formatLabel(assertion.path)}</strong></div>
          <button type="button" className="v2-icon-button" onClick={onClose}><FaTimes /></button>
        </div>
        <div className="v2-inspector-body">
          <div className="v2-claim-card"><span>Claim</span><strong><AssertionValue assertion={assertion} /></strong></div>
          {attention ? (
            <div className={`v2-attention-summary is-${attention.severity}`}>
              <strong>Needs attention</strong>
              {attention.reasons.map((reason) => <span key={reason}>{ATTENTION_REASON_COPY[reason].label}</span>)}
            </div>
          ) : null}
          <div className="v2-property-list">
            <button type="button" className="v2-property-row is-action" onClick={() => subject && onSelect({ kind: 'entity', id: subject.id })}>
              <span>Subject</span><strong>{subject ? displayNameForNode(subject) : assertion.subject_id}</strong>
            </button>
            <div className="v2-property-row"><span>Review state</span><strong>{formatLabel(assertion.review_state)}</strong></div>
            <div className="v2-property-row"><span>Confidence</span><strong>{formatLabel(assertion.confidence)}</strong></div>
            {assertion.review_note ? <div className="v2-property-row"><span>Review note</span><strong>{assertion.review_note}</strong></div> : null}
          </div>
          <div className="v2-inspector-section-title">Source</div>
          {assertionSource ? (
            <button type="button" className="v2-source-card" onClick={() => onSelect({ kind: 'source', id: assertionSource.id })}>
              <FaDatabase /><span><strong>{assertionSource.title || assertionSource.locator}</strong><small>{assertionSource.kind}</small></span>
            </button>
          ) : <div className="v2-empty-state compact">No resolvable source is attached.</div>}
        </div>
      </aside>
    );
  }

  if (source) {
    return (
      <aside className="v2-inspector">
        <div className="v2-inspector-header">
          <div className="v2-inspector-avatar is-source"><FaDatabase /></div>
          <div className="v2-inspector-title"><span>Source</span><strong>{source.title || source.display_name || source.file_name || source.kind}</strong></div>
          <button type="button" className="v2-icon-button" onClick={onClose}><FaTimes /></button>
        </div>
        <div className="v2-inspector-body">
          <div className="v2-property-list">
            <div className="v2-property-row"><span>Kind</span><strong>{formatLabel(source.kind)}</strong></div>
            <div className="v2-property-row"><span>Locator</span><strong>{source.locator}</strong></div>
            <div className="v2-property-row"><span>MIME</span><strong>{source.mime || '—'}</strong></div>
            <div className="v2-property-row"><span>Used by</span><strong>{source.usage.length} assertion{source.usage.length === 1 ? '' : 's'}</strong></div>
          </div>
          <div className="v2-inspector-section-title">Usage</div>
          <div className="v2-inspector-list">
            {source.usage.length === 0 ? <div className="v2-empty-state compact">This source is not cited by an assertion yet.</div> : source.usage.map((usage) => (
              <button type="button" key={`${usage.assertion_id}:${usage.entity_id}`} className="v2-inspector-list-item" onClick={() => onSelect({ kind: 'assertion', id: usage.assertion_id })}>
                <FaFlag /><span><strong>{usage.entity_label || usage.entity_id}</strong><small>{formatLabel(usage.assertion_path)}</small></span>
              </button>
            ))}
          </div>
        </div>
      </aside>
    );
  }

  if (relationship) {
    const sourceNode = graph.nodes.find((node) => node.id === relationship.src_id);
    const targetNode = graph.nodes.find((node) => node.id === relationship.dst_id);
    return (
      <aside className="v2-inspector">
        <div className="v2-inspector-header">
          <div className="v2-inspector-avatar is-relationship"><FaLink /></div>
          <div className="v2-inspector-title"><span>Relationship</span><strong>{formatLabel(relationship.type)}</strong></div>
          <button type="button" className="v2-icon-button" onClick={onClose}><FaTimes /></button>
        </div>
        <div className="v2-inspector-body">
          <button type="button" className="v2-source-card" onClick={() => sourceNode && onSelect({ kind: 'entity', id: sourceNode.id })}>
            <span><small>From</small><strong>{sourceNode ? displayNameForNode(sourceNode) : relationship.src_id}</strong></span>
          </button>
          <button type="button" className="v2-source-card" onClick={() => targetNode && onSelect({ kind: 'entity', id: targetNode.id })}>
            <span><small>To</small><strong>{targetNode ? displayNameForNode(targetNode) : relationship.dst_id}</strong></span>
          </button>
          <div className="v2-property-list">
            {Object.entries(relationship.properties).map(([key, value]) => (
              <div className="v2-property-row" key={key}><span>{formatLabel(key)}</span><strong>{formatValue(value)}</strong></div>
            ))}
          </div>
        </div>
      </aside>
    );
  }

  return <aside className="v2-inspector is-empty"><strong>Selection unavailable</strong><p>The selected item is no longer present in this investigation.</p></aside>;
}
