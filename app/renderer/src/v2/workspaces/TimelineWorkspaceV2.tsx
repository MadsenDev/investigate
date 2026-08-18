import { useMemo, useState } from 'react';
import { FaCalendarAlt, FaSearch } from 'react-icons/fa';
import type { GraphSnapshot } from '@renderer/types/graph';
import { displayNameForNode } from '@renderer/features/graph/labeling';
import type { InvestigationSelection } from '../types';

function eventDate(properties: Record<string, unknown>, fallback: number): { value: number; label: string } {
  for (const key of ['date', 'eventDate', 'event_date', 'occurredAt', 'occurred_at', 'startDate', 'start_date']) {
    const candidate = properties[key];
    if (typeof candidate === 'number' && Number.isFinite(candidate)) {
      return { value: candidate, label: new Date(candidate).toLocaleDateString() };
    }
    if (typeof candidate === 'string' && candidate.trim()) {
      const parsed = Date.parse(candidate);
      if (Number.isFinite(parsed)) return { value: parsed, label: candidate };
    }
  }
  return { value: fallback, label: new Date(fallback).toLocaleDateString() };
}

export function TimelineWorkspaceV2({ graph, selection, onSelect }: { graph: GraphSnapshot; selection: InvestigationSelection; onSelect: (selection: InvestigationSelection) => void }) {
  const [query, setQuery] = useState('');
  const [type, setType] = useState<'all' | 'event' | 'incident'>('all');
  const events = useMemo(() => graph.nodes
    .filter((node) => node.type === 'event' || node.type === 'incident')
    .map((node) => ({ node, date: eventDate(node.properties, node.created_at) }))
    .filter(({ node }) => type === 'all' || node.type === type)
    .filter(({ node }) => `${displayNameForNode(node)} ${Object.values(node.properties).join(' ')}`.toLowerCase().includes(query.toLowerCase()))
    .sort((left, right) => left.date.value - right.date.value), [graph.nodes, query, type]);

  const years = new Map<number, typeof events>();
  events.forEach((item) => {
    const year = new Date(item.date.value).getFullYear();
    const list = years.get(year) || [];
    list.push(item);
    years.set(year, list);
  });

  return (
    <div className="v2-workspace">
      <div className="v2-workspace-heading"><div><span className="v2-eyebrow">Timeline</span><h1>Chronology is another view of the same case</h1><p>Selecting an event keeps its entity context in the same Inspector used by Graph and Overview.</p></div></div>
      <div className="v2-toolbar"><label className="v2-filter-search"><FaSearch /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search events…" /></label><select value={type} onChange={(event) => setType(event.target.value as typeof type)}><option value="all">All event types</option><option value="event">Events</option><option value="incident">Incidents</option></select><span className="v2-result-count">{events.length} events</span></div>
      <section className="v2-panel v2-timeline-workspace">
        {events.length === 0 ? <div className="v2-empty-state">No event or incident entities match this view.</div> : Array.from(years.entries()).map(([year, items]) => (
          <div className="v2-timeline-year" key={year}>
            <div className="v2-timeline-year-label">{year}</div>
            <div className="v2-timeline-track">
              {items.map(({ node, date }) => {
                const active = selection?.id === node.id && (selection.kind === 'event' || selection.kind === 'entity');
                return (
                  <button type="button" key={node.id} className={`v2-timeline-event${active ? ' is-active' : ''}${node.type === 'incident' ? ' is-incident' : ''}`} onClick={() => onSelect({ kind: 'event', id: node.id })}>
                    <span className="v2-timeline-event-icon"><FaCalendarAlt /></span>
                    <span><small>{date.label}</small><strong>{displayNameForNode(node)}</strong><em>{node.type}</em></span>
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
