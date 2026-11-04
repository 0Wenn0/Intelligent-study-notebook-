import { useRef, useState } from 'react';
import { Download, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { downloadJson, parseBackup } from '@/lib/storage';
import { type NotebookData } from '@/lib/types';
import { useNav, useNotebook } from '@/store/notebook';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/i18n';
import { LangSwitch } from './bits';

export function exportBackup(data: NotebookData) {
  downloadJson(`margin-backup-${new Date().toISOString().slice(0, 10)}.json`, { app: 'margin', exportedAt: new Date().toISOString(), data });
}

export function PrivacyDialog() {
  const { data, replaceAll, markPrivacySeen, removeDemo, restoreDemo, resetEverything } = useNotebook();
  const { privacyOpen, setPrivacyOpen } = useNav();
  const { toast } = useToast();
  const { t } = useI18n();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<NotebookData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const hasDemo = data.sources.some((s) => s.origin === 'demo');

  const onFile = async (f: File | undefined) => {
    setError(null);
    setPending(null);
    if (!f) return;
    const r = parseBackup(await f.text());
    if (r.ok) setPending(r.data);
    else setError(r.error);
  };

  const close = (o: boolean) => {
    if (!o) {
      setPrivacyOpen(false);
      setPending(null);
      setError(null);
      setConfirmReset(false);
      if (!data.prefs.privacySeen) markPrivacySeen();
    }
  };

  return (
    <Dialog open={privacyOpen} onOpenChange={close}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <div className="eyebrow">{t('settings.eyebrow')}</div>
          <DialogTitle className="font-display text-2xl font-normal">{t('settings.title')}</DialogTitle>
          <DialogDescription>{t('settings.description')}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 rounded-lg border bg-muted/40 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="eyebrow">{t('app.language')}</div>
            <LangSwitch />
          </div>
          <p className="text-xs text-muted-foreground">{t('settings.languageHint')}</p>
        </div>
        <ul className="grid gap-3 text-sm leading-relaxed">
          {(['demo', 'local', 'shared', 'noAi', 'clear'] as const).map((k) => (
            <li key={k}><strong className="font-semibold">{t(`settings.${k}Title`)}</strong> {t(`settings.${k}Body`)}</li>
          ))}
        </ul>

        <div className="grid gap-2 rounded-lg border bg-muted/40 p-4">
          <div className="eyebrow">{t('settings.backup')}</div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => exportBackup(data)} data-testid="button-export"><Download /> {t('settings.export')}</Button>
            <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} data-testid="button-import"><Upload /> {t('settings.import')}</Button>
            <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" data-testid="input-import-file" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ''; }} />
          </div>
          {error && <p className="text-sm text-destructive" data-testid="status-import-backup-error">{t('settings.rejected', { error })}</p>}
          {pending && (
            <div className="reveal mt-1 grid gap-2 text-sm">
              <p>{t('settings.valid', { sources: pending.sources.length, items: pending.items.length, sessions: pending.sessions.length })}</p>
              <div className="flex gap-2">
                <Button size="sm" variant="destructive" data-testid="button-confirm-import" onClick={() => { replaceAll(pending); setPending(null); toast({ title: t('settings.restored') }); }}>{t('settings.replace')}</Button>
                <Button size="sm" variant="ghost" onClick={() => setPending(null)}>{t('common.cancel')}</Button>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 border-t pt-4">
          {hasDemo ? (
            <Button size="sm" variant="outline" onClick={() => { removeDemo(); toast({ title: t('settings.demoRemoved') }); }} data-testid="button-remove-demo">{t('settings.removeDemo')}</Button>
          ) : (
            <Button size="sm" variant="outline" onClick={restoreDemo} data-testid="button-restore-demo">{t('settings.restoreDemo')}</Button>
          )}
          {confirmReset ? (
            <Button size="sm" variant="destructive" onClick={() => { resetEverything(); setConfirmReset(false); toast({ title: t('settings.erased') }); }} data-testid="button-confirm-reset">{t('settings.eraseConfirm')}</Button>
          ) : (
            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setConfirmReset(true)} data-testid="button-reset">{t('settings.erase')}</Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
