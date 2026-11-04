import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { Confidence, Item, RatingValue } from '@/lib/types';
import { useNotebook } from '@/store/notebook';
import { DemoMark, ExcerptBlock, Interpretation, KindBadge, SectionLabel } from '@/components/bits';
import { ConfidencePicker } from './confidence';
import { isDue, orderItems } from '@/lib/study';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';

export function Flashcards({ items }: { items: Item[] }) {
  const { data, rate, addSession } = useNotebook();
  const { t } = useI18n();
  const build = () => orderItems(items, data.sources);
  const [deck, setDeck] = useState<Item[]>(build);
  const [idx, setIdx] = useState(0);
  const [confidence, setConfidence] = useState<Confidence | null>(null);
  const [shown, setShown] = useState(false);
  const [tally, setTally] = useState({ reviewed: 0, confident: 0 });
  const [done, setDone] = useState(false);
  const started = useRef(Date.now());

  const finish = (tl = tally) => {
    if (tl.reviewed > 0) addSession({ mode: 'flashcards', reviewed: tl.reviewed, correct: tl.confident, seconds: Math.round((Date.now() - started.current) / 1000) });
    setDone(true);
  };

  const onRate = (v: RatingValue) => {
    const card = deck[idx];
    rate(card.id, v, confidence ?? undefined);
    const next = { reviewed: tally.reviewed + 1, confident: tally.confident + (v === 'confident' ? 1 : 0) };
    setTally(next);
    setShown(false);
    setConfidence(null);
    if (idx + 1 >= deck.length) finish(next);
    else setIdx(idx + 1);
  };

  const restart = () => {
    setDeck(build());
    setIdx(0);
    setShown(false);
    setConfidence(null);
    setTally({ reviewed: 0, confident: 0 });
    setDone(false);
    started.current = Date.now();
  };

  if (done) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center" data-testid="status-flashcards-done">
        <div className="eyebrow">{t('flash.saved')}</div>
        <div className="font-display mt-2 text-4xl">{t('flash.reviewed', { count: tally.reviewed })}</div>
        <p className="mt-2 text-muted-foreground">{t('flash.doneBody', { confident: tally.confident })}</p>
        <Button className="mt-6" onClick={restart} data-testid="button-flashcards-restart">{t('flash.another')}</Button>
      </div>
    );
  }

  const card = deck[idx];
  if (!card) return null;
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-3 flex items-center justify-between font-mono text-xs text-muted-foreground">
        <span>{t('flash.card', { n: idx + 1, total: deck.length })}</span>
        <button type="button" onClick={() => finish()} className="rounded hover:text-foreground" data-testid="button-flashcards-end">{t('flash.endSave')}</button>
      </div>
      <div className="mb-4 h-[3px] overflow-hidden rounded bg-muted"><div className="h-full origin-left bg-[hsl(var(--pencil))] transition-transform duration-500" style={{ transform: `scaleX(${idx / deck.length})` }} /></div>
      <article className="min-h-[300px] rounded-xl border bg-card p-5 shadow-md sm:p-7" data-testid={`card-flash-${card.id}`}>
        <div className="mb-4 flex flex-wrap gap-2">
          <KindBadge kind={card.kind} />
          <DemoMark item={card} />
          {isDue(card) && <span className="font-mono text-[10px] uppercase tracking-wider text-[hsl(var(--pencil))]">{t('flash.dueBadge')}</span>}
        </div>
        <h3 className="font-display text-2xl leading-snug break-words md:text-3xl">{card.title}</h3>
        {!shown ? (
          <div className="mt-8 grid gap-4">
            <p className="text-sm text-muted-foreground">{t('flash.recall')}</p>
            <ConfidencePicker value={confidence} onChange={setConfidence} />
            <div>
              <Button onClick={() => setShown(true)} disabled={!confidence} data-testid="button-reveal">{t('flash.reveal')}</Button>
              {!confidence && <p className="mt-2 text-xs text-muted-foreground">{t('study.confidenceFirst')}</p>}
            </div>
          </div>
        ) : (
          <div className="reveal mt-6 grid gap-4">
            <div><SectionLabel>{t('common.sourceExcerpt')}</SectionLabel><div className="grid gap-2">{card.excerpts.map((e, i) => <ExcerptBlock key={i} excerpt={e} compact />)}</div></div>
            <Interpretation item={card} />
            <p className="text-sm text-muted-foreground">{t('flash.rateAfter')}</p>
            <div className="grid grid-cols-3 gap-2">
              {(['again', 'learning', 'confident'] as const).map((v) => (
                <button key={v} type="button" onClick={() => onRate(v)} data-testid={`button-rate-${v}`} className={cn('rounded-md border px-2 py-2.5 text-sm transition hover:-translate-y-px active:translate-y-0', v === 'again' && 'hover:border-[hsl(var(--pencil))] hover:text-[hsl(var(--pencil))]', v === 'learning' && 'hover:border-[hsl(40_70%_45%)]', v === 'confident' && 'border-[hsl(var(--sage)/0.5)] bg-[hsl(var(--sage)/0.08)] text-[hsl(var(--sage))]')}>
                  {t(`flash.${v}`)}
                </button>
              ))}
            </div>
          </div>
        )}
      </article>
    </div>
  );
}
