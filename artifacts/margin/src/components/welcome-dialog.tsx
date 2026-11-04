import { useRef } from 'react';
import { FileUp, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useI18n } from '@/i18n';
import { HowItWorks } from './how-it-works';
import { LangSwitch } from './bits';

/** First-run explanation: what the app is for and how to use it, before any data or privacy detail. */
export function WelcomeDialog({ open, onClose, onUpload }: { open: boolean; onClose: () => void; onUpload: () => void }) {
  const { t } = useI18n();
  const primary = useRef<HTMLButtonElement>(null);
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl" data-testid="dialog-welcome" onOpenAutoFocus={(e) => { e.preventDefault(); primary.current?.focus(); }}>
        <DialogHeader>
          <div className="flex items-center justify-between gap-3 pr-8">
            <div className="eyebrow">{t('welcome.eyebrow')}</div>
            <LangSwitch />
          </div>
          <DialogTitle className="font-display text-2xl font-normal sm:text-3xl">{t('welcome.title')}</DialogTitle>
          <DialogDescription className="text-[0.95rem] leading-relaxed">{t('welcome.body')}</DialogDescription>
        </DialogHeader>
        <HowItWorks />
        <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-[hsl(var(--sage))]" />
          {t('welcome.privacy')}
        </p>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose} data-testid="button-welcome-demo">{t('welcome.tryDemo')}</Button>
          <Button ref={primary} onClick={() => { onClose(); onUpload(); }} data-testid="button-welcome-upload"><FileUp /> {t('welcome.upload')}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
