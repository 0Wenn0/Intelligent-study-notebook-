import { useRef, useState } from 'react';
import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Confidence, Item } from '@/lib/types';
import { useNav, useNotebook } from '@/store/notebook';
import { Empty } from '@/components/bits';
import { buildQuiz, type QuizQuestion } from '@/lib/study';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';
import { ConfidencePicker } from './confidence';

interface Answer {
  picked: string;
  confidence: Confidence;
  correct: boolean;
}

export function Quiz({ items }: { items: Item[] }) {
  const { data, addSession, recordAttempt } = useNotebook();
  const { openSourcePage } = useNav();
  const { t } = useI18n();
  const [qs, setQs] = useState<QuizQuestion[]>(() => buildQuiz(items, data.sources));
  const [i, setI] = useState(0);
  const [confidence, setConfidence] = useState<Confidence | null>(null);
  const [answers, setAnswers] = useState<(Answer | undefined)[]>([]);
  const [done, setDone] = useState(false);
  const started = useRef(Date.now());

  const label = (key: string) => {
    const [sourceId, page] = key.split(':');
    const src = data.sources.find((s) => s.id === sourceId);
    return t('quiz.location', { source: src?.title ?? t('common.missingSource'), page });
  };

  if (qs.length === 0) {
    return <Empty title={t('quiz.notEnough')}>{t('quiz.notEnoughBody')}</Empty>;
  }

  const score = answers.filter((a) => a?.correct).length;
  const q = qs[i];
  const answer = answers[i];

  const choose = (option: string) => {
    if (answer || !confidence) return;
    const correct = option === q.answer;
    const next = [...answers];
    next[i] = { picked: option, confidence, correct };
    setAnswers(next);
    recordAttempt(q.itemId, confidence, correct, 'quiz');
  };

  const advance = () => {
    setConfidence(null);
    if (i + 1 < qs.length) setI(i + 1);
    else {
      addSession({ mode: 'quiz', reviewed: qs.length, correct: answers.filter((a) => a?.correct).length, seconds: Math.round((Date.now() - started.current) / 1000) });
      setDone(true);
    }
  };

  const restart = () => {
    setQs(buildQuiz(items, data.sources));
    setI(0);
    setAnswers([]);
    setConfidence(null);
    setDone(false);
    started.current = Date.now();
  };

  const openCite = (qq: QuizQuestion) => openSourcePage(qq.excerpt.sourceId, qq.excerpt.page, qq.excerpt.text);

  if (done) {
    return (
      <div className="mx-auto max-w-2xl" data-testid="status-quiz-done">
        <div className="rounded-xl border bg-card p-7 text-center">
          <div className="eyebrow">{t('quiz.saved')}</div>
          <div className="font-display mt-2 text-5xl tabular-nums">{score}<span className="text-muted-foreground"> / {qs.length}</span></div>
        </div>
        <ol className="mt-6 grid gap-3">
          {qs.map((qq, k) => {
            const ok = answers[k]?.correct;
            return (
              <li key={qq.id} className="rounded-lg border bg-card p-4 text-sm">
                <div className="flex items-start gap-2">
                  {ok ? <Check className="mt-0.5 size-4 shrink-0 text-[hsl(var(--sage))]" /> : <X className="mt-0.5 size-4 shrink-0 text-[hsl(var(--pencil))]" />}
                  <span className="font-serif line-clamp-3 break-words">{qq.type === 'cloze' ? qq.prompt : qq.excerpt.text}</span>
                </div>
                <p className="mt-1 text-muted-foreground">
                  {t('quiz.answerWas', { answer: qq.type === 'cloze' ? qq.answer : label(qq.answer) })}{' '}
                  <button type="button" className="text-primary underline underline-offset-4" onClick={() => openCite(qq)}>{t('quiz.openCite', { label: label(`${qq.excerpt.sourceId}:${qq.excerpt.page}`) })}</button>
                </p>
              </li>
            );
          })}
        </ol>
        <Button className="mt-6" onClick={restart} data-testid="button-quiz-restart">{t('quiz.newQuiz')}</Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-3 font-mono text-xs text-muted-foreground">{t('quiz.progress', { n: i + 1, total: qs.length, score })}</div>
      <h3 className="font-display mb-2 text-xl leading-snug sm:text-2xl">{q.type === 'cloze' ? t('quiz.clozeInstruction') : t('quiz.sourceInstruction')}</h3>
      <blockquote className="excerpt mb-2 rounded-r-sm px-4 py-3 font-serif text-[1.02rem] leading-relaxed break-words" data-testid="text-quiz-prompt">
        {q.prompt}
      </blockquote>
      <p className="mb-5 text-xs text-muted-foreground">{t('quiz.exactNote')}</p>

      {!answer && (
        <div className="mb-5">
          <ConfidencePicker value={confidence} onChange={setConfidence} />
          {!confidence && <p className="mt-2 text-xs text-muted-foreground">{t('study.confidenceFirst')}</p>}
        </div>
      )}

      <div className="grid gap-2.5 sm:grid-cols-2">
        {q.options.map((o, k) => {
          const correct = o === q.answer;
          const chosen = answer?.picked === o;
          return (
            <button key={o} type="button" disabled={!!answer || !confidence} onClick={() => choose(o)} data-testid={`button-quiz-option-${k}`}
              className={cn('rounded-lg border bg-card px-4 py-3 text-left text-[0.97rem] leading-snug break-words transition enabled:hover:-translate-y-px enabled:hover:border-primary/50 disabled:cursor-not-allowed',
                !answer && !confidence && 'opacity-60',
                answer && correct && 'border-[hsl(var(--sage))] bg-[hsl(var(--sage)/0.08)]',
                answer && chosen && !correct && 'border-[hsl(var(--pencil))] bg-[hsl(var(--pencil)/0.06)]',
                answer && !correct && !chosen && 'opacity-55')}>
              {q.type === 'cloze' ? o : label(o)}
            </button>
          );
        })}
      </div>

      {answer && (
        <div className="reveal mt-5 rounded-lg border bg-muted/50 p-4 text-sm" role="status" data-testid="text-quiz-explanation">
          <strong>{answer.correct ? t('quiz.correct') : t('quiz.wrong')}</strong>{' '}
          {t('quiz.answerWas', { answer: q.type === 'cloze' ? q.answer : label(q.answer) })}{' '}
          <button type="button" className="text-primary underline underline-offset-4" onClick={() => openCite(q)} data-testid="button-quiz-cite">
            {t('quiz.openCite', { label: label(`${q.excerpt.sourceId}:${q.excerpt.page}`) })}
          </button>
          <div className="mt-3"><Button size="sm" onClick={advance} data-testid="button-quiz-next">{i + 1 < qs.length ? t('quiz.nextQ') : t('quiz.finish')}</Button></div>
        </div>
      )}
    </div>
  );
}
