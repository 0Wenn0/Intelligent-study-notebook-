import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { downloadJson } from '@/lib/storage';
import { useNotebook } from '@/store/notebook';
import { exportBackup } from './privacy-dialog';
import { useI18n } from '@/i18n';

export function StorageBanner() {
  const { status, data, resetEverything } = useNotebook();
  const { t } = useI18n();
  if (status.state === 'ok') return null;
  return (
    <div role="alert" data-testid="status-storage" className="flex flex-wrap items-center gap-3 border-b border-destructive/30 bg-destructive/[0.07] px-5 py-3 text-sm text-destructive">
      <AlertTriangle className="size-4 shrink-0" />
      <span className="flex-1 min-w-[220px]">
        {status.messageKey && status.messageKey !== 'storage.saveFailed' ? t(status.messageKey) : status.message}
        {status.state === 'corrupt' && ` ${t('storage.corruptSuffix')}`}
      </span>
      {status.state === 'corrupt' ? (
        <>
          <Button size="sm" variant="outline" onClick={() => downloadJson('margin-unreadable-data.json', { raw: status.raw })} data-testid="button-download-raw">{t('storage.downloadRaw')}</Button>
          <Button size="sm" variant="destructive" onClick={resetEverything} data-testid="button-start-fresh">{t('storage.startFresh')}</Button>
        </>
      ) : (
        <Button size="sm" variant="outline" onClick={() => exportBackup(data)} data-testid="button-export-banner">{t('storage.exportBackup')}</Button>
      )}
    </div>
  );
}
