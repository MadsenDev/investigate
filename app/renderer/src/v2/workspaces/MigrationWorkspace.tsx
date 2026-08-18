import { FaArrowLeft, FaTools } from 'react-icons/fa';
import type { Vitni2Workspace } from '../types';

const copy: Partial<Record<Vitni2Workspace, { title: string; description: string }>> = {
  evidence: { title: 'Evidence intake', description: 'This will unify attachments, media, CSV import and extraction review into one provenance-first intake flow.' },
  reports: { title: 'Reports and findings', description: 'The Vitni 2 report workflow will build reviewed, source-traceable findings before optional AI prose.' },
  exports: { title: 'Exports', description: 'Portable case and report outputs will move here after the report/evidence model is migrated.' },
  profiles: { title: 'Investigation profiles', description: 'Existing profile settings are preserved. Their new dedicated workspace is scheduled after the core investigation flow.' },
  transforms: { title: 'Transforms', description: 'Transforms remain available in legacy Vitni while their results are redesigned to enter the evidence/assertion workflow cleanly.' },
  ai: { title: 'AI Assistant', description: 'AI will return as an evidence-aware assistant for extraction, contradiction checks, summaries and report assistance, not an oracle panel.' },
  search: { title: 'Search and saved perspectives', description: 'Search and saved views will be rebuilt around the shared Vitni 2 selection model.' }
};

export function MigrationWorkspace({ workspace, onOverview, onLegacy }: { workspace: Vitni2Workspace; onOverview: () => void; onLegacy: () => void }) {
  const item = copy[workspace] || { title: 'Vitni 2 workspace', description: 'This workflow is still being migrated.' };
  return (
    <div className="v2-workspace v2-migration-workspace">
      <div className="v2-migration-card">
        <span className="v2-migration-icon"><FaTools /></span>
        <span className="v2-eyebrow">Vitni 2 migration</span>
        <h1>{item.title}</h1>
        <p>{item.description}</p>
        <div className="v2-migration-actions">
          <button type="button" className="v2-primary-button" onClick={onOverview}><FaArrowLeft /> Back to Overview</button>
          <button type="button" className="v2-secondary-button" onClick={onLegacy}>Open legacy UI for this workflow</button>
        </div>
      </div>
    </div>
  );
}
