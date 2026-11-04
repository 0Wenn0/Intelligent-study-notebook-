import { Button } from '@/components/ui/button';
import { useNav, useNotebook } from '@/store/notebook';
import { Bar, Empty, PageHeader, SectionLabel, fmtDuration } from '@/components/bits';
import { isDue } from '@/lib/study';
import type { Confidence } from '@/lib/types';
import { useI18n } from '@/i18n';

export default function Understanding() {
  const { data } = useNotebook();
  const { go } = useNav();
  const { t, formatDate, formatNumber } = useI18n();
  const approved = data.items.filter((i) => i.status === 'approved');
  const by = { new: 0, learning: 0, confident: 0 };
  approved.forEach((i) => by[i.understanding]++);
  const r = { again: 0, learning: 0, confident: 0 };
  data.ratings.forEach((x) => r[x.value]++);
  const quizzes = data.sessions.filter((s) => s.mode === 'quiz');
  const qTotal = quizzes.reduce((n, s) => n + s.reviewed, 0);
  const qRight = quizzes.reduce((n, s) => n + s.correct, 0);
  const focusSecs = data.sessions.filter((s) => s.mode === 'focus').reduce((n, s) => n + s.seconds, 0);
  const allSecs = data.sessions.reduce((n, s) => n + s.seconds, 0);
  const pct = (a: number, b: number) => (b ? (a / b) * 100 : 0);
  const fmtPct = (v: number) => formatNumber(v / 100, { style: 'percent', maximumFractionDigits: 0 });

  const dueItems = approved.filter((i) => isDue(i));
  const upcoming = approved.filter((i) => !isDue(i) && i.dueAt).sort((a, b) => (a.dueAt ?? '').localeCompare(b.dueAt ?? '')).slice(0, 5);

  const calibration = ([1, 2, 3, 4] as Confidence[]).map((c) => {
    const rows = data.attempts.filter((a) => a.confidence === c);
    return { c, n: rows.length, right: rows.filter((a) => a.correct).length };
  });

  return (
    <div>
      <PageHeader eyebrow={t('dash.eyebrow')} title={t('dash.title')}>
        {t('dash.intro')}
      </PageHeader>
      {approved.length === 0 && data.sessions.length === 0 ? (
        <Empty title={t('dash.emptyTitle')} action={<Button onClick={() => go('review')}>{t('dash.emptyAction')}</Button>}>{t('dash.emptyBody')}</Empty>
      ) : (
        <div className="grid gap-10">
          <section className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border bg-border sm:grid-cols-4">
            {([
              ['self-ratings', t('dash.selfRatings'), formatNumber(data.ratings.length)],
              ['sessions', t('dash.sessions'), formatNumber(data.sessions.length)],
              ['quiz-accuracy', t('dash.quizAccuracy'), qTotal ? fmtPct(pct(qRight, qTotal)) : t('dash.noneYet')],
              ['time-studied', t('dash.timeStudied'), fmtDuration(allSecs)],
            ] as const).map(([id, l, v]) => (
              <div key={id} className="bg-card px-5 py-5">
                <div className="font-display text-3xl tabular-nums" data-testid={`stat-${id}`}>{v}</div>
                <div className="mt-1 text-sm text-muted-foreground">{l}</div>
              </div>
            ))}
          </section>

          <div className="grid gap-10 md:grid-cols-2">
            <section data-testid="section-due">
              <SectionLabel>{t('dash.dueNow')}</SectionLabel>
              <p className="font-display text-3xl tabular-nums">{formatNumber(dueItems.length)}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t('dash.dueBody', { due: dueItems.length, total: approved.length })}</p>
              {upcoming.length > 0 && (
                <>
                  <div className="eyebrow mt-4 mb-2">{t('dash.dueList')}</div>
                  <ul className="grid gap-1.5 text-sm">
                    {upcoming.map((i) => (
                      <li key={i.id} className="flex justify-between gap-3">
                        <span className="min-w-0 truncate">{i.title}</span>
                        <span className="shrink-0 font-mono text-xs text-muted-foreground">{formatDate(i.dueAt!)}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>
            <section data-testid="section-warnings">
              <SectionLabel>{t('dash.warnings')}</SectionLabel>
              <p className="font-display text-3xl tabular-nums" data-testid="stat-warnings">{formatNumber(data.warningEvents.length)}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t('dash.warningsBody')}</p>
            </section>
          </div>

          <section data-testid="section-calibration">
            <SectionLabel>{t('dash.calibration')}</SectionLabel>
            <p className="mb-3 max-w-2xl text-sm text-muted-foreground">{t('dash.calibrationBody')}</p>
            {data.attempts.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('dash.calNone')}</p>
            ) : (
              <div className="overflow-x-auto rounded-lg border bg-card">
                <table className="w-full text-sm">
                  <thead className="text-left"><tr className="border-b">{[t('dash.calLevel'), t('dash.calAttempts'), t('dash.calCorrect'), ''].map((h, k) => <th key={k} className="eyebrow px-4 py-2.5 font-normal">{h}</th>)}</tr></thead>
                  <tbody>
                    {calibration.map(({ c, n, right }) => (
                      <tr key={c} className="border-b last:border-0">
                        <td className="px-4 py-2.5">{c} · {t(`study.confidence${c}`)}</td>
                        <td className="px-4 py-2.5 tabular-nums">{formatNumber(n)}</td>
                        <td className="px-4 py-2.5 tabular-nums">{n ? fmtPct(pct(right, n)) : '–'}</td>
                        <td className="w-1/3 min-w-[120px] px-4 py-2.5">{n > 0 && <Bar value={pct(right, n)} tone="sage" />}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <div className="grid gap-10 md:grid-cols-2">
            <section>
              <SectionLabel>{t('dash.current', { count: approved.length })}</SectionLabel>
              <div className="grid gap-4">
                {([['confident', t('flash.confident'), 'sage'], ['learning', t('flash.learning'), 'ochre'], ['new', t('dash.notRated'), 'pencil']] as const).map(([k, l, tone]) => (
                  <div key={k}>
                    <div className="mb-1.5 flex justify-between text-sm"><span>{l}</span><span className="font-mono text-muted-foreground">{by[k]}</span></div>
                    <Bar value={pct(by[k], approved.length)} tone={tone} />
                  </div>
                ))}
              </div>
            </section>
            <section>
              <SectionLabel>{t('dash.allRatings')}</SectionLabel>
              {data.ratings.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('dash.noRatings')}</p>
              ) : (
                <div className="grid gap-4">
                  {([['confident', t('flash.confident'), 'sage'], ['learning', t('flash.learning'), 'ochre'], ['again', t('flash.again'), 'pencil']] as const).map(([k, l, tone]) => (
                    <div key={k}>
                      <div className="mb-1.5 flex justify-between text-sm"><span>{l}</span><span className="font-mono text-muted-foreground">{r[k]}</span></div>
                      <Bar value={pct(r[k], data.ratings.length)} tone={tone} />
                    </div>
                  ))}
                </div>
              )}
              {focusSecs > 0 && <p className="mt-5 text-sm text-muted-foreground">{t('dash.focusLogged', { time: fmtDuration(focusSecs) })}</p>}
            </section>
          </div>

          <section>
            <SectionLabel>{t('dash.history')}</SectionLabel>
            {data.sessions.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('dash.noSessions')} <button type="button" className="text-primary underline underline-offset-4" onClick={() => go('study')}>{t('dash.startStudying')}</button></p>
            ) : (
              <div className="overflow-x-auto rounded-lg border bg-card">
                <table className="w-full text-sm">
                  <thead className="text-left"><tr className="border-b">{['colDate', 'colMode', 'colReviewed', 'colCorrect', 'colTime'].map((h) => <th key={h} className="eyebrow whitespace-nowrap px-4 py-2.5 font-normal">{t(`dash.${h}`)}</th>)}</tr></thead>
                  <tbody>
                    {[...data.sessions].reverse().map((s) => (
                      <tr key={s.id} className="border-b last:border-0" data-testid={`row-session-${s.id}`}>
                        <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs">{formatDate(s.date, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                        <td className="px-4 py-2.5">{t(`modes.${s.mode}`)}</td>
                        <td className="px-4 py-2.5 tabular-nums">{s.reviewed}</td>
                        <td className="px-4 py-2.5 tabular-nums">{s.mode === 'focus' ? '–' : `${s.correct}${s.mode === 'quiz' ? ` / ${s.reviewed}` : ''}`}</td>
                        <td className="px-4 py-2.5 tabular-nums">{fmtDuration(s.seconds)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
