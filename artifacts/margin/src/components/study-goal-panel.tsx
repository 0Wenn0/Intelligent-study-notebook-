import { useEffect, useState } from 'react';
import { Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { PRIORITIES, type Priority, type Source } from '@/lib/types';
import { useNotebook } from '@/store/notebook';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/i18n';

export const DEMO_GOAL = 'Designing AI-supported learning environments for university teachers';

/** Displays the bundled English default localized only while it is unedited. */
export function goalLabel(src: Source, t: (k: string) => string) {
  if (!src.studyGoal) return '';
  return src.origin === 'demo' && src.studyGoal === DEMO_GOAL ? t('goal.demoDefault') : src.studyGoal;
}

export function StudyGoalPanel({ source }: { source: Source }) {
  const { updateSource } = useNotebook();
  const { t } = useI18n();
  const { toast } = useToast();
  const [goal, setGoal] = useState('');
  const [prios, setPrios] = useState<Priority[]>([]);

  useEffect(() => {
    setGoal(goalLabel(source, t));
    setPrios(source.priorities?.length ? source.priorities : ['recall']);
    // re-init per source and language
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source.id, t]);

  const toggle = (p: Priority) => setPrios((c) => (c.includes(p) ? c.filter((x) => x !== p) : [...c, p]));
  const save = () => {
    if (!prios.length) return;
    const trimmed = goal.trim();
    const studyGoal = source.origin === 'demo' && trimmed === t('goal.demoDefault') ? DEMO_GOAL : trimmed;
    updateSource(source.id, { studyGoal, priorities: PRIORITIES.filter((p) => prios.includes(p)) });
    toast({ title: t('goal.saved') });
  };

  return (
    <section className="mb-8 rounded-lg border bg-card p-4 md:p-5" data-testid={`panel-goal-${source.id}`}>
      <div className="mb-3 flex items-center gap-2">
        <Target className="size-4 text-[hsl(var(--pencil))]" />
        <div className="eyebrow !text-[hsl(var(--pencil))]">{t('goal.eyebrow')}</div>
      </div>
      <label className="grid gap-1.5">
        <span className="text-sm font-medium">{t('goal.subject')}</span>
        <Input value={goal} onChange={(e) => setGoal(e.target.value)} placeholder={t('goal.subjectPlaceholder')} data-testid="input-study-goal" />
      </label>
      <fieldset className="mt-4">
        <legend className="mb-2 text-sm font-medium">{t('goal.priority')}</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {PRIORITIES.map((p) => (
            <label key={p} className="flex cursor-pointer items-start gap-2.5 rounded-md border px-3 py-2 transition hover:border-primary/40 has-[button[data-state=checked]]:border-primary/50 has-[button[data-state=checked]]:bg-primary/[0.04]">
              <Checkbox checked={prios.includes(p)} onCheckedChange={() => toggle(p)} className="mt-0.5" data-testid={`checkbox-priority-${p}`} />
              <span className="min-w-0">
                <span className="block text-sm">{t(`priorities.${p}`)}</span>
                <span className="block text-xs text-muted-foreground">{t(`priorities.${p}_hint`)}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button size="sm" onClick={save} disabled={!prios.length} data-testid="button-save-goal">{t('goal.save')}</Button>
        <span className={prios.length ? 'text-xs text-muted-foreground' : 'text-xs text-destructive'} role={prios.length ? undefined : 'alert'}>
          {prios.length ? t('goal.effect') : t('goal.needOne')}
        </span>
      </div>
    </section>
  );
}
