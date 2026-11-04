import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useNav, useNotebook } from '@/store/notebook';
import { PageText } from './page-text';
import { useI18n } from '@/i18n';

export function SourcePageDialog() {
  const { data } = useNotebook();
  const { sourcePage, closeSourcePage, openSourcePage } = useNav();
  const { t } = useI18n();
  const src = sourcePage ? data.sources.find((s) => s.id === sourcePage.sourceId) : undefined;
  const idx = src ? src.pages.findIndex((p) => p.page === sourcePage!.page) : -1;
  const page = src && idx >= 0 ? src.pages[idx] : undefined;
  return (
    <Dialog open={!!sourcePage} onOpenChange={(o) => !o && closeSourcePage()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <div className="eyebrow">{src?.origin === 'demo' ? t('sourcePage.demo') : t('sourcePage.yours')} · {t('sourcePage.pageN', { page: sourcePage?.page ?? '' })}</div>
          <DialogTitle className="font-display text-2xl font-normal">{src?.title ?? t('sourcePage.notFound')}</DialogTitle>
          <DialogDescription>{t('sourcePage.description')}</DialogDescription>
        </DialogHeader>
        {page ? (
          <PageText text={page.text} highlight={sourcePage?.highlight} />
        ) : (
          <p className="text-sm text-destructive">{t('sourcePage.gone')}</p>
        )}
        {src && idx >= 0 && (
          <div className="flex items-center justify-between border-t pt-3">
            <Button variant="ghost" size="sm" disabled={idx === 0} onClick={() => openSourcePage(src.id, src.pages[idx - 1].page)} data-testid="button-prev-page">
              <ChevronLeft /> {t('common.previous')}
            </Button>
            <span className="font-mono text-xs text-muted-foreground">{idx + 1} / {src.pages.length}</span>
            <Button variant="ghost" size="sm" disabled={idx === src.pages.length - 1} onClick={() => openSourcePage(src.id, src.pages[idx + 1].page)} data-testid="button-next-page">
              {t('common.next')} <ChevronRight />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
