import demoEn from '@/data/source.json';
import demoEs from '@/data/source.es.json';
import { getLanguage, translate, type Language } from '@/i18n';
import { extractCandidates } from './extract';
import type { NotebookData, Source } from './types';

export const DEMO_SOURCE_ID = 'demo-source';
type DemoJson = { title: string; pages: { page: number; text: string }[] };
const DEMOS: Record<Language, DemoJson> = { en: demoEn as DemoJson, es: demoEs as DemoJson };

/** The example document follows the interface language. All demo candidates start pending. */
export function buildDemoNotebook(language: Language = getLanguage()): NotebookData {
  const raw = DEMOS[language];
  const source: Source = {
    id: DEMO_SOURCE_ID,
    title: raw.title,
    topic: translate('demo.topic', undefined, language),
    pages: raw.pages.map((p) => ({ page: Number(p.page), text: String(p.text) })),
    createdAt: new Date().toISOString(),
    origin: 'demo',
    lang: language,
    studyGoal: translate('goal.demoDefault', undefined, language),
    priorities: ['recall', 'howto'],
  };
  const items = extractCandidates(source.id, source.pages, source.topic, { demo: true });
  return { version: 1, sources: [source], items, sessions: [], ratings: [], attempts: [], warningEvents: [], prefs: { privacySeen: false } };
}

/** True while the notebook holds only the untouched example: safe to swap it for another language. */
export function isPristineDemo(d: NotebookData): boolean {
  return (
    d.sources.length > 0 &&
    d.sources.every((s) => s.origin === 'demo') &&
    d.items.every((i) => i.status === 'pending' && !i.edited && !i.mergedFrom?.length) &&
    d.sessions.length === 0 && d.ratings.length === 0 && d.attempts.length === 0
  );
}
