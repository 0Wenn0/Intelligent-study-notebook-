import demoJson from '@/data/source.json';
import { extractCandidates } from './extract';
import type { NotebookData, Source } from './types';

export const DEMO_SOURCE_ID = 'demo-source';

/** All demo candidates require the same explicit user approval as imported material. */
export function buildDemoNotebook(): NotebookData {
  const raw = demoJson as { title: string; pages: { page: number; text: string }[] };
  const source: Source = {
    id: DEMO_SOURCE_ID,
    title: raw.title,
    topic: 'Learning environments',
    pages: raw.pages.map((p) => ({ page: Number(p.page), text: String(p.text) })),
    createdAt: new Date().toISOString(),
    origin: 'demo',
    studyGoal: 'Designing AI-supported learning environments for university teachers',
    priorities: ['recall', 'howto'],
  };
  const items = extractCandidates(source.id, source.pages, 'demo', { demo: true });
  return { version: 1, sources: [source], items, sessions: [], ratings: [], attempts: [], warningEvents: [], prefs: { privacySeen: false } };
}
