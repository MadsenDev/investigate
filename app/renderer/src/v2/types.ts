export type Vitni2Workspace =
  | 'overview'
  | 'graph'
  | 'timeline'
  | 'entities'
  | 'assertions'
  | 'sources'
  | 'attention'
  | 'evidence'
  | 'reports'
  | 'exports'
  | 'profiles'
  | 'transforms'
  | 'ai'
  | 'search';

export type InvestigationSelection =
  | { kind: 'entity'; id: string }
  | { kind: 'relationship'; id: string }
  | { kind: 'assertion'; id: string }
  | { kind: 'source'; id: string }
  | { kind: 'event'; id: string }
  | null;

export type InspectorTab = 'details' | 'relationships' | 'assertions' | 'sources';

export type AttentionReason = 'unsupported' | 'disputed' | 'unreviewed' | 'unverified';

export type AttentionSeverity = 'high' | 'medium' | 'low';
