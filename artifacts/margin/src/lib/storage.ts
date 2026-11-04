import { z } from 'zod';
import { KINDS, PRIORITIES, type NotebookData } from './types';
import { translate } from '@/i18n';
import { deriveTitle } from './extract';

export const STORAGE_KEY = 'margin.notebook.v1';

export type StorageStatus =
  | { state: 'ok' }
  | { state: 'unavailable'; message: string; messageKey?: string }
  | { state: 'corrupt'; message: string; messageKey?: string; raw: string }
  | { state: 'save-failed'; message: string; messageKey?: string };

const excerpt = z.object({ sourceId: z.string(), page: z.number(), text: z.string() });
const schema = z.object({
  version: z.literal(1),
  sources: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      topic: z.string(),
      pages: z.array(z.object({ page: z.number(), text: z.string() })),
      createdAt: z.string(),
      origin: z.enum(['demo', 'user']),
      fileName: z.string().optional(),
      studyGoal: z.string().optional(),
      priorities: z.array(z.enum(PRIORITIES)).min(1).optional(),
    }),
  ),
  items: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      kind: z.enum(KINDS),
      body: z.string(),
      excerpts: z.array(excerpt).min(1),
      tags: z.array(z.string()),
      status: z.enum(['pending', 'approved', 'discarded']),
      understanding: z.enum(['new', 'learning', 'confident']),
      createdAt: z.string(),
      generated: z.boolean().optional(),
      edited: z.boolean().optional(),
      demo: z.boolean().optional(),
      demoApproved: z.boolean().optional(),
      mergedFrom: z.array(z.string()).optional(),
      generatedLabel: z.boolean().optional(),
      reviewChecks: z.object({ accurate: z.boolean(), worthwhile: z.boolean() }).optional(),
      dueAt: z.string().datetime().optional(),
      intervalDays: z.number().nonnegative().optional(),
    }),
  ),
  sessions: z.array(
    z.object({
      id: z.string(),
      date: z.string(),
      mode: z.enum(['flashcards', 'quiz', 'focus']),
      reviewed: z.number(),
      correct: z.number(),
      seconds: z.number(),
    }),
  ),
  ratings: z.array(z.object({ id: z.string(), itemId: z.string(), date: z.string(), value: z.enum(['again', 'learning', 'confident']), confidence: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).optional() })),
  attempts: z.array(z.object({
    id: z.string(), itemId: z.string(), date: z.string(),
    confidence: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
    correct: z.boolean(), mode: z.enum(['flashcards', 'quiz']),
  })).default([]),
  warningEvents: z.array(z.object({
    id: z.string(), itemId: z.string(), signature: z.string(), date: z.string(),
  })).default([]),
  prefs: z.object({ privacySeen: z.boolean() }),
});

export function validateNotebook(value: unknown): { ok: true; data: NotebookData } | { ok: false; error: string } {
  const r = schema.safeParse(value);
  if (!r.success) {
    return { ok: false, error: translate('storage.invalidBackup') };
  }
  const data = r.data as NotebookData;
  const ids = new Set(data.sources.map((s) => s.id));
  const orphan = data.items.find((it) => it.excerpts.some((e) => !ids.has(e.sourceId)));
  if (orphan) return { ok: false, error: translate('storage.orphanCitation') };
  const hasInvalidExcerpt = data.items.some((item) => item.excerpts.some((e) =>
    !data.sources.find((s) => s.id === e.sourceId)?.pages.some((p) => p.page === e.page && p.text.includes(e.text)),
  ));
  if (hasInvalidExcerpt) return { ok: false, error: translate('storage.invalidExcerpt') };
  if (new Set(data.sources.map((s) => s.id)).size !== data.sources.length ||
      new Set(data.items.map((i) => i.id)).size !== data.items.length) {
    return { ok: false, error: translate('storage.invalidBackup') };
  }
  return { ok: true, data: migrateNotebook(data) };
}

/** Additive migration: preserve user approvals/data; revoke only old app-made approvals. */
function migrateNotebook(data: NotebookData): NotebookData {
  return {
    ...data,
    sources: data.sources.map((s) => ({
      ...s,
      studyGoal: s.studyGoal ?? (s.origin === 'demo' ? 'Designing AI-supported learning environments for university teachers' : s.topic),
      priorities: s.priorities ?? (s.origin === 'demo' ? ['recall', 'howto'] : ['recall']),
    })),
    items: data.items.map((i) => {
      const wasAppApproved = i.demoApproved === true;
      const pending = wasAppApproved || i.status === 'pending';
      return {
        ...i,
        status: wasAppApproved ? 'pending' : i.status,
        demoApproved: false,
        ...(pending && !i.edited ? { title: deriveTitle(i.excerpts[0].text), generatedLabel: true } : {}),
        reviewChecks: i.reviewChecks ?? { accurate: false, worthwhile: false },
      };
    }),
  };
}

export function loadNotebook(): { data: NotebookData | null; status: StorageStatus } {
  let raw: string | null;
  try {
    const probe = '__margin_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return {
      data: null,
      status: { state: 'unavailable', messageKey: 'storage.unavailable', message: translate('storage.unavailable') },
    };
  }
  if (!raw) return { data: null, status: { state: 'ok' } };
  try {
    const v = validateNotebook(JSON.parse(raw));
    if (!v.ok) return { data: null, status: { state: 'corrupt', messageKey: 'storage.invalidSaved', message: translate('storage.invalidSaved'), raw } };
    return { data: v.data, status: { state: 'ok' } };
  } catch {
    return { data: null, status: { state: 'corrupt', messageKey: 'storage.invalidJson', message: translate('storage.invalidJson'), raw } };
  }
}

export function saveNotebook(data: NotebookData): StorageStatus {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return { state: 'ok' };
  } catch (e) {
    const quota = (e as { name?: string })?.name === 'QuotaExceededError';
    return {
      state: 'save-failed',
      messageKey: quota ? 'storage.full' : 'storage.saveFailed',
      message: translate(quota ? 'storage.full' : 'storage.saveFailed', { error: String((e as Error)?.message ?? e) }),
    };
  }
}

export function downloadJson(name: string, value: unknown) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function parseBackup(text: string): { ok: true; data: NotebookData } | { ok: false; error: string } {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: translate('storage.invalidBackupJson') };
  }
  const obj = json as { app?: string; data?: unknown };
  if (!obj || typeof obj !== 'object' || obj.app !== 'margin' || !obj.data) {
    return { ok: false, error: translate('storage.invalidEnvelope') };
  }
  return validateNotebook(obj.data);
}
