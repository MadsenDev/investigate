import type { IconType } from 'react-icons';
import {
  FaBrain,
  FaClock,
  FaDatabase,
  FaFileAlt,
  FaFileExport,
  FaFlag,
  FaFolderOpen,
  FaProjectDiagram,
  FaRegListAlt,
  FaSearch,
  FaShapes,
  FaSlidersH,
  FaStream,
  FaUserFriends,
  FaVial
} from 'react-icons/fa';
import type { Vitni2Workspace } from '../types';

export type NavigationItem = {
  id: Vitni2Workspace;
  label: string;
  icon: IconType;
  badge?: number;
};

type NavigationProps = {
  workspace: Vitni2Workspace;
  attentionCount: number;
  caseName: string;
  caseId?: string | null;
  localAIEnabled: boolean;
  onNavigate: (workspace: Vitni2Workspace) => void;
};

const workspaceItems: NavigationItem[] = [
  { id: 'overview', label: 'Overview', icon: FaShapes },
  { id: 'graph', label: 'Graph', icon: FaProjectDiagram },
  { id: 'timeline', label: 'Timeline', icon: FaClock },
  { id: 'entities', label: 'Entities', icon: FaUserFriends },
  { id: 'assertions', label: 'Assertions', icon: FaRegListAlt },
  { id: 'sources', label: 'Sources', icon: FaDatabase },
  { id: 'attention', label: 'Needs Attention', icon: FaFlag },
  { id: 'transforms', label: 'Transforms', icon: FaVial },
  { id: 'search', label: 'Saved Views & Search', icon: FaSearch }
];

const caseItems: NavigationItem[] = [
  { id: 'evidence', label: 'Evidence', icon: FaFolderOpen },
  { id: 'reports', label: 'Reports', icon: FaFileAlt },
  { id: 'exports', label: 'Exports', icon: FaFileExport },
  { id: 'profiles', label: 'Investigation Profiles', icon: FaSlidersH }
];

function NavSection({
  title,
  items,
  active,
  attentionCount,
  onNavigate
}: {
  title: string;
  items: NavigationItem[];
  active: Vitni2Workspace;
  attentionCount: number;
  onNavigate: (workspace: Vitni2Workspace) => void;
}) {
  return (
    <section className="v2-nav-section">
      <div className="v2-nav-section-title">{title}</div>
      <div className="v2-nav-items">
        {items.map((item) => {
          const Icon = item.icon;
          const badge = item.id === 'attention' ? attentionCount : item.badge;
          return (
            <button
              type="button"
              key={item.id}
              className={`v2-nav-item${active === item.id ? ' is-active' : ''}`}
              onClick={() => onNavigate(item.id)}
            >
              <Icon aria-hidden="true" />
              <span>{item.label}</span>
              {badge ? <span className="v2-nav-badge">{badge}</span> : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function Navigation({
  workspace,
  attentionCount,
  caseName,
  caseId,
  localAIEnabled,
  onNavigate
}: NavigationProps) {
  return (
    <aside className="v2-navigation">
      <div className="v2-brand">
        <div className="v2-brand-mark">V</div>
        <div>
          <strong>Vitni</strong>
          <span>Investigation workspace</span>
        </div>
      </div>

      <NavSection
        title="Workspace"
        items={workspaceItems}
        active={workspace}
        attentionCount={attentionCount}
        onNavigate={onNavigate}
      />
      <NavSection
        title="Case management"
        items={caseItems}
        active={workspace}
        attentionCount={attentionCount}
        onNavigate={onNavigate}
      />

      <section className="v2-nav-section">
        <div className="v2-nav-section-title">Tools</div>
        <button type="button" className={`v2-nav-item${workspace === 'ai' ? ' is-active' : ''}`} onClick={() => onNavigate('ai')}>
          <FaBrain aria-hidden="true" />
          <span>AI Assistant</span>
          {localAIEnabled ? <span className="v2-status-dot is-ready" title="Local AI ready" /> : null}
        </button>
      </section>

      <div className="v2-case-card">
        <FaStream aria-hidden="true" />
        <div>
          <strong>{caseName}</strong>
          <span>{caseId || 'Active investigation'}</span>
        </div>
      </div>
    </aside>
  );
}
