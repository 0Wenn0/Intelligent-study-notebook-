import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useNav, useNotebook } from '@/store/notebook';
import { Empty, PageHeader } from '@/components/bits';
import { Flashcards } from '@/components/study/flashcards';
import { Quiz } from '@/components/study/quiz';
import { Focus } from '@/components/study/focus';
import { isDue, orderItems } from '@/lib/study';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';

type Mode = 'flashcards' | 'quiz' | 'focus';
const MODES: { id: Mode; label: string; hint: string }[] = [
  { id: 'flashcards', label: 'study.flashcards', hint: 'study.flashcardsHint' },
  { id: 'quiz', label: 'study.quiz', hint: 'study.quizHint' },
  { id: 'focus', label: 'study.focus', hint: 'study.focusHint' },
];

export default function Study() {
  const { data } = useNotebook();
  const { go } = useNav();
  const { t } = useI18n();
  const [mode, setMode] = useState<Mode>('flashcards');
  const approved = orderItems(data.items.filter((i) => i.status === 'approved'), data.sources);
  const due = approved.filter((i) => isDue(i)).length;

  return (
    <div>
      <PageHeader eyebrow={t('study.eyebrow')} title={t('study.title')}>
        {t('study.intro')}
      </PageHeader>
      {approved.length === 0 ? (
        <Empty title={t('study.emptyTitle')} action={<Button onClick={() => go('review')}>{t('study.openReview')}</Button>}>{t('study.emptyBody')}</Empty>
      ) : (
        <>
          <p className="mb-3 font-mono text-xs text-muted-foreground" data-testid="text-study-due">{t('study.dueCount', { due, total: approved.length })}</p>
          <div role="tablist" className="mb-8 grid grid-cols-3 gap-px overflow-hidden rounded-lg border bg-border text-left">
            {MODES.map(({ id, label, hint }) => (
              <button key={id} type="button" role="tab" aria-selected={mode === id} onClick={() => setMode(id)} data-testid={`tab-study-${id}`} className={cn('px-3 py-3 transition sm:px-4', mode === id ? 'bg-card' : 'bg-background/80 text-muted-foreground hover:bg-card/70')}>
                <div className={cn('font-display text-base sm:text-lg', mode === id && 'text-primary')}>{t(label)}</div>
                <div className="hidden text-xs sm:block">{t(hint)}</div>
              </button>
            ))}
          </div>
          <div key={mode} className="reveal">
            {mode === 'flashcards' && <Flashcards items={approved} />}
            {mode === 'quiz' && <Quiz items={approved} />}
            {mode === 'focus' && <Focus items={approved} />}
          </div>
        </>
      )}
    </div>
  );
}
