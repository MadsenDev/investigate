import { create } from 'zustand';
import type { InspectorTab, InvestigationSelection, Vitni2Workspace } from './types';

type Vitni2State = {
  workspace: Vitni2Workspace;
  selection: InvestigationSelection;
  inspectorTab: InspectorTab;
  navigationCollapsed: boolean;
  setWorkspace: (workspace: Vitni2Workspace) => void;
  setSelection: (selection: InvestigationSelection) => void;
  clearSelection: () => void;
  setInspectorTab: (tab: InspectorTab) => void;
  setNavigationCollapsed: (collapsed: boolean) => void;
};

export const useVitni2Store = create<Vitni2State>((set) => ({
  workspace: 'overview',
  selection: null,
  inspectorTab: 'details',
  navigationCollapsed: false,
  setWorkspace: (workspace) => set({ workspace }),
  setSelection: (selection) =>
    set((state) => ({
      selection,
      inspectorTab: selection?.kind === 'entity' ? state.inspectorTab : 'details'
    })),
  clearSelection: () => set({ selection: null, inspectorTab: 'details' }),
  setInspectorTab: (inspectorTab) => set({ inspectorTab }),
  setNavigationCollapsed: (navigationCollapsed) => set({ navigationCollapsed })
}));
