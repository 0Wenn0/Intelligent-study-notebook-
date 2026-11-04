import { useMemo, useState } from 'react';
import { Check, Combine, LayoutList, Pencil, RotateCcw, Square, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ToastAction } from '@/components/ui/toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { Item } from '@/lib/types';
import { orderItems } from '@/lib/study';
import { useNav, useNotebook } from '@/store/notebook';
import { useI18n } from '@/i18n';
import { DemoMark, Empty, ExcerptBlock, GeneratedLabelMark, Interpretation, KindBadge, PageHeader, SectionLabel } from '@/components/bits';
import { ItemEditor } from '@/components/item-editor';
import { FocusedReview } from '@/components/focused-review';
import { cn } from '@/lib/utils';

const checked = (i: Item) => !!i.reviewChecks?.accurate && !!i.reviewChecks?.worthwhile;

export default function Review() {
  const { data, setItemsStatus, mergeItems, restoreItems, updateItem } = useNotebook();
  const { setAddOpen, go } = useNav();
  const { t } = useI18n();
  const { toast } = useToast();
  const [tab, setTab] = useState<'pending' | 'discarded'>('pending');
  const [mode, setMode] = useState<'focused' | 'list'>('focused');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [selected, setSelected] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const editing = data.items.find((i) => i.id === editingId) ?? null;

  const list = useMemo(
    () => orderItems(data.items.filter((i) => i.status === tab && (sourceFilter === 'all' || i.excerpts.some((e) => e.sourceId === sourceFilter))), data.sources),
    [data.items, data.sources, tab, sourceFilter],
  );
  const counts = { pending: data.items.filter((i) => i.status === 'pending').length, discarded: data.items.filter((i) => i.status === 'discarded').length };

  const undoAction = (snap: Item[]) => <ToastAction altText={t('common.undo')} data-testid="button-undo" onClick={() => restoreItems(snap)}>{t('common.undo')}</ToastAction>;

  const withUndo = (ids: string[], label: string, act: () => void, extra?: string) => {
    const snap = data.items;
    act();
    setSelected((s) => s.filter((x) => !ids.includes(x)));
    toast({ title: label, description: extra, action: undoAction(snap) });
  };

  const approve = (ids: string[]) => {
    const ok = ids.filter((id) => { const it = data.items.find((i) => i.id === id); return it && checked(it); });
    const skipped = ids.length - ok.length;
    if (!ok.length) { toast({ title: t('review.checksNeeded') }); return; }
    withUndo(ok, t('review.approved', { count: ok.length }), () => setItemsStatus(ok, 'approved'), skipped ? t('review.skipped', { count: skipped }) : undefined);
  };
  const discard = (ids: string[]) => withUndo(ids, t('review.discardedToast', { count: ids.length }), () => setItemsStatus(ids, 'discarded'));
  const restore = (ids: string[]) => withUndo(ids, t('review.restored', { count: ids.length }), () => setItemsStatus(ids, 'pending'));
  const merge = () => {
    const snap = data.items;
    const m = mergeItems(selected);
    if (!m) return;
    setSelected([m.id]);
    toast({ title: t('review.merged', { count: m.excerpts.length }), action: <ToastAction altText={t('common.undo')} onClick={() => { restoreItems(snap); setSelected([]); }}>{t('common.undo')}</ToastAction> });
  };
  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const allSel = list.length > 0 && list.every((i) => selected.includes(i.id));
  const setCheck = (it: Item, k: 'accurate' | 'worthwhile', v: boolean) =>
    updateItem(it.id, { reviewChecks: { accurate: it.reviewChecks?.accurate ?? false, worthwhile: it.reviewChecks?.worthwhile ?? false, [k]: v } });
  const focused = tab === 'pending' && mode === 'focused';

  return (
    <div>
      <PageHeader eyebrow={t('review.eyebrow')} title={t('review.title')}>{t('review.intro')}</PageHeader>

      <div className="sticky top-[104px] z-20 -mx-2 mb-6 flex flex-wrap items-center gap-2 rounded-lg border bg-background/90 px-3 py-2 backdrop-blur md:top-0">
        <div className="flex rounded-md bg-muted p-0.5 text-sm">
          {(['pending', 'discarded'] as const).map((x) => (
            <button key={x} type="button" aria-pressed={tab === x} onClick={() => { setTab(x); setSelected([]); }} data-testid={`tab-${x}`} className={cn('rounded px-3 py-1 transition', tab === x ? 'bg-card shadow-sm' : 'text-muted-foreground')}>
              {t(`review.${x}`)} <span className="font-mono text-xs opacity-70">{counts[x]}</span>
            </button>
          ))}
        </div>
        {tab === 'pending' && (
          <div className="flex rounded-md bg-muted p-0.5 text-sm">
            {(['focused', 'list'] as const).map((m) => (
              <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)} data-testid={`tab-mode-${m}`} className={cn('inline-flex items-center gap-1.5 rounded px-3 py-1 transition', mode === m ? 'bg-card shadow-sm' : 'text-muted-foreground')}>
                {m === 'focused' ? <Square className="size-3.5" /> : <LayoutList className="size-3.5" />}
                {m === 'focused' ? t('review.modeFocused') : t('review.modeList')}
              </button>
            ))}
          </div>
        )}
        <Select value={sourceFilter} onValueChange={setSourceFilter}>
          <SelectTrigger className="h-8 w-full min-w-0 sm:w-[200px]" data-testid="select-review-source" aria-label={t('review.allSources')}><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('review.allSources')}</SelectItem>
            {data.sources.map((s) => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}
          </SelectContent>
        </Select>
        {!focused && list.length > 0 && (
          <label className="ml-1 flex items-center gap-2 text-sm text-muted-foreground">
            <Checkbox checked={allSel} onCheckedChange={() => setSelected(allSel ? [] : list.map((i) => i.id))} data-testid="checkbox-select-all" /> {t('common.all')}
          </label>
        )}
        {!focused && (
          <div className="ml-auto flex flex-wrap gap-1.5">
            {selected.length > 0 && <span className="self-center pr-1 font-mono text-xs text-muted-foreground">{t('common.selected', { count: selected.length })}</span>}
            {tab === 'pending' ? (
              <>
                <Button size="sm" disabled={!selected.length} onClick={() => approve(selected)} data-testid="button-approve-selected"><Check /> {t('review.approve')}</Button>
                <Button size="sm" variant="outline" disabled={selected.length < 2} onClick={merge} data-testid="button-merge-selected"><Combine /> {t('review.merge')}</Button>
                <Button size="sm" variant="ghost" disabled={!selected.length} onClick={() => discard(selected)} data-testid="button-discard-selected"><X /> {t('review.discard')}</Button>
              </>
            ) : (
              <Button size="sm" variant="outline" disabled={!selected.length} onClick={() => restore(selected)} data-testid="button-restore-selected"><RotateCcw /> {t('review.restore')}</Button>
            )}
          </div>
        )}
      </div>

      {list.length === 0 ? (
        tab === 'pending' ? (
          <Empty title={t('review.inboxClear')} action={<><Button onClick={() => setAddOpen(true)}>{t('review.importSource')}</Button><Button variant="outline" onClick={() => go('library')}>{t('review.openLibrary')}</Button></>}>
            {t('review.inboxClearBody')}
          </Empty>
        ) : (
          <Empty title={t('review.noDiscarded')}>{t('review.noDiscardedBody')}</Empty>
        )
      ) : focused ? (
        <>
          <p className="mb-3 text-center font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{t('review.orderedBy')}</p>
          <FocusedReview items={list} onApprove={(id) => approve([id])} onDiscard={(id) => discard([id])} onEdit={(it) => setEditingId(it.id)} editing={!!editing} />
        </>
      ) : (
        <ul className="grid gap-4">
          {list.map((it, i) => (
            <li key={it.id} className="reveal" style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }}>
              <article data-testid={`card-review-${it.id}`} className={cn('grid gap-4 rounded-lg border bg-card p-4 transition md:grid-cols-[24px_1fr_auto] md:p-5', selected.includes(it.id) && 'border-primary/50 ring-1 ring-primary/20')}>
                <Checkbox checked={selected.includes(it.id)} onCheckedChange={() => toggle(it.id)} className="mt-1" aria-label={it.title} data-testid={`checkbox-item-${it.id}`} />
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <KindBadge kind={it.kind} />
                    <DemoMark item={it} />
                    <GeneratedLabelMark item={it} />
                    {it.mergedFrom && <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{t('review.mergedBadge', { count: it.excerpts.length })}</span>}
                    {it.edited && <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{t('common.edited')}</span>}
                  </div>
                  <div className="grid gap-2">
                    <SectionLabel>{t('common.sourceExcerpt')}</SectionLabel>
                    {it.excerpts.map((e, k) => <ExcerptBlock key={k} excerpt={e} compact />)}
                  </div>
                  <h3 className="mt-3 break-words font-display text-xl leading-snug">{it.title}</h3>
                  <Interpretation item={it} className="mt-3" />
                  {it.tags.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{it.tags.map((x) => <span key={x} className="font-mono text-[11px] text-muted-foreground">#{x}</span>)}</div>}
                  {tab === 'pending' && (
                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
                      {(['accurate', 'worthwhile'] as const).map((k) => (
                        <label key={k} className="flex cursor-pointer items-center gap-2">
                          <Checkbox checked={!!it.reviewChecks?.[k]} onCheckedChange={(v) => setCheck(it, k, v === true)} data-testid={`checkbox-${k}-${it.id}`} />
                          {k === 'accurate' ? t('review.checkAccurate') : t('review.checkWorthwhile')}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 md:flex-col">
                  {tab === 'pending' ? (
                    <>
                      <Button size="sm" disabled={!checked(it)} title={!checked(it) ? t('review.checksNeeded') : undefined} onClick={() => approve([it.id])} data-testid={`button-approve-${it.id}`}><Check /> {t('review.approve')}</Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingId(it.id)} data-testid={`button-edit-${it.id}`}><Pencil /> {t('review.edit')}</Button>
                      <Button size="sm" variant="ghost" onClick={() => discard([it.id])} data-testid={`button-discard-${it.id}`}><X /> {t('review.discard')}</Button>
                    </>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => restore([it.id])} data-testid={`button-restore-${it.id}`}><RotateCcw /> {t('review.restore')}</Button>
                  )}
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}
      <ItemEditor item={editing} onClose={() => setEditingId(null)} />
    </div>
  );
}
