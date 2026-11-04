import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import type { Item } from '@/lib/types';
import { useNotebook } from '@/store/notebook';
import { ExcerptBlock, Interpretation, KindBadge, SectionLabel, fmtDuration } from '@/components/bits';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';

const PRESETS = [10, 25, 45];

export function Focus({ items }: { items: Item[] }) {
  const { addSession } = useNotebook();
  const { t } = useI18n();
  const [chosen, setChosen] = useState<string[]>(() => items.slice(0, 6).map((i) => i.id));
  const [minutes, setMinutes] = useState(25);
  const [running, setRunning] = useState(false);
  const [active, setActive] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [idx, setIdx] = useState(0);
  const [visited, setVisited] = useState<Set<string>>(new Set());
  const [summary, setSummary] = useState<{ seconds: number; reviewed: number } | null>(null);
  const lastTick = useRef(0);
  const elapsedRef = useRef(0);
  elapsedRef.current = elapsed;

  const total = minutes * 60;
  const remaining = Math.max(0, total - elapsed);
  const deck = items.filter((i) => chosen.includes(i.id));

  const end = () => {
    const secs = Math.round(elapsedRef.current);
    if (secs > 0) addSession({ mode: 'focus', reviewed: visited.size, correct: 0, seconds: secs });
    setSummary({ seconds: secs, reviewed: visited.size });
    setRunning(false);
    setActive(false);
  };
  const endRef = useRef(end);
  endRef.current = end;

  useEffect(() => {
    if (!running) return;
    lastTick.current = Date.now();
    const t = setInterval(() => {
      const now = Date.now();
      setElapsed((e) => e + (now - lastTick.current) / 1000);
      lastTick.current = now;
    }, 250);
    return () => clearInterval(t);
  }, [running]);

  useEffect(() => {
    if (active && elapsed >= total) endRef.current();
  }, [elapsed, total, active]);

  useEffect(() => {
    if (active && deck[idx]) setVisited((v) => (v.has(deck[idx].id) ? v : new Set(v).add(deck[idx].id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, active]);

  const start = () => {
    setElapsed(0);
    setIdx(0);
    setVisited(new Set());
    setSummary(null);
    setActive(true);
    setRunning(true);
  };

  if (active) {
    const it = deck[idx];
    const mm = Math.floor(remaining / 60).toString().padStart(2, '0');
    const ss = Math.floor(remaining % 60).toString().padStart(2, '0');
    return (
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-card px-6 py-4">
          <div className={cn('font-display text-5xl tabular-nums transition-opacity', !running && 'opacity-50')} data-testid="text-countdown">{mm}:{ss}</div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setRunning(!running)} data-testid="button-focus-pause">{running ? <><Pause /> {t('focus.pause')}</> : <><Play /> {t('focus.resume')}</>}</Button>
            <Button variant="ghost" onClick={end} data-testid="button-focus-end"><Square /> {t('focus.end')}</Button>
          </div>
          <div className="h-[3px] w-full overflow-hidden rounded bg-muted"><div className="h-full origin-left bg-primary transition-transform duration-300" style={{ transform: `scaleX(${elapsed / total})` }} /></div>
        </div>
        {it && (
          <article key={it.id} className="reveal rounded-xl border bg-card p-6">
            <div className="mb-3 flex items-center justify-between"><KindBadge kind={it.kind} /><span className="font-mono text-xs text-muted-foreground">{idx + 1} / {deck.length}</span></div>
            <h3 className="font-display mb-4 text-2xl">{it.title}</h3>
            <SectionLabel>{t('common.sourceExcerpt')}</SectionLabel>
            <div className="grid gap-2">{it.excerpts.map((e, k) => <ExcerptBlock key={k} excerpt={e} />)}</div>
            <Interpretation item={it} className="mt-4" />
            <div className="mt-5 flex justify-between">
              <Button variant="ghost" size="sm" disabled={idx === 0} onClick={() => setIdx(idx - 1)} data-testid="button-focus-prev"><ChevronLeft /> {t('common.previous')}</Button>
              <Button variant="ghost" size="sm" disabled={idx >= deck.length - 1} onClick={() => setIdx(idx + 1)} data-testid="button-focus-next">{t('common.next')} <ChevronRight /></Button>
            </div>
          </article>
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
      <div>
        {summary && (
          <div className="reveal mb-6 rounded-lg border border-[hsl(var(--sage)/0.4)] bg-[hsl(var(--sage)/0.06)] p-4 text-sm" data-testid="status-focus-summary">
            {t('focus.logged', { time: fmtDuration(summary.seconds), count: summary.reviewed })}
          </div>
        )}
        <SectionLabel>{t('focus.choose', { count: chosen.length })}</SectionLabel>
        <div className="mb-2 flex gap-3 text-xs">
          <button type="button" className="text-primary hover:underline" onClick={() => setChosen(items.map((i) => i.id))} data-testid="button-focus-all">{t('focus.selectAll')}</button>
          <button type="button" className="text-muted-foreground hover:underline" onClick={() => setChosen([])} data-testid="button-focus-none">{t('focus.clear')}</button>
        </div>
        <ul className="grid max-h-[420px] gap-1 overflow-y-auto rounded-lg border bg-card p-2">
          {items.map((it) => (
            <li key={it.id}>
              <label className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-muted/60">
                <Checkbox checked={chosen.includes(it.id)} onCheckedChange={() => setChosen((c) => (c.includes(it.id) ? c.filter((x) => x !== it.id) : [...c, it.id]))} data-testid={`checkbox-focus-${it.id}`} />
                <span className="min-w-0 flex-1 break-words text-sm">{it.title}</span>
                <KindBadge kind={it.kind} />
              </label>
            </li>
          ))}
        </ul>
      </div>
      <aside className="grid content-start gap-4 rounded-xl border bg-card p-5">
        <SectionLabel>{t('focus.duration')}</SectionLabel>
        <div className="grid grid-cols-3 gap-2">
          {PRESETS.map((m) => (
            <button key={m} type="button" onClick={() => setMinutes(m)} data-testid={`button-duration-${m}`} className={cn('rounded-md border py-2 font-mono text-sm transition', minutes === m ? 'border-primary bg-primary text-primary-foreground' : 'hover:border-primary/50')}>{t('focus.minutes', { m })}</button>
          ))}
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">{t('focus.durationNote')}</p>
        <Button size="lg" disabled={!deck.length} onClick={start} data-testid="button-focus-start"><Play /> {t('focus.start', { minutes })}</Button>
      </aside>
    </div>
  );
}
