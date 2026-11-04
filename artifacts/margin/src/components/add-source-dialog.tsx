import { useRef, useState } from 'react';
import { FileUp, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { extractCandidates, textToPages } from '@/lib/extract';
import { extractPdfPages, ImportProblem } from '@/lib/pdf';
import { type Page, uid } from '@/lib/types';
import { useNav, useNotebook } from '@/store/notebook';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';

type Result = { ok: true; title: string; count: number; pages: number } | { ok: false; message: string };

export function AddSourceDialog() {
  const { addSource } = useNotebook();
  const { addOpen, setAddOpen, go } = useNav();
  const { t } = useI18n();
  const [mode, setMode] = useState<'file' | 'paste'>('file');
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setTitle('');
    setTopic('');
    setText('');
    setFile(null);
    setResult(null);
    setBusy(false);
  };

  const close = () => {
    setAddOpen(false);
    setTimeout(reset, 200);
  };

  const run = async () => {
    setBusy(true);
    setResult(null);
    try {
      let pages: Page[];
      let name = title.trim();
      if (mode === 'paste') {
        if (!text.trim()) throw new ImportProblem(t('add.errPaste'));
        pages = textToPages(text);
      } else {
        if (!file) throw new ImportProblem(t('add.errChoose'));
        const ext = file.name.toLowerCase().split('.').pop();
        if (ext === 'pdf' || file.type === 'application/pdf') pages = await extractPdfPages(file);
        else if (ext === 'txt' || ext === 'md' || ext === 'markdown' || file.type.startsWith('text/')) {
          const raw = await file.text();
          if (!raw.trim()) throw new ImportProblem(t('add.errEmpty'));
          pages = textToPages(raw);
        } else throw new ImportProblem(t('add.errType', { ext: ext ?? '' }));
        if (!name) name = file.name.replace(/\.[^.]+$/, '');
      }
      if (!name) name = t('add.untitled');
      const id = uid('src');
      const candidates = extractCandidates(id, pages, topic || name);
      addSource({ id, title: name, topic: topic.trim() || t('add.general'), pages, createdAt: new Date().toISOString(), origin: 'user', fileName: file?.name }, candidates);
      setResult({ ok: true, title: name, count: candidates.length, pages: pages.length });
    } catch (e) {
      setResult({ ok: false, message: e instanceof ImportProblem ? e.message : t('add.errGeneric') });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={addOpen} onOpenChange={(o) => (o ? setAddOpen(true) : close())}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <div className="eyebrow">{t('add.eyebrow')}</div>
          <DialogTitle className="font-display text-2xl font-normal">{t('add.title')}</DialogTitle>
          <DialogDescription>{t('add.description')}</DialogDescription>
        </DialogHeader>

        {result?.ok ? (
          <div className="reveal grid gap-3 py-2" data-testid="status-import-result">
            <div className="font-display text-xl">{result.title}</div>
            <p className="text-sm text-muted-foreground">
              {t('add.readPages', { count: result.pages })}{' '}
              {result.count > 0 ? t('add.found', { count: result.count }) : t('add.foundNone')}
            </p>
            <DialogFooter className="mt-2">
              <Button variant="ghost" onClick={reset} data-testid="button-add-another">{t('add.addAnother')}</Button>
              {result.count > 0 ? (
                <Button onClick={() => { close(); go('review'); }} data-testid="button-go-review">{t('add.openReview')}</Button>
              ) : (
                <Button onClick={() => { close(); go('sources'); }} data-testid="button-go-sources">{t('add.viewSource')}</Button>
              )}
            </DialogFooter>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 rounded-md bg-muted p-1 text-sm">
              {(['file', 'paste'] as const).map((m) => (
                <button key={m} type="button" data-testid={`tab-add-${m}`} onClick={() => setMode(m)} className={cn('rounded px-3 py-1.5 transition', mode === m ? 'bg-card shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
                  {m === 'file' ? t('add.tabFile') : t('add.tabPaste')}
                </button>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1.5"><span className="eyebrow">{t('add.fieldTitle')} {mode === 'file' && t('add.optional')}</span>
                <Input data-testid="input-source-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t('add.titlePlaceholder')} />
              </label>
              <label className="grid gap-1.5"><span className="eyebrow">{t('add.fieldTopic')}</span>
                <Input data-testid="input-source-topic" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder={t('add.topicPlaceholder')} />
              </label>
            </div>
            {mode === 'paste' ? (
              <label className="grid gap-1.5"><span className="eyebrow">{t('add.fieldText')}</span>
                <Textarea data-testid="input-source-text" rows={8} value={text} onChange={(e) => setText(e.target.value)} className="font-serif" placeholder={t('add.textPlaceholder')} />
              </label>
            ) : (
              <button type="button" data-testid="button-choose-file" onClick={() => fileRef.current?.click()} className="group grid place-items-center gap-2 rounded-lg border border-dashed border-input bg-card px-4 py-8 text-center transition hover:border-primary/60 hover:bg-primary/5">
                <FileUp className="size-6 text-primary transition group-hover:-translate-y-0.5" />
                <span className="text-sm">{file ? file.name : t('add.choose')}</span>
                <span className="text-xs text-muted-foreground">{t('add.chooseHint')}</span>
                <input ref={fileRef} type="file" accept=".pdf,.txt,.md,.markdown,application/pdf,text/plain,text/markdown" className="hidden" data-testid="input-source-file" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setResult(null); }} />
              </button>
            )}
            {result && !result.ok && (
              <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive" data-testid="status-import-error">{result.message}</p>
            )}
            <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
              <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-[hsl(var(--sage))]" />
              {t('add.privacy')}
            </p>
            <DialogFooter>
              <Button variant="ghost" onClick={close} data-testid="button-cancel-add">{t('common.cancel')}</Button>
              <Button onClick={run} disabled={busy} data-testid="button-extract">{busy ? t('add.reading') : t('add.extract')}</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
