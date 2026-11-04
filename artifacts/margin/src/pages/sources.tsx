import { useEffect, useState } from 'react';
import { FileUp, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useNav, useNotebook } from '@/store/notebook';
import { Empty, PageHeader } from '@/components/bits';
import { StudyGoalPanel } from '@/components/study-goal-panel';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';

export default function Sources() {
  const { data, deleteSource } = useNotebook();
  const { setAddOpen, focusSourceId, go } = useNav();
  const [sel, setSel] = useState<string | null>(focusSourceId ?? data.sources[0]?.id ?? null);
  const [confirm, setConfirm] = useState(false);
  const { t, formatDate } = useI18n();
  useEffect(() => {
    if (sel && !data.sources.some((s) => s.id === sel)) setSel(data.sources[0]?.id ?? null);
  }, [data.sources, sel]);
  const src = data.sources.find((s) => s.id === sel);
  const itemCount = (id: string) => data.items.filter((i) => i.excerpts.some((e) => e.sourceId === id)).length;

  return (
    <div>
      <PageHeader eyebrow={t('sources.eyebrow')} title={t('sources.title')} actions={<Button onClick={() => setAddOpen(true)} data-testid="button-add-source-page"><FileUp /> {t('sources.add')}</Button>}>
        {t('sources.intro')}
      </PageHeader>
      {data.sources.length === 0 ? (
        <Empty title={t('sources.emptyTitle')} action={<Button onClick={() => setAddOpen(true)}>{t('app.importPdf')}</Button>}>{t('sources.emptyBody')}</Empty>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
          <ul className="grid content-start gap-1.5">
            {data.sources.map((s) => (
              <li key={s.id}>
                <button type="button" onClick={() => setSel(s.id)} data-testid={`button-source-${s.id}`} className={cn('w-full rounded-md border px-3 py-2.5 text-left transition', sel === s.id ? 'border-primary/40 bg-card shadow-sm' : 'border-transparent hover:bg-card/70')}>
                  <div className="eyebrow !text-[10px]">{s.origin === 'demo' ? t('sources.demoBadge') : t('sources.userBadge')}</div>
                  <div className="mt-0.5 font-display text-[1.05rem] leading-snug">{s.title}</div>
                  <div className="mt-1 font-mono text-[11px] text-muted-foreground">{t('sources.meta', { pages: s.pages.length, items: itemCount(s.id), topic: s.topic })}</div>
                </button>
              </li>
            ))}
          </ul>
          {src && (
            <article key={src.id} className="reveal min-w-0">
              <div className="mb-6 flex flex-wrap items-start justify-between gap-3 border-b pb-4">
                <div>
                  <h2 className="break-words font-display text-2xl">{src.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {src.origin === 'demo' ? t('sources.demoNote') : src.fileName ? t('sources.importedFrom', { date: formatDate(src.createdAt), file: src.fileName }) : t('sources.imported', { date: formatDate(src.createdAt) })} {t('sources.unverified')}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => go('review')} data-testid="button-review-source">{t('sources.review')}</Button>
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setConfirm(true)} data-testid="button-delete-source"><Trash2 /> {t('sources.delete')}</Button>
                </div>
              </div>
              <StudyGoalPanel source={src} />
              <div className="grid gap-10">
                {src.pages.map((p) => (
                  <section key={p.page} id={`page-${p.page}`} className="grid gap-3 md:grid-cols-[56px_1fr]">
                    <div className="font-mono text-xs text-[hsl(var(--pencil))] md:pt-1.5">{t('common.page', { page: p.page })}</div>
                    <div className="min-w-0 max-w-[68ch] break-words whitespace-pre-line font-serif text-[1.05rem] leading-[1.8] text-foreground/90" data-testid={`text-page-${p.page}`}>{p.text || <em className="text-muted-foreground">{t('sources.emptyPage')}</em>}</div>
                  </section>
                ))}
              </div>
            </article>
          )}
        </div>
      )}
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('sources.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('sources.deleteBody', { title: src?.title ?? '' })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('sources.keep')}</AlertDialogCancel>
            <AlertDialogAction data-testid="button-confirm-delete-source" onClick={() => src && deleteSource(src.id)}>{t('sources.delete')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
