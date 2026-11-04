import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { buildDemoNotebook } from '@/lib/seed';
import { loadNotebook, saveNotebook, STORAGE_KEY, type StorageStatus } from '@/lib/storage';
import { type Confidence, type Item, type NotebookData, type RatingValue, type Session, type Source, uid } from '@/lib/types';
import { nextReview } from '@/lib/study';

interface Ctx {
  data: NotebookData;
  status: StorageStatus;
  addSource: (s: Source, candidates: Item[]) => void;
  updateSource: (id: string, patch: Partial<Source>) => void;
  deleteSource: (id: string) => void;
  updateItem: (id: string, patch: Partial<Item>) => void;
  setItemsStatus: (ids: string[], status: Item['status']) => void;
  mergeItems: (ids: string[]) => Item | null;
  restoreItems: (snapshot: Item[]) => void;
  rate: (itemId: string, value: RatingValue, confidence?: Confidence) => void;
  recordAttempt: (itemId: string, confidence: Confidence, correct: boolean, mode: 'flashcards' | 'quiz') => void;
  recordWarning: (itemId: string, signature: string) => void;
  addSession: (s: Omit<Session, 'id' | 'date'>) => void;
  replaceAll: (d: NotebookData) => void;
  removeDemo: () => void;
  restoreDemo: () => void;
  resetEverything: () => void;
  markPrivacySeen: () => void;
  markWelcomeSeen: () => void;
}

const NotebookCtx = createContext<Ctx | null>(null);

export function NotebookProvider({ children }: { children: ReactNode }) {
  const initial = useRef<{ data: NotebookData; status: StorageStatus } | null>(null);
  if (!initial.current) {
    const loaded = loadNotebook();
    initial.current = { data: loaded.data ?? buildDemoNotebook(), status: loaded.status };
  }
  const [data, setData] = useState<NotebookData>(initial.current.data);
  const [status, setStatus] = useState<StorageStatus>(initial.current.status);
  const blocked = useRef(status.state === 'unavailable' || status.state === 'corrupt');

  useEffect(() => {
    if (blocked.current) return;
    const r = saveNotebook(data);
    setStatus((prev) => (r.state === 'ok' && prev.state === 'ok' ? prev : r));
  }, [data]);

  const mutate = useCallback((fn: (d: NotebookData) => NotebookData) => setData((d) => fn(d)), []);

  const api = useMemo<Ctx>(
    () => ({
      data,
      status,
      addSource: (s, c) => mutate((d) => ({
        ...d,
        sources: [...d.sources, { ...s, studyGoal: s.studyGoal ?? s.topic, priorities: s.priorities?.length ? s.priorities : ['recall'] }],
        items: [...d.items, ...c.map((i) => ({ ...i, status: 'pending' as const, reviewChecks: { accurate: false, worthwhile: false } }))],
      })),
      updateSource: (id, patch) => mutate((d) => ({
        ...d, sources: d.sources.map((s) => s.id === id ? {
          ...s, studyGoal: patch.studyGoal ?? s.studyGoal,
          priorities: patch.priorities?.length ? patch.priorities : s.priorities,
          topic: patch.topic ?? s.topic,
        } : s),
      })),
      deleteSource: (id) =>
        mutate((d) => ({
          ...d,
          sources: d.sources.filter((s) => s.id !== id),
          items: d.items.filter((i) => !i.excerpts.every((e) => e.sourceId === id)).map((i) => ({ ...i, excerpts: i.excerpts.filter((e) => e.sourceId !== id) })),
        })),
      updateItem: (id, patch) => mutate((d) => ({
        ...d,
        items: d.items.map((i) => {
          if (i.id !== id) return i;
          // Evidence cannot be edited, and interpretation edits require re-approval.
          const changed = (patch.title !== undefined && patch.title !== i.title) ||
            (patch.body !== undefined && patch.body !== i.body) || (patch.kind !== undefined && patch.kind !== i.kind);
          return {
            ...i,
            ...patch,
            id: i.id,
            excerpts: i.excerpts,
            status: changed && i.status === 'approved' ? 'pending' : i.status,
            reviewChecks: changed ? { accurate: false, worthwhile: false } : patch.reviewChecks ?? i.reviewChecks,
          };
        }),
      })),
      setItemsStatus: (ids, st) =>
        mutate((d) => ({
          ...d,
          items: d.items.map((i) => {
            if (!ids.includes(i.id)) return i;
            if (st === 'approved' && (!i.reviewChecks?.accurate || !i.reviewChecks?.worthwhile)) return i;
            return { ...i, status: st, demoApproved: false };
          }),
        })),
      mergeItems: (ids) => {
        const parts = data.items.filter((i) => ids.includes(i.id));
        if (parts.length < 2) return null;
        const merged: Item = {
          id: uid('item'),
          title: parts[0].title,
          kind: parts[0].kind,
          body: parts.map((p) => p.body).filter(Boolean).join('\n\n'),
          excerpts: parts.flatMap((p) => p.excerpts),
          tags: [...new Set(parts.flatMap((p) => p.tags))],
          status: 'pending',
          understanding: 'new',
          createdAt: new Date().toISOString(),
          generated: parts.some((p) => p.generated && p.body),
          edited: true,
          demo: parts.every((p) => p.demo),
          mergedFrom: parts.map((p) => p.id),
          generatedLabel: parts[0].generatedLabel,
          reviewChecks: { accurate: false, worthwhile: false },
        };
        mutate((d) => ({ ...d, items: [...d.items.filter((i) => !ids.includes(i.id)), merged] }));
        return merged;
      },
      restoreItems: (snapshot) => mutate((d) => ({ ...d, items: snapshot })),
      rate: (itemId, value, confidence) =>
        mutate((d) => ({
          ...d,
          ratings: [...d.ratings, { id: uid('rate'), itemId, date: new Date().toISOString(), value, confidence }],
          attempts: confidence ? [...d.attempts, { id: uid('attempt'), itemId, date: new Date().toISOString(), confidence, correct: value === 'confident', mode: 'flashcards' }] : d.attempts,
          items: d.items.map((i) => (i.id === itemId && i.status === 'approved' ? { ...i, understanding: value === 'again' ? 'new' : value, ...nextReview(i, value === 'confident') } : i)),
        })),
      recordAttempt: (itemId, confidence, correct, mode) => mutate((d) => ({
        ...d,
        attempts: [...d.attempts, { id: uid('attempt'), itemId, confidence, correct, mode, date: new Date().toISOString() }],
        items: d.items.map((i) => i.id === itemId && i.status === 'approved' ? {
          ...i,
          ...nextReview(i, correct),
          understanding: correct ? confidence >= 3 ? 'confident' : 'learning' : 'learning',
        } : i),
      })),
      recordWarning: (itemId, signature) => mutate((d) => {
        if (!signature || d.warningEvents.some((e) => e.itemId === itemId && e.signature === signature)) return d;
        return { ...d, warningEvents: [...d.warningEvents, { id: uid('warn'), itemId, signature, date: new Date().toISOString() }] };
      }),
      addSession: (s) => mutate((d) => ({ ...d, sessions: [...d.sessions, { ...s, id: uid('sess'), date: new Date().toISOString() }] })),
      replaceAll: (nd) => {
        blocked.current = status.state === 'unavailable';
        if (status.state === 'corrupt') setStatus({ state: 'ok' });
        setData(nd);
      },
      removeDemo: () =>
        mutate((d) => ({ ...d, sources: d.sources.filter((s) => s.origin !== 'demo'), items: d.items.filter((i) => !i.demo) })),
      restoreDemo: () =>
        mutate((d) => {
          const demo = buildDemoNotebook();
          return { ...d, sources: [...demo.sources, ...d.sources.filter((s) => s.origin !== 'demo')], items: [...demo.items, ...d.items.filter((i) => !i.demo)] };
        }),
      resetEverything: () => {
        try {
          window.localStorage.removeItem(STORAGE_KEY);
        } catch {
          /* storage unavailable; status already shows it */
        }
        blocked.current = status.state === 'unavailable';
        if (status.state === 'corrupt') setStatus({ state: 'ok' });
        setData(buildDemoNotebook());
      },
      markPrivacySeen: () => mutate((d) => ({ ...d, prefs: { ...d.prefs, privacySeen: true } })),
      markWelcomeSeen: () => mutate((d) => ({ ...d, prefs: { ...d.prefs, privacySeen: true, welcomeSeen: true } })),
    }),
    [data, status, mutate],
  );

  return <NotebookCtx.Provider value={api}>{children}</NotebookCtx.Provider>;
}

