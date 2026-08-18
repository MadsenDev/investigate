import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { TitleBar } from '@renderer/components/TitleBar';
import { ProjectCreationModal } from '@renderer/components/ProjectCreationModal';
import { ImportCsvModal } from '@renderer/components/ImportCsvModal';
import { SplashOverlay } from '@renderer/components/SplashOverlay';
import { WelcomeScreen } from '@renderer/components/WelcomeScreen';
import { ToastViewport } from '@renderer/components/ToastViewport';
import { piBridge, piMenu } from '@renderer/services/piBridge';
import { useAppStore } from '@renderer/store/appStore';
import { OverviewWorkspace } from './workspaces/OverviewWorkspace';
import { EntitiesWorkspace, AssertionsWorkspace, SourcesWorkspace } from './workspaces/CatalogWorkspaces';
import { AttentionWorkspace } from './workspaces/AttentionWorkspace';
import { GraphWorkspaceV2 } from './workspaces/GraphWorkspaceV2';
import { TimelineWorkspaceV2 } from './workspaces/TimelineWorkspaceV2';
import { SearchWorkspace } from './workspaces/SearchWorkspace';
import { EvidenceWorkspace } from './workspaces/EvidenceWorkspace';
import { ReportsWorkspace } from './workspaces/ReportsWorkspace';
import { MigrationWorkspace } from './workspaces/MigrationWorkspace';
import { Navigation } from './components/Navigation';
import { TopBar } from './components/TopBar';
import { Inspector } from './components/Inspector';
import { SettingsBridge } from './components/SettingsBridge';
import { WorkflowBridges } from './components/WorkflowBridges';
import { useInvestigationData } from './hooks/useInvestigationData';
import { useVitni2Store } from './store';
import type { InvestigationSelection, Vitni2Workspace } from './types';
import './v2.css';

const noop = () => undefined;
const screenshotWorkspaces = new Set<Vitni2Workspace>([
  'overview',
  'graph',
  'timeline',
  'entities',
  'assertions',
  'sources',
  'attention',
  'evidence',
  'reports',
  'search'
]);

