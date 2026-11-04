import { ArrowRight, FileUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNav, useNotebook } from '@/store/notebook';
import { DemoMark, ExcerptBlock, KindBadge, SectionLabel } from '@/components/bits';
import { isDue } from '@/lib/study';
import { useI18n } from '@/i18n';
import { HowItWorks } from '@/components/how-it-works';

export default function Overview() {
  const { data } = useNotebook();
  const { go, setAddOpen, setPrivacyOpen } = useNav();
  const { t, formatDate } = useI18n();
  const pending = data.items.filter((i) => i.status === 'pending');
  const approved = data.items.filter((i) => i.status === 'approved');
  const userSources = data.sources.filter((s) => s.origin === 'user');
  const hasDemo = data.sources.some((s) => s.origin === 'demo');
  const due = approved.filter((i) => isDue(i)).length;
  const featured = approved.find((i) => i.kind !== 'Question') ?? approved[0];
  const hour = new Date().getHours();
  const greet = t(hour < 12 ? 'overview.morning' : hour < 18 ? 'overview.afternoon' : 'overview.evening');

  const stats = [
    { label: t('overview.statSources'), value: data.sources.length, to: 'sources' as const },
    { label: t('overview.statPending'), value: pending.length, to: 'review' as const },
    { label: t('overview.statLibrary'), value: approved.length, to: 'library' as const },
    { label: t('overview.statSessions'), value: data.sessions.length, to: 'understanding' as const },
  ];

  return (
    <div>
      <header className="reveal mb-10">
        <div className="eyebrow mb-3">{greet} · {formatDate(new Date(), { weekday: 'long', month: 'long', day: 'numeric' })}</div>
        <h1 className="font-display max-w-3xl text-4xl leading-[1.08] md:text-[3.4rem]">
          {t('overview.headline1')} <em className="text-primary">{t('overview.headlineEm')}</em> {t('overview.headline2')}
        </h1>
        <p className="mt-4 max-w-2xl text-[1.02rem] leading-relaxed text-muted-foreground" data-testid="text-overview-lead">{t('overview.lead')}</p>
      </header>

      {approved.length === 0 && (
        <div className="reveal mb-10" style={{ animationDelay: '40ms' }}>
          <HowItWorks heading />
        </div>
      )}

      {userSources.length === 0 && (
        <section className="reveal mb-10 grid gap-5 rounded-xl border bg-card p-6 shadow-sm md:grid-cols-[1fr_auto] md:items-center md:p-8" style={{ animationDelay: '60ms' }}>
          <div>
            <SectionLabel tone="pencil">{t('overview.startEyebrow')}</SectionLabel>
            <h2 className="font-display text-2xl">{t('overview.startTitle')}</h2>
            <p className="mt-2 max-w-xl text-[0.95rem] leading-relaxed text-muted-foreground">
              {t('overview.startBody')}
            </p>
          </div>
          <Button size="lg" onClick={() => setAddOpen(true)} data-testid="button-import-pdf-hero" className="h-12 px-6">
            <FileUp /> {t('app.importPdf')}
          </Button>
        </section>
      )}

      <section className="reveal mb-12 grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border md:grid-cols-4" style={{ animationDelay: '120ms' }}>
        {stats.map((s) => (
          <button key={s.to} type="button" onClick={() => go(s.to)} data-testid={`stat-${s.to}`} className="group bg-card px-5 py-5 text-left transition hover:bg-background">
            <div className="font-display text-4xl tabular-nums">{s.value}</div>
            <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              {s.label} <ArrowRight className="size-3 opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
            </div>
          </button>
        ))}
      </section>

      <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
        <section className="reveal" style={{ animationDelay: '180ms' }}>
          <SectionLabel>{t('overview.fromLibrary')}</SectionLabel>
          {featured ? (
            <article className="rounded-lg border bg-card p-6 shadow-sm">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <KindBadge kind={featured.kind} />
                <DemoMark item={featured} />
              </div>
              <h3 className="font-display mb-4 text-2xl">{featured.title}</h3>
              <ExcerptBlock excerpt={featured.excerpts[0]} />
              <Button variant="link" className="mt-3 px-0" onClick={() => go('library', { itemId: featured.id })} data-testid="button-open-featured">
                {t('overview.readInLibrary')} <ArrowRight />
              </Button>
            </article>
          ) : (
            <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">{t('overview.nothingApproved')}</div>
          )}
        </section>

        <section className="reveal grid content-start gap-4" style={{ animationDelay: '240ms' }}>
          <SectionLabel>{t('overview.nextSteps')}</SectionLabel>
          <NextStep n="01" title={t('overview.stepReview', { count: pending.length })} text={t('overview.stepReviewText')} onClick={() => go('review')} disabled={!pending.length} id="review" />
          <NextStep n="02" title={t('overview.stepStudy')} text={approved.length ? t('overview.stepStudyText', { approved: approved.length, due }) : t('overview.stepStudyNeeds')} onClick={() => go('study')} disabled={!approved.length} id="study" />
          <NextStep n="03" title={t('overview.stepUnderstanding')} text={t('overview.stepUnderstandingText', { ratings: data.ratings.length, sessions: data.sessions.length })} onClick={() => go('understanding')} id="understanding" />
        </section>
      </div>

      {hasDemo && (
        <aside className="reveal mt-12 rounded-lg border border-[hsl(var(--pencil)/0.3)] bg-[hsl(var(--pencil)/0.04)] p-5 text-sm leading-relaxed" style={{ animationDelay: '300ms' }} data-testid="text-demo-notice">
          <SectionLabel tone="pencil">{t('overview.demoEyebrow')}</SectionLabel>
          {t('overview.demoBody')}{' '}
          <button type="button" className="text-primary underline underline-offset-4" onClick={() => setPrivacyOpen(true)} data-testid="button-demo-privacy">{t('overview.manage')}</button>
        </aside>
      )}
    </div>
  );
}

function NextStep({ n, title, text, onClick, disabled, id }: { n: string; title: string; text: string; onClick: () => void; disabled?: boolean; id: string }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} data-testid={`button-next-${id}`} className="group flex gap-4 rounded-lg border bg-card p-4 text-left transition enabled:hover:-translate-y-px enabled:hover:shadow-md disabled:opacity-55">
      <span className="font-mono text-xs text-[hsl(var(--pencil))]">{n}</span>
      <span className="flex-1">
        <span className="block font-medium">{title}</span>
        <span className="mt-0.5 block text-sm text-muted-foreground">{text}</span>
      </span>
      <ArrowRight className="mt-1 size-4 text-muted-foreground transition group-enabled:group-hover:translate-x-0.5" />
    </button>
  );
}