export function useNotebook() {
  const c = useContext(NotebookCtx);
  if (!c) throw new Error('useNotebook outside provider');
  return c;
}

export type View = 'overview' | 'sources' | 'review' | 'library' | 'study' | 'understanding';

interface NavCtx {
  view: View;
  go: (v: View, opts?: { itemId?: string; sourceId?: string }) => void;
  focusItemId: string | null;
  focusSourceId: string | null;
  sourcePage: { sourceId: string; page: number; highlight?: string } | null;
  openSourcePage: (sourceId: string, page: number, highlight?: string) => void;
  closeSourcePage: () => void;
  addOpen: boolean;
  setAddOpen: (b: boolean) => void;
  privacyOpen: boolean;
  setPrivacyOpen: (b: boolean) => void;
}

const Nav = createContext<NavCtx | null>(null);

export function NavProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<View>('overview');
  const [focusItemId, setFocusItem] = useState<string | null>(null);
  const [focusSourceId, setFocusSource] = useState<string | null>(null);
  const [sourcePage, setSourcePage] = useState<NavCtx['sourcePage']>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const value: NavCtx = {
    view,
    go: (v, o) => {
      setView(v);
      setFocusItem(o?.itemId ?? null);
      setFocusSource(o?.sourceId ?? null);
      window.scrollTo({ top: 0 });
    },
    focusItemId,
    focusSourceId,
    sourcePage,
    openSourcePage: (sourceId, page, highlight) => setSourcePage({ sourceId, page, highlight }),
    closeSourcePage: () => setSourcePage(null),
    addOpen,
    setAddOpen,
    privacyOpen,
    setPrivacyOpen,
  };
  return <Nav.Provider value={value}>{children}</Nav.Provider>;
}

export function useNav() {
  const c = useContext(Nav);
  if (!c) throw new Error('useNav outside provider');
  return c;
}
