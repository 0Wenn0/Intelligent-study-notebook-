import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronRight, Pencil, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import type { Item } from '@/lib/types';
import { analyzeClaims } from '@/lib/claims';
import { useNotebook } from '@/store/notebook';
import { useI18n } from '@/i18n';
import { ClaimText, ClaimWarning, DemoMark, ExcerptBlock, GeneratedLabelMark, KindBadge, SectionLabel, claimExplanation, displayBody, excerptText, titleIsQuote } from './bits';
import { cn } from '@/lib/utils';

interface Props {
  items: Item[];
  onApprove: (id: string) => void;
  onDiscard: (id: string) => void;
  onEdit: (item: Item) => void;
  editing: boolean;
}

export function FocusedReview({ items, onApprove, onDiscard, onEdit, editing }: Props) {
  const { updateItem, recordWarning } = useNotebook();
  const { t } = useI18n();
  const [skipped, setSkipped] = useState<string[]>([]);
  const queue = items.filter((i) => !skipped.includes(i.id));
  const item = queue[0] ?? items[0];
  const [checks, setChecks] = useState({ accurate: false, worthwhile: false });

  // Checks reset per candidate
  useEffect(() => {
    setChecks({ accurate: false, worthwhile: false });
  }, [item?.id]);

  const analysis = useMemo(() => (item ? analyzeClaims(item.title, claimExplanation(item), excerptText(item)) : null), [item]);

  useEffect(() => {
    if (item && analysis?.hasWarning) recordWarning(item.id, analysis.signature);
    // keyed by signature; the store de-duplicates
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysis?.signature, item?.id]);

  const persisted = item?.reviewChecks;
  const canApprove = !!item && checks.accurate && checks.worthwhile && !!persisted?.accurate && !!persisted?.worthwhile;

  const setCheck = (k: 'accurate' | 'worthwhile', v: boolean) => {
    if (!item) return;
    const next = { ...checks, [k]: v };
    setChecks(next);
    updateItem(item.id, { reviewChecks: next });
  };

  const act = useRef({ approve: () => {}, edit: () => {}, discard: () => {} });
  act.current = {
    approve: () => item && canApprove && onApprove(item.id),
    edit: () => item && onEdit(item),
    discard: () => item && onDiscard(item.id),
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (editing || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || el.closest('[role="dialog"],[role="alertdialog"],[role="listbox"],[role="menu"]'))) return;
      if (document.querySelector('[role="dialog"],[role="alertdialog"]')) return;
      const k = e.key.toLowerCase();
      if (k === 'a') { e.preventDefault(); act.current.approve(); }
      else if (k === 'e') { e.preventDefault(); act.current.edit(); }
      else if (k === 'd') { e.preventDefault(); act.current.discard(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editing]);

  if (!item || !analysis) return null;
  const position = items.findIndex((i) => i.id === item.id) + 1;
  const showBody = displayBody(item);
  const isTemplate = item.generated && !item.edited;

  return (
    <article key={item.id} className="reveal mx-auto max-w-2xl rounded-xl border bg-card p-5 shadow-md md:p-7" data-testid={`card-focused-${item.id}`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <KindBadge kind={item.kind} />
          <DemoMark item={item} />
          <GeneratedLabelMark item={item} />
        </div>
        <span className="font-mono text-xs text-muted-foreground" data-testid="text-focused-position">{t('review.candidateOf', { n: position, total: items.length })}</span>
      </div>

      <SectionLabel>{t('common.sourceExcerpt')} · {t('common.exactWords')}</SectionLabel>
      <div className="grid gap-2">{item.excerpts.map((e, k) => <ExcerptBlock key={k} excerpt={e} />)}</div>

      <div className="mt-6 border-t border-dashed pt-5">
        {!titleIsQuote(item) && (
          <>
            <SectionLabel>{t('review.title_label')}</SectionLabel>
            <h3 className="break-words font-display text-2xl leading-snug" data-testid="text-focused-title"><ClaimText tokens={analysis.titleTokens} /></h3>
          </>
        )}
        {showBody && (
          <div className="mt-4">
            <SectionLabel tone={item.generated ? 'pencil' : 'ink'}>{item.generated ? (item.kind === 'Question' ? t('templates.investigationLabel') : t('interpretation.generated')) : t('interpretation.yours')}</SectionLabel>
            <p className={cn('break-words whitespace-pre-line leading-relaxed', isTemplate && 'italic text-muted-foreground')}>
              {isTemplate ? showBody : <ClaimText tokens={analysis.explanationTokens} />}
            </p>
          </div>
        )}
        {!showBody && <p className="mt-3 text-sm text-muted-foreground">{t('interpretation.none')}</p>}
        {analysis.hasWarning && <div className="mt-4"><ClaimWarning words={analysis.unsupportedWords} /></div>}
      </div>

      <fieldset className="mt-6 grid gap-2 rounded-lg bg-muted/50 p-4">
        {(['accurate', 'worthwhile'] as const).map((k) => (
          <label key={k} className="flex cursor-pointer items-start gap-3 text-sm">
            <Checkbox checked={checks[k]} onCheckedChange={(v) => setCheck(k, v === true)} className="mt-0.5" data-testid={`checkbox-check-${k}`} />
            <span>{k === 'accurate' ? t('review.checkAccurate') : t('review.checkWorthwhile')}</span>
          </label>
        ))}
      </fieldset>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Button onClick={() => act.current.approve()} disabled={!canApprove} title={!canApprove ? t('review.checksNeeded') : undefined} data-testid="button-focused-approve"><Check /> {t('review.approve')} <kbd className="ml-1 font-mono text-[10px] opacity-70">A</kbd></Button>
        <Button variant="outline" onClick={() => act.current.edit()} data-testid="button-focused-edit"><Pencil /> {t('review.edit')} <kbd className="ml-1 font-mono text-[10px] opacity-70">E</kbd></Button>
        <Button variant="ghost" onClick={() => act.current.discard()} data-testid="button-focused-discard"><X /> {t('review.discard')} <kbd className="ml-1 font-mono text-[10px] opacity-70">D</kbd></Button>
        {queue.length > 1 && (
          <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setSkipped((s) => [...s, item.id])} data-testid="button-focused-skip">{t('review.skip')} <ChevronRight /></Button>
        )}
      </div>
      {!canApprove && <p className="mt-2 text-xs text-muted-foreground">{t('review.checksNeeded')}</p>}
      <p className="mt-4 font-mono text-[11px] text-muted-foreground">{t('review.shortcuts')}</p>
    </article>
  );
}
