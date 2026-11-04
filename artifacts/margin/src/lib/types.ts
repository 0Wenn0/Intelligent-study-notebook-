export const KINDS = ['Concept', 'Terminology', 'System', 'Process', 'How-to', 'Question'] as const;
export type Kind = (typeof KINDS)[number];
export type ItemStatus = 'pending' | 'approved' | 'discarded';
export type Understanding = 'new' | 'learning' | 'confident';
export type SourceOrigin = 'demo' | 'user';
export const PRIORITIES = ['recall', 'howto', 'exam', 'meeting'] as const;
export type Priority = (typeof PRIORITIES)[number];
export type Confidence = 1 | 2 | 3 | 4;

export interface Page {
  page: number;
  text: string;
}

export interface Source {
  id: string;
  title: string;
  topic: string;
  pages: Page[];
  createdAt: string;
  origin: SourceOrigin;
  fileName?: string;
  studyGoal?: string;
  priorities?: Priority[];
}

export interface Excerpt {
  sourceId: string;
  page: number;
  text: string;
}

export interface Item {
  id: string;
  title: string;
  kind: Kind;
  body: string;
  excerpts: Excerpt[];
  tags: string[];
  status: ItemStatus;
  understanding: Understanding;
  createdAt: string;
  /** body was produced by on-device prompt generation, not the source */
  generated?: boolean;
  /** user edited title/body/kind/tags */
  edited?: boolean;
  /** record belongs to the bundled demo notebook */
  demo?: boolean;
  /** approved by the bundled demo, not by the user */
  demoApproved?: boolean;
  mergedFrom?: string[];
  generatedLabel?: boolean;
  reviewChecks?: { accurate: boolean; worthwhile: boolean };
  dueAt?: string;
  intervalDays?: number;
}

export type SessionMode = 'flashcards' | 'quiz' | 'focus';

export interface Session {
  id: string;
  date: string;
  mode: SessionMode;
  reviewed: number;
  correct: number;
  seconds: number;
}

export type RatingValue = 'again' | 'learning' | 'confident';

export interface Rating {
  id: string;
  itemId: string;
  date: string;
  value: RatingValue;
  confidence?: Confidence;
}

export interface Attempt {
  id: string;
  itemId: string;
  date: string;
  confidence: Confidence;
  correct: boolean;
  mode: 'flashcards' | 'quiz';
}

export interface WarningEvent {
  id: string;
  itemId: string;
  signature: string;
  date: string;
}

export interface NotebookData {
  version: 1;
  sources: Source[];
  items: Item[];
  sessions: Session[];
  ratings: Rating[];
  attempts: Attempt[];
  warningEvents: WarningEvent[];
  prefs: { privacySeen: boolean; welcomeSeen?: boolean };
}

export const uid = (p = 'id') =>
  `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
