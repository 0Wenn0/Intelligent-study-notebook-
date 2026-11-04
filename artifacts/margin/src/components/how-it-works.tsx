import { useI18n } from '@/i18n';

const STEPS = [1, 2, 3, 4] as const;

export function HowItWorks({ heading = false }: { heading?: boolean }) {
  const { t } = useI18n();
  return (
    <section aria-labelledby={heading ? 'how-it-works' : undefined}>
      {heading && <h2 id="how-it-works" className="eyebrow mb-3">{t('overview.howTitle')}</h2>}
      <ol className={heading ? 'grid gap-3 sm:grid-cols-2 lg:grid-cols-4' : 'grid gap-3 sm:grid-cols-2'} data-testid="list-how-it-works">
        {STEPS.map((n) => (
          <li key={n} className="flex gap-3 rounded-lg border bg-card p-4">
            <span className="font-display text-2xl leading-none text-[hsl(var(--pencil))]" aria-hidden>{n}</span>
            <span>
              <span className="block font-medium">{t(`overview.how${n}Title`)}</span>
              <span className="mt-0.5 block text-sm leading-snug text-muted-foreground">{t(`overview.how${n}Body`)}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
