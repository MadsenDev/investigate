import { useMemo, useState } from 'react';
import { FaBullseye, FaCalendarAlt, FaSearch } from 'react-icons/fa';
import type { ParsedAssertionRecord } from '@renderer/services/piBridge';
import type { GraphSnapshot } from '@renderer/types/graph';
import { displayNameForNode } from '@renderer/features/graph/labeling';
import { deriveInvestigationContext } from '../features/context/investigationContext';
import type { InvestigationSelection } from '../types';

function toMilliseconds(value: number): number {
  return value < 10_000_000_000 ? value * 1000 : value;
}

function eventDate(properties: Record<string, unknown>, fallback: number): { value: number; label: string } {
  for (const key of ['date', 'eventDate', 'event_date', 'occurredAt', 'occurred_at', 'startDate', 'start_date']) {
    const candidate = properties[key];
    if (typeof candidate === 'number' && Number.isFinite(candidate)) {
      const normalized = toMilliseconds(candidate);
      return { value: normalized, label: new Date(normalized).toLocaleDateString() };
    }
    if (typeof candidate === 'string' && candidate.trim()) {
      const parsed = Date.parse(candidate);
      if (Number.isFinite(parsed)) return { value: parsed, label: candidate };
    }
  }
  const normalizedFallback = toMilliseconds(fallback);
  return { value: normalizedFallback, label: new Date(normalizedFallback).toLocaleDateString() };
}

type TimelineWorkspaceV2Props = {
  graph: GraphSnapshot;
  assertions: ParsedAssertionRecord[];
  selection: InvestigationSelection;
  onSelect: (selection: InvestigationSelection) => void;
};

export function TimelineWorkspaceV2({ graph, assertions, selection, onSelect }: TimelineWorkspaceV2Props) {
  const [query, setQuery] = useState('');
  const [type, setType] = useState<'all' | 'event' | 'incident'>('all');
  const [contextOnly, setContextOnly] = useState(true);
  const [depth, setDepth] = useState<1 | 2>(1);
  const context = useMemo(
    () => deriveInvestigationContext(selection, graph, assertions, depth),
    [assertions, depth, graph, selection]
  );
  const hasContextEvents = useMemo(
    () => graph.nodes.some((node) => (node.type === 'event' || node.type === 'incident') && context.relatedEntityIds.has(node.id)),
    [context.relatedEntityIds, graph.nodes]
  );

  const events = useMemo(() => graph.nodes
    .filter((node) => node.type === 'event' || node.type === 'incident')
    .map((node) => ({ node, date: eventDate(node.properties, node.created_at) }))
    .filter(({ node }) => type === 'all' || node.type === type)
    .filter(({ node }) => !contextOnly || !selection || !hasContextEvents || context.relatedEntityIds.has(node.id))
    .filter(({ node }) => `${displayNameForNode(node)} ${Object.values(node.properties).join(' ')}`.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((left, right) => left.date.value - right.date.value), [context.relatedEntityIds, contextOnly, graph.nodes, hasContextEvents, query, selection, type]);

  const years = useMemo(() => {
    const groups = new Map<number, typeof events>();
    events.forEach((item) => {
      const year = new Date(item.date.value).getFullYear();
      const list = groups.get(year) || [];
      list.push(item);
      groups.set(year, list);
    });
    return groups;
  }, [events]);

  const contextDescription = !selection
    ? null
    : context.reason === 'source'
      ? `${context.anchorEntityIds.length} entities supported by this source`
      : context.reason === 'assertion'
        ? 'events around this assertion subject'
        : context.reason === 'relationship'
          ? 'events around both relationship endpoints'
          : `events within ${depth} hop${depth === 1 ? '' : 's'} of the selection`;

  return (
    <div className="v2-workspace">
      <div className="v2-workspace-heading"><div><span className="v2-eyebrow">Timeline</span><h1>Chronology is another view of the same case</h1><p>Evidence, claims and graph selections can now narrow the chronology to the events around the current investigative context.</p></div></div>
      <div className="v2-toolbar">
        <label className="v2-filter-search"><FaSearch /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search events…" /></label>
        <select value={type} onChange={(event) => setType(event.target.value as typeof type)}><option value="all">All event types</option><option value="event">Events</option><option value="incident">Incidents</option></select>
        <button type="button" className={`v2-toggle-button${contextOnly ? ' is-active' : ''}`} disabled={!selection || !hasContextEvents} onClick={() => setContextOnly((value) => !value)}><FaBullseye /> Selection context</button>
        <select value={depth} disabled={!selection || !contextOnly} onChange={(event) => setDepth(Number(event.target.value) as 1 | 2)}><option value={1}>1 hop</option><option value={2}>2 hops</option></select>
        <span className="v2-result-count">{events.length} events</span>
      </div>
      {contextDescription ? (
        <div className="px-1 pb-3 text-xs text-slate-500">
          Context: <span className="text-slate-300">{contextDescription}</span>
          {contextOnly && !hasContextEvents ? ' · no directly related event entities, so full chronology remains visible' : ''}
        </div>
      ) : null}
      <section className="v2-panel v2-timeline-workspace">
        {events.length === 0 ? <div className="v2-empty-state">No event or incident entities match this chronology and context.</div> : Array.from(years.entries()).map(([year, items]) => (
          <div className="v2-timeline-year" key={year}>
            <div className="v2-timeline-year-label">{year}</div>
            <div className="v2-timeline-track">
              {items.map(({ node, date }) => {
                const active = selection?.id === node.id && (selection.kind === 'event' || selection.kind === 'entity');
                const anchor = context.anchorEntityIds.includes(node.id);
                return (
                  <button type="button" key={node.id} className={`v2-timeline-event${active ? ' is-active' : ''}${node.type === 'incident' ? ' is-incident' : ''}`} onClick={() => onSelect({ kind: 'event', id: node.id })}>
                    <span className="v2-timeline-event-icon"><FaCalendarAlt /></span>
                    <span><small>{date.label}</small><strong>{displayNameForNode(node)}</strong><em>{anchor ? 'selected context' : node.type}</em></span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
