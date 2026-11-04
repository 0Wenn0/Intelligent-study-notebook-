import { useEffect, useMemo, useState } from 'react';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { KINDS, type Item, type Kind } from '@/lib/types';
import { analyzeClaims, trimToSource } from '@/lib/claims';
import { useNotebook } from '@/store/notebook';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/i18n';
import { ClaimText, ClaimWarning, ExcerptBlock, SectionLabel, displayBody, excerptText } from './bits';

export function ItemEditor({ item, onClose }: { item: Item | null; onClose: () => void }) {
  const { updateItem, recordWarning } = useNotebook();
  const { t } = useI18n();
  const { toast } = useToast();
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<Kind>('Concept');
  const [body, setBody] = useState('');
  const [tags, setTags] = useState('');
  const [trimmed, setTrimmed] = useState(false);
  const [initialBody, setInitialBody] = useState('');

  useEffect(() => {
    if (item) {
      const shown = displayBody(item);
      setTitle(item.title);
      setKind(item.kind);
      setBody(shown);
      setInitialBody(shown);
      setTags(item.tags.join(', '));
      setTrimmed(false);
    }
    // Initialise once per opened item id
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id]);

  const excerpt = item ? excerptText(item) : '';
  const bodyChanged = body !== initialBody;
  const templateUntouched = !!item?.generated && !item.edited && !bodyChanged && !trimmed;
  const analysis = useMemo(() => analyzeClaims(title, templateUntouched ? '' : body, excerpt), [title, body, excerpt, templateUntouched]);

  if (!item) return null;

  const trim = () => {
    const r = trimToSource(item.excerpts[0]?.text ?? excerpt);
    setTitle(r.title);
    setBody(r.body);
    setTrimmed(true);
    toast({ title: t('claims.trimmed') });
  };

  const save = () => {
    const finalTitle = title.trim() || item.title;
    const keepBody = !bodyChanged && !trimmed;
    if (analysis.hasWarning) recordWarning(item.id, analysis.signature);
    updateItem(item.id, {
      title: finalTitle,
      kind,
      body: keepBody ? item.body : body,
      tags: [...new Set(tags.split(',').map((x) => x.trim().toLowerCase().replace(/\s+/g, '-')).filter(Boolean))],
      edited: true,
      generated: keepBody ? item.generated : false,
      generatedLabel: trimmed ? finalTitle.endsWith('…') : finalTitle === item.title ? item.generatedLabel : false,
    });
    onClose();
  };

  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-normal">{t('editor.title')}</DialogTitle>
          <DialogDescription>{t('editor.description')}</DialogDescription>
        </DialogHeader>
        <div className="grid min-w-0 gap-4">
          <div>
            <SectionLabel tone="pencil">
              <span className="inline-flex items-center gap-1"><Lock className="size-3" /> {item.excerpts.length > 1 ? t('editor.lockedPlural') : t('editor.locked')}</span>
            </SectionLabel>
            <div className="grid gap-2">
              {item.excerpts.map((e, i) => (
                <ExcerptBlock key={i} excerpt={e} compact />
              ))}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
            <label className="grid min-w-0 gap-1.5 text-sm">
              <span className="eyebrow">{t('editor.fieldTitle')}</span>
              <Input data-testid="input-item-title" value={title} onChange={(e) => setTitle(e.target.value)} />
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="eyebrow">{t('editor.fieldKind')}</span>
              <Select value={kind} onValueChange={(v) => setKind(v as Kind)}>
                <SelectTrigger data-testid="select-item-kind"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {KINDS.map((k) => (
                    <SelectItem key={k} value={k}>{t(`kinds.${k}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          </div>
          <label className="grid gap-1.5 text-sm">
            <span className="eyebrow !text-[hsl(var(--pencil))]">{t('interpretation.label')}</span>
            <Textarea data-testid="input-item-body" rows={5} value={body} onChange={(e) => setBody(e.target.value)} placeholder={t('interpretation.placeholder')} className="font-serif text-[0.98rem]" />
          </label>
          <section className="grid gap-2 rounded-md border border-dashed bg-muted/30 p-3" aria-live="polite">
            <div className="eyebrow">{t('editor.check')}</div>
            <div className="break-words font-display text-lg leading-snug" data-testid="text-claim-title"><ClaimText tokens={analysis.titleTokens} /></div>
            {!templateUntouched && body && <p className="break-words font-serif text-[0.95rem] leading-relaxed" data-testid="text-claim-body"><ClaimText tokens={analysis.explanationTokens} /></p>}
            {analysis.hasWarning ? <ClaimWarning words={analysis.unsupportedWords} onTrim={trim} /> : <p className="text-xs text-[hsl(var(--sage))]">{t('claims.clean')}</p>}
          </section>
          <label className="grid gap-1.5 text-sm">
            <span className="eyebrow">{t('editor.fieldTags')}</span>
            <Input data-testid="input-item-tags" value={tags} onChange={(e) => setTags(e.target.value)} />
          </label>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={onClose} data-testid="button-cancel-edit">{t('common.cancel')}</Button>
          <Button onClick={save} data-testid="button-save-edit">{t('editor.saveChanges')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