export function Vitni2App() {
  const legacy = useAppStore();
  const { graph, assertions, sources, attentionItems, recentActivity, loading, error, refresh } = useInvestigationData();
  const workspace = useVitni2Store((state) => state.workspace);
  const selection = useVitni2Store((state) => state.selection);
  const inspectorTab = useVitni2Store((state) => state.inspectorTab);
  const setWorkspace = useVitni2Store((state) => state.setWorkspace);
  const setSelection = useVitni2Store((state) => state.setSelection);
  const clearSelection = useVitni2Store((state) => state.clearSelection);
  const setInspectorTab = useVitni2Store((state) => state.setInspectorTab);
  const [projectCreationOpen, setProjectCreationOpen] = useState(false);
  const [importCsvOpen, setImportCsvOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mediaOpen, setMediaOpen] = useState(false);
  const [sourceOpen, setSourceOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  useEffect(() => {
    void legacy.boot();
  }, [legacy.boot]);

  useEffect(() => {
    const handler = () => void legacy.handleProjectLoaded();
    window.addEventListener('project:loaded', handler);
    return () => window.removeEventListener('project:loaded', handler);
  }, [legacy.handleProjectLoaded]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setWorkspace('search');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [setWorkspace]);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('screenshot') !== '1') return;

    legacy.setShowWelcome(false);

    const handler = (event: Event) => {
      const requested = (event as CustomEvent<{ workspace?: string }>).detail?.workspace;
      if (!requested || !screenshotWorkspaces.has(requested as Vitni2Workspace)) return;
      clearSelection();
      setWorkspace(requested as Vitni2Workspace);
    };

    window.addEventListener('vitni:screenshot-workspace', handler);
    return () => window.removeEventListener('vitni:screenshot-workspace', handler);
  }, [clearSelection, legacy.setShowWelcome, setWorkspace]);

  useEffect(() => {
    if (!selection) {
      legacy.setSelectedNodeId(null);
      legacy.setSelectedNodeIds([]);
      legacy.setSelectedEdgeId(null);
      return;
    }
    if (selection.kind === 'entity' || selection.kind === 'event') {
      legacy.setSelectedNodeId(selection.id);
      legacy.setSelectedNodeIds([selection.id]);
      legacy.setSelectedEdgeId(null);
      return;
    }
    if (selection.kind === 'relationship') {
      legacy.setSelectedNodeId(null);
      legacy.setSelectedNodeIds([]);
      legacy.setSelectedEdgeId(selection.id);
      return;
    }
    if (selection.kind === 'assertion') {
      const assertion = assertions.find((item) => item.id === selection.id);
      if (assertion) {
        legacy.setSelectedNodeId(assertion.subject_id);
        legacy.setSelectedNodeIds([assertion.subject_id]);
        legacy.setSelectedEdgeId(null);
      }
    }
  }, [assertions, legacy, selection]);

  useEffect(() => {
    const offNew = piMenu.onProjectNew(() => setProjectCreationOpen(true));
    const offOpen = piMenu.onProjectOpen(() => void legacy.openProject());
    const offSaveAs = piMenu.onProjectSaveAs(() => void piBridge.projectSaveAs());
    const offSettings = piMenu.onSettingsOpen(() => setSettingsOpen(true));
    const offMedia = piMenu.onMediaGalleryOpen(() => {
      setWorkspace('evidence');
      setMediaOpen(true);
    });
    const offProjectInfo = piMenu.onProjectInfoOpen(() => setWorkspace('profiles'));
    const offExport = piMenu.onExportReportOpen(() => {
      setWorkspace('reports');
      setReportOpen(true);
    });
    return () => { offNew?.(); offOpen?.(); offSaveAs?.(); offSettings?.(); offMedia?.(); offProjectInfo?.(); offExport?.(); };
  }, [legacy.openProject, setWorkspace]);

  const caseNode = useMemo(() => graph.nodes.find((node) => node.type === 'case') || null, [graph.nodes]);
  const caseName = caseNode?.label || 'Active Investigation';
  const caseId = typeof caseNode?.properties.caseId === 'string'
    ? caseNode.properties.caseId
    : typeof caseNode?.properties.case_id === 'string'
      ? caseNode.properties.case_id
      : null;

  const switchToLegacy = () => {
    window.localStorage.setItem('vitni.ui', 'legacy');
    const url = new URL(window.location.href);
    url.searchParams.delete('ui');
    window.location.href = url.toString();
  };

  const handleSelect = (nextSelection: InvestigationSelection) => {
    setSelection(nextSelection);
  };

  const titleBarProps = {
    context: (legacy.isLocalAILoading || !legacy.graphLoaded || !legacy.splashReadyToHide ? 'booting' : legacy.showWelcome ? 'welcome' : 'main') as 'welcome' | 'booting' | 'main',
    onProjectNew: () => setProjectCreationOpen(true),
    onProjectOpen: () => void legacy.openProject(),
    onProjectImportCsv: () => setImportCsvOpen(true),
    onProjectClose: legacy.closeProject,
    onProjectSaveAs: () => void piBridge.projectSaveAs(),
    onExportReport: () => {
      setWorkspace('reports');
      setReportOpen(true);
    },
    onSettingsOpen: () => setSettingsOpen(true),
    onProjectInfo: () => setWorkspace('profiles'),
    onTerminology: () => setWorkspace('profiles'),
    onMediaGallery: () => {
      setWorkspace('evidence');
      setMediaOpen(true);
    },
    onViewZoomSelection: noop,
    onViewFit: noop,
    onViewCenterSelection: noop,
    onViewRunLayoutPreset: noop,
    onViewShowGraph: () => setWorkspace('graph'),
    onViewShowTimeline: () => setWorkspace('timeline'),
    onViewShowReview: () => setWorkspace('attention'),
    onViewToggleFilters: noop,
    onToolsToggleRelationshipMode: noop,
    onToolsToggleBoxSelect: noop,
    onToolsAlignLeft: noop,
    onToolsAlignTop: noop,
    onToolsInvertSelection: noop,
    savedViews: legacy.savedViews,
    activeSavedViewId: legacy.activeSavedViewId,
    onApplySavedView: legacy.applySavedView
  };

  const isBooting = legacy.isLocalAILoading || !legacy.graphLoaded || !legacy.splashReadyToHide;

  if (isBooting) {
    return (
      <div className="relative flex h-full flex-col overflow-hidden">
        <TitleBar {...titleBarProps} />
        <div className="flex-1 overflow-hidden pt-9"><SplashOverlay showing loadingStage={legacy.loadingStage} /></div>
      </div>
    );
  }

  if (legacy.showWelcome) {
    return (
      <div className="relative flex h-full flex-col overflow-hidden">
        <TitleBar {...titleBarProps} />
        <ProjectCreationModal
          isOpen={projectCreationOpen}
          onClose={() => setProjectCreationOpen(false)}
          onCreate={(name) => { setProjectCreationOpen(false); void legacy.createProject(name); }}
        />
        <div className="flex-1 overflow-hidden pt-9">
          <WelcomeScreen
            onProjectCreate={() => setProjectCreationOpen(true)}
            onProjectLoad={() => void legacy.openProject()}
            investigationProfile={legacy.investigationProfile}
            onInvestigationProfileChange={(value) => void legacy.persistInvestigationProfile(value)}
            showExampleCase={legacy.showExampleCaseOnWelcome}
            onStartTutorial={() => undefined}
          />
        </div>
      </div>
    );
  }

  let content: ReactNode;
  switch (workspace) {
    case 'overview':
      content = <OverviewWorkspace graph={graph} assertions={assertions} sources={sources} attentionItems={attentionItems} recentActivity={recentActivity} onSelect={handleSelect} onNavigate={setWorkspace} />;
      break;
    case 'graph':
      content = <GraphWorkspaceV2 graph={graph} assertions={assertions} selection={selection} personalizationTheme={legacy.personalizationTheme} onSelect={handleSelect} />;
      break;
    case 'timeline':
      content = <TimelineWorkspaceV2 graph={graph} assertions={assertions} selection={selection} onSelect={handleSelect} />;
      break;
    case 'entities':
      content = <EntitiesWorkspace graph={graph} attentionItems={attentionItems} onSelect={handleSelect} />;
      break;
    case 'assertions':
      content = <AssertionsWorkspace graph={graph} assertions={assertions} attentionItems={attentionItems} onSelect={handleSelect} />;
      break;
    case 'sources':
      content = <SourcesWorkspace sources={sources} onSelect={handleSelect} />;
      break;
    case 'attention':
      content = <AttentionWorkspace items={attentionItems} assertions={assertions} sources={sources} onSelect={handleSelect} onNavigate={setWorkspace} onRefresh={refresh} />;
      break;
    case 'search':
      content = <SearchWorkspace graph={graph} assertions={assertions} sources={sources} onSelect={handleSelect} />;
      break;
    case 'evidence':
      content = <EvidenceWorkspace graph={graph} sources={sources} selection={selection} onSelect={handleSelect} onOpenMedia={() => setMediaOpen(true)} onImportCsv={() => setImportCsvOpen(true)} onAttachSource={() => setSourceOpen(true)} />;
      break;
    case 'reports':
      content = <ReportsWorkspace graph={graph} assertions={assertions} sources={sources} attentionItems={attentionItems} onGenerate={() => setReportOpen(true)} />;
      break;
    default:
      content = <MigrationWorkspace workspace={workspace} onOverview={() => setWorkspace('overview')} onLegacy={switchToLegacy} />;
      break;
  }

  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      <TitleBar {...titleBarProps} />
      <ProjectCreationModal isOpen={projectCreationOpen} onClose={() => setProjectCreationOpen(false)} onCreate={(name) => { setProjectCreationOpen(false); void legacy.createProject(name); }} />
      <ImportCsvModal isOpen={importCsvOpen} graph={graph} assertions={assertions} onClose={() => setImportCsvOpen(false)} onImported={async () => { await Promise.all([legacy.refreshGraph(), refresh()]); }} />
      <SettingsBridge open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <WorkflowBridges
        graph={graph}
        selection={selection}
        mediaOpen={mediaOpen}
        sourceOpen={sourceOpen}
        reportOpen={reportOpen}
        onMediaClose={() => setMediaOpen(false)}
        onSourceClose={() => setSourceOpen(false)}
        onReportClose={() => setReportOpen(false)}
        onRefresh={refresh}
      />
      <ToastViewport />
      <div className="v2-app pt-9">
        <Navigation workspace={workspace} attentionCount={attentionItems.length} caseName={caseName} caseId={caseId} localAIEnabled={legacy.localAIEnabled} onNavigate={setWorkspace} />
        <div className="v2-main-column">
          <TopBar caseName={caseName} onSearch={() => setWorkspace('search')} onSettings={() => setSettingsOpen(true)} />
          {error ? <div className="v2-data-error">Some investigation data could not be loaded: {error}</div> : null}
          {loading ? <div className="v2-data-loading">Refreshing investigation data…</div> : null}
          <main className="v2-content" data-v2-workspace={workspace}>{content}</main>
        </div>
        <Inspector selection={selection} graph={graph} assertions={assertions} sources={sources} attentionItems={attentionItems} tab={inspectorTab} onTabChange={setInspectorTab} onClose={clearSelection} onSelect={handleSelect} />
        <button type="button" className="v2-legacy-switch" onClick={switchToLegacy}>Legacy UI</button>
      </div>
    </div>
  );
}
