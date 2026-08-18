import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SourceWithUsage } from '@shared/types';
import { piBridge, type ParsedAssertionRecord } from '@renderer/services/piBridge';
import { useAppStore } from '@renderer/store/appStore';
import { buildRecentActivity } from '../features/activity/model';
import { buildAttentionItems } from '../features/attention/model';

export function useInvestigationData() {
  const graph = useAppStore((state) => state.graph);
  const graphLoaded = useAppStore((state) => state.graphLoaded);
  const [assertions, setAssertions] = useState<ParsedAssertionRecord[]>([]);
  const [sources, setSources] = useState<SourceWithUsage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!graphLoaded) return;
    setLoading(true);
    try {
      const [nextAssertions, nextSources] = await Promise.all([
        piBridge.listAllAssertions(),
        piBridge.listAllSourcesWithUsage()
      ]);
      setAssertions(nextAssertions);
      setSources(nextSources);
      setError(null);
    } catch (cause) {
      console.error('Failed to load Vitni 2 investigation data:', cause);
      setError(cause instanceof Error ? cause.message : 'Unable to load investigation data');
    } finally {
      setLoading(false);
    }
  }, [graphLoaded]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const handleRefresh = () => void refresh();
    window.addEventListener('pi:refresh', handleRefresh);
    return () => window.removeEventListener('pi:refresh', handleRefresh);
  }, [refresh]);

  const attentionItems = useMemo(
    () => buildAttentionItems(assertions, sources, graph),
    [assertions, graph, sources]
  );
  const recentActivity = useMemo(
    () => buildRecentActivity(graph, assertions, sources),
    [assertions, graph, sources]
  );

  return {
    graph,
    assertions,
    sources,
    attentionItems,
    recentActivity,
    loading,
    error,
    refresh
  };
}
