import { useMemo, useState } from 'react';
import { FaDatabase, FaFlag, FaLink, FaSearch, FaUserFriends } from 'react-icons/fa';
import type { SourceWithUsage } from '@shared/types';
import type { ParsedAssertionRecord } from '@renderer/services/piBridge';
import { buildSearchResults, filterSearchResults, searchGroupLabel } from '@renderer/features/search/searchIndex';
import type { GraphSnapshot } from '@renderer/types/graph';
import type { SearchResult } from '@renderer/types/app';
import type { InvestigationSelection } from '../types';
import './search.css';

type SearchWorkspaceProps = {
  graph: GraphSnapshot;
  assertions: ParsedAssertionRecord[];
  sources: SourceWithUsage[];
  onSelect: (selection: InvestigationSelection) => void;
};

function iconForResult(result: SearchResult) {
  if (result.kind === 'node') return <FaUserFriends />;
  if (result.kind === 'relationship') return <FaLink />;
  if (result.kind === 'assertion') return <FaFlag />;
  return <FaDatabase />;
}

export function SearchWorkspace({ graph, assertions, sources, onSelect }: SearchWorkspaceProps) {
  const [query, setQuery] = useState('');
  const allResults = useMemo(() => buildSearchResults({ graph, assertions, sources }), [assertions, graph, sources]);
  const results = useMemo(() => filterSearchResults(allResults, query), [allResults, query]);
  const grouped = useMemo(() => {
    const map = new Map<SearchResult['kind'], SearchResult[]>();
    results.forEach((result) => map.set(result.kind, [...(map.get(result.kind) || []), result]));
    return Array.from(map.entries());
  }, [results]);

  const choose = (result: SearchResult) => {
    if (result.kind === 'node' && result.nodeId) onSelect({ kind: 'entity', id: result.nodeId });
    if (result.kind === 'relationship' && result.edgeId) onSelect({ kind: 'relationship', id: result.edgeId });
    if (result.kind === 'assertion' && result.assertionId) onSelect({ kind: 'assertion', id: result.assertionId });
    if (result.kind === 'source' && result.sourceId) onSelect({ kind: 'source', id: result.sourceId });
  };

  return (
    <div className="v2-workspace v2-search-workspace">
      <div className="v2-workspace-heading">
        <div><span className="v2-eyebrow">Search</span><h1>Find anything, keep the same context</h1><p>Entities, relationships, assertions and sources all land in the shared Inspector instead of opening unrelated search result screens.</p></div>
      </div>
      <label className="v2-search-hero">
        <FaSearch />
        <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search names, fields, evidence, IDs, relationship types…" />
        <kbd>Ctrl K</kbd>
      </label>
      <div className="v2-search-groups">
        {grouped.map(([kind, items]) => (
          <section className="v2-panel" key={kind}>
            <div className="v2-panel-heading"><div><span>{searchGroupLabel(kind)}</span><small>{items.length} visible result{items.length === 1 ? '' : 's'}</small></div></div>
            <div className="v2-search-results">
              {items.map((result) => (
                <button type="button" key={result.id} className="v2-search-result" onClick={() => choose(result)}>
                  <span className={`v2-search-result-icon is-${result.kind}`}>{iconForResult(result)}</span>
                  <span><strong>{result.title}</strong><small>{result.subtitle}</small>{result.metadata ? <em>{result.metadata}</em> : null}</span>
                </button>
              ))}
            </div>
          </section>
        ))}
        {results.length === 0 ? <div className="v2-panel v2-empty-state">No investigation data matches “{query}”.</div> : null}
      </div>
    </div>
  );
}
