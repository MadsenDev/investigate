import { useEffect, useMemo, useState } from 'react';
import { FaBookmark, FaTimes } from 'react-icons/fa';
import { piBridge } from '@renderer/services/piBridge';

export type PerspectiveWorkspace = 'graph' | 'timeline';
export type PerspectiveState = Record<string, string | number | boolean>;

type SavedPerspective = {
  id: string;
  name: string;
  workspace: PerspectiveWorkspace;
  state: PerspectiveState;
  createdAt: number;
};

type PerspectiveControlsProps = {
  workspace: PerspectiveWorkspace;
  state: PerspectiveState;
  onApply: (state: PerspectiveState) => void;
};

const SETTING_KEY = 'vitni2.savedPerspectives';

function isPerspective(value: unknown): value is SavedPerspective {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<SavedPerspective>;
  return typeof candidate.id === 'string'
    && typeof candidate.name === 'string'
    && (candidate.workspace === 'graph' || candidate.workspace === 'timeline')
    && Boolean(candidate.state && typeof candidate.state === 'object')
    && typeof candidate.createdAt === 'number';
}

export function PerspectiveControls({ workspace, state, onApply }: PerspectiveControlsProps) {
  const [all, setAll] = useState<SavedPerspective[]>([]);
  const [name, setName] = useState('');
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void piBridge.getProjectSetting<unknown>(SETTING_KEY).then((stored) => {
      if (cancelled) return;
      setAll(Array.isArray(stored) ? stored.filter(isPerspective) : []);
    });
    return () => { cancelled = true; };
  }, []);

  const visible = useMemo(
    () => all.filter((item) => item.workspace === workspace).sort((a, b) => b.createdAt - a.createdAt),
    [all, workspace]
  );

  const persist = async (next: SavedPerspective[]) => {
    setAll(next);
    await piBridge.setProjectSetting(SETTING_KEY, next);
  };

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const next: SavedPerspective[] = [
      ...all,
      {
        id: globalThis.crypto?.randomUUID?.() ?? `${workspace}-${Date.now()}`,
        name: trimmed,
        workspace,
        state,
        createdAt: Date.now()
      }
    ];
    await persist(next);
    setName('');
    setEditing(false);
  };

  const remove = async (id: string) => {
    await persist(all.filter((item) => item.id !== id));
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {visible.length > 0 ? (
        <select
          className="v2-layout-select"
          defaultValue=""
          aria-label={`Saved ${workspace} perspectives`}
          onChange={(event) => {
            const match = visible.find((item) => item.id === event.target.value);
            if (match) onApply(match.state);
            event.target.value = '';
          }}
        >
          <option value="">Saved perspectives…</option>
          {visible.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      ) : null}
      {editing ? (
        <>
          <input
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void save();
              if (event.key === 'Escape') { setEditing(false); setName(''); }
            }}
            className="w-40 rounded-lg border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-100 outline-none focus:border-sky-700"
            placeholder="Perspective name"
          />
          <button type="button" className="v2-toggle-button is-active" disabled={!name.trim()} onClick={() => void save()}><FaBookmark /> Save</button>
          <button type="button" className="v2-icon-button" onClick={() => { setEditing(false); setName(''); }} title="Cancel"><FaTimes /></button>
        </>
      ) : (
        <button type="button" className="v2-toggle-button" onClick={() => setEditing(true)}><FaBookmark /> Save perspective</button>
      )}
      {visible.length > 0 ? (
        <details className="relative">
          <summary className="cursor-pointer list-none text-xs text-slate-500 hover:text-slate-300">Manage</summary>
          <div className="absolute right-0 z-20 mt-2 min-w-52 rounded-xl border border-slate-800 bg-slate-950 p-2 shadow-xl">
            {visible.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-xs text-slate-300 hover:bg-slate-900">
                <button type="button" className="min-w-0 flex-1 truncate text-left" onClick={() => onApply(item.state)}>{item.name}</button>
                <button type="button" className="text-slate-600 hover:text-red-300" onClick={() => void remove(item.id)} title="Delete perspective"><FaTimes /></button>
              </div>
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}
