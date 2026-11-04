import { useMemo, useState } from 'react';
import { ArrowLeft, BookOpen, Pencil, Search, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { KINDS, type Item, type Source } from '@/lib/types';
import { isDue, orderItems } from '@/lib/study';
import { useNav, useNotebook } from '@/store/notebook';
import { useI18n } from '@/i18n';
import { DemoMark, Empty, ExcerptBlock, GeneratedLabelMark, Interpretation, KindBadge, PageHeader, SectionLabel, displayBody, titleIsQuote } from '@/components/bits';
import { ItemEditor } from '@/components/item-editor';
import { cn } from '@/lib/utils';

type Tab = 'notes' | 'howto' | 'summary';

interface PageHit { source: Source; page: number; before: string; match: string; after: string }

function searchPages(sources: Source[], needle: string): PageHit[] {
  const hits: PageHit[] = [];
  if (needle.length < 2) return hits;
  for (const s of sources) {
    for (const p of s.pages) {
      const at = p.text.toLowerCase().indexOf(needle);
      if (at < 0) continue;
      const start = Math.max(0, at - 70);
      const end = Math.min(p.text.length, at + needle.length + 90);
      hits.push({
        source: s,
        page: p.page,
        before: (start > 0 ? '…' : '') + p.text.slice(start, at),
        match: p.text.slice(at, at + needle.length),
        after: p.text.slice(at + needle.length, end) + (end < p.text.length ? '…' : ''),
      });
    }
  }
  return hits;
}

export default function Library() {
  const { data } = useNotebook();
  const { focusItemId, go } = useNav();
  const { t } = useI18n();
  const approved = useMemo(() => orderItems(data.items.filter((i) => i.status === 'approved'), data.sources), [data.items, data.sources]);
  const howtoFirst = data.sources.some((s) => s.priorities?.includes('howto')) && approved.some((i) => i.kind === 'How-to' || i.kind === 'Process');
  const [tab, setTab] = useState<Tab>(focusItemId ? 'notes' : howtoFirst ? 'howto' : 'notes');
  const [q, setQ] = useState('');
  const [kind, setKind] = useState('all');
  const [tag, setTag] = useState('all');
  const [openId, setOpenId] = useState<string | null>(focusItemId);

  const tags = useMemo(() => [...new Set(approved.flatMap((i) => i.tags))].sort(), [approved]);
  const needle = q.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      approved.filter(
        (i) =>
          (kind === 'all' || i.kind === kind) &&
          (tag === 'all' || i.tags.includes(tag)) &&
          (!needle || [i.title, i.body, displayBody(i), i.tags.join(' '), ...i.excerpts.map((e) => e.text)].join(' ').toLowerCase().includes(needle)),
      ),
    [approved, needle, kind, tag],
  );
  const pageHits = useMemo(() => searchPages(data.sources, needle), [data.sources, needle]);
  const open = approved.find((i) => i.id === openId);

  const searchBar = (
    <div className="mb-6 flex flex-wrap gap-2">
      <div className="relative min-w-0 flex-[1_1_220px]">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('library.searchPlaceholder')} aria-label={t('library.searchPlaceholder')} className="pl-9" data-testid="input-search" />
      </div>
      {approved.length > 0 && (
        <>
          <Select value={kind} onValueChange={setKind}>
            <SelectTrigger className="w-[calc(50%-4px)] sm:w-[160px]" data-testid="select-kind" aria-label={t('library.allKinds')}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('library.allKinds')}</SelectItem>
              {KINDS.map((k) => <SelectItem key={k} value={k}>{t(`kinds.${k}`)}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={tag} onValueChange={setTag}>
            <SelectTrigger className="w-[calc(50%-4px)] sm:w-[160px]" data-testid="select-tag" aria-label={t('library.allTags')}><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('library.allTags')}</SelectItem>
              {tags.map((x) => <SelectItem key={x} value={x}>#{x}</SelectItem>)}
            </SelectContent>
          </Select>
        </>
      )}
    </div>
  );

  if (approved.length === 0) {
    return (
      <div>
        <PageHeader eyebrow={t('library.eyebrow')} title={t('library.emptyHeader')} />
        <Empty title={t('library.emptyTitle')} action={<Button onClick={() => go('review')}>{t('library.openReview')}</Button>}>{t('library.emptyBody')}</Empty>
        <div className="mt-8">{searchBar}</div>
        {needle && <PageResults hits={pageHits} q={q.trim()} />}
      </div>
    );
  }

  const tabs: [Tab, string][] = [['notes', t('library.tabNotes')], ['howto', t('library.tabHowto')], ['summary', t('library.tabSummary')]];
  if (howtoFirst) tabs.unshift(tabs.splice(1, 1)[0]);

  return (
    <div>
      <PageHeader eyebrow={t('library.eyebrow')} title={t('library.title')}>{t('library.count', { count: approved.length })}</PageHeader>
      <div className="mb-6 flex flex-wrap gap-1 border-b" role="tablist">
        {tabs.map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} data-testid={`tab-library-${id}`} className={cn('-mb-px border-b-2 px-3 py-2 text-sm transition', tab === id ? 'border-[hsl(var(--pencil))] text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground')}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'notes' && (open ? (
        <ItemDetail item={open} onBack={() => setOpenId(null)} />
      ) : (
        <>
          {searchBar}
          {needle && <SectionLabel>{t('library.notesHeading')}</SectionLabel>}
          {filtered.length === 0 ? (
            <Empty title={t('library.noMatches')}>{t('library.noMatchesBody', { q: q.trim() })}</Empty>
          ) : (
            <ul className="grid gap-3 md:grid-cols-2">
              {filtered.map((it, i) => (
                <li key={it.id} className="reveal min-w-0" style={{ animationDelay: `${Math.min(i, 12) * 25}ms` }}>
                  <button type="button" onClick={() => setOpenId(it.id)} data-testid={`card-library-${it.id}`} className="group h-full w-full rounded-lg border bg-card p-5 text-left transition hover:-translate-y-0.5 hover:shadow-md">
                    <div className="mb-2 flex flex-wrap gap-2"><KindBadge kind={it.kind} /><DemoMark item={it} />{isDue(it) && <span className="font-mono text-[10px] uppercase tracking-wider text-[hsl(var(--pencil))]">{t('library.due')}</span>}</div>
                    <h3 className="break-words font-display text-lg leading-snug group-hover:text-primary">{it.title}</h3>
                    <p className="mt-2 line-clamp-3 break-words font-serif text-sm leading-relaxed text-muted-foreground">"{it.excerpts[0].text}"</p>
                    <div className="mt-3 font-mono text-[11px] text-muted-foreground">{it.excerpts.map((e) => t('common.page', { page: e.page })).join(', ')} · {t(`understandingLevels.${it.understanding}`)}</div>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {needle && <div className="mt-10"><PageResults hits={pageHits} q={q.trim()} /></div>}
        </>
      ))}

      {tab === 'howto' && <HowTo items={approved} />}
      {tab === 'summary' && <Summaries items={approved} />}
    </div>
  );
}

function PageResults({ hits, q }: { hits: PageHit[]; q: string }) {
  const { openSourcePage } = useNav();
  const { t } = useI18n();
  return (
    <section data-testid="section-page-results">
      <SectionLabel>{t('library.pagesHeading')} · {t('library.pageHits', { count: hits.length })}</SectionLabel>
      {hits.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('library.noPageHits', { q })}</p>
      ) : (
        <ul className="grid gap-2">
          {hits.map((h) => (
            <li key={`${h.source.id}-${h.page}`}>
              <button type="button" onClick={() => openSourcePage(h.source.id, h.page, h.match)} data-testid={`button-page-hit-${h.source.id}-${h.page}`} className="group grid w-full gap-1 rounded-lg border bg-card px-4 py-3 text-left transition hover:border-primary/40">
                <span className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-muted-foreground">
                  <BookOpen className="size-3 text-primary" />
                  <span className="min-w-0 break-words">{h.source.title}</span>
                  <span className="text-[hsl(var(--pencil))]">{t('common.page', { page: h.page })}</span>
                </span>
                <span className="break-words font-serif text-[0.95rem] leading-relaxed text-foreground/85">
                  {h.before}<mark className="rounded-sm bg-[hsl(var(--highlight))] px-0.5 text-foreground">{h.match}</mark>{h.after}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ItemDetail({ item, onBack }: { item: Item; onBack: () => void }) {
  const { setItemsStatus } = useNotebook();
  const { t, formatDate } = useI18n();
  const [editing, setEditing] = useState(false);
  return (
    <article className="reveal max-w-3xl" data-testid={`detail-item-${item.id}`}>
      <Button variant="ghost" size="sm" className="mb-4 -ml-2" onClick={onBack} data-testid="button-back-library"><ArrowLeft /> {t('library.allNotes')}</Button>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <KindBadge kind={item.kind} /><DemoMark item={item} /><GeneratedLabelMark item={item} />
        <span className="font-mono text-[11px] text-muted-foreground">{t('library.understanding', { level: t(`understandingLevels.${item.understanding}`) })}</span>
        <span className="font-mono text-[11px] text-muted-foreground">· {isDue(item) || !item.dueAt ? t('library.due') : t('library.dueOn', { date: formatDate(item.dueAt) })}</span>
      </div>
      <h2 className="break-words font-display text-3xl leading-tight md:text-4xl">{item.title}</h2>

      <section className="mt-6">
        <SectionLabel>{item.excerpts.length > 1 ? t('common.sourceExcerpts', { count: item.excerpts.length }) : t('common.sourceExcerpt')} · {t('common.exactWords')}</SectionLabel>
        <div className="grid gap-3">{item.excerpts.map((e, i) => <ExcerptBlock key={i} excerpt={e} />)}</div>
      </section>

      <section className="mt-6 rounded-lg border-l-2 border-primary/60 bg-primary/[0.04] px-5 py-4">
        {displayBody(item) ? <Interpretation item={item} /> : <p className="text-sm text-muted-foreground">{t('interpretation.none')}</p>}
      </section>

      {item.tags.length > 0 && <div className="mt-5 flex flex-wrap gap-2">{item.tags.map((x) => <span key={x} className="rounded-sm bg-muted px-2 py-0.5 font-mono text-xs">#{x}</span>)}</div>}
      <div className="mt-8 flex flex-wrap gap-2 border-t pt-4">
        <Button variant="outline" size="sm" onClick={() => setEditing(true)} data-testid="button-edit-detail"><Pencil /> {t('review.edit')}</Button>
        <Button variant="ghost" size="sm" onClick={() => { setItemsStatus([item.id], 'pending'); onBack(); }} data-testid="button-unapprove"><Undo2 /> {t('library.unapprove')}</Button>
      </div>
      <ItemEditor item={editing ? item : null} onClose={() => setEditing(false)} />
    </article>
  );
}

function sourceOrder(items: Item[], sourceIds: string[]) {
  return [...items].sort((a, b) => {
    const ea = a.excerpts[0], eb = b.excerpts[0];
    return sourceIds.indexOf(ea.sourceId) - sourceIds.indexOf(eb.sourceId) || ea.page - eb.page;
  });
}

function HowTo({ items }: { items: Item[] }) {
  const { data } = useNotebook();
  const { t } = useI18n();
  const ids = data.sources.map((s) => s.id);
  const steps = sourceOrder(items.filter((i) => i.kind === 'How-to' || i.kind === 'Process'), ids);
  if (!steps.length) return <Empty title={t('library.howtoNone')}>{t('library.howtoNoneBody')}</Empty>;
  const groups = data.sources.map((s) => ({ s, steps: steps.filter((i) => i.excerpts[0].sourceId === s.id) })).filter((g) => g.steps.length);
  return (
    <div className="grid gap-10">
      <p className="max-w-2xl rounded-md border border-dashed border-[hsl(var(--pencil)/0.4)] px-4 py-3 text-sm text-muted-foreground">
        <span className="eyebrow !text-[hsl(var(--pencil))]">{t('templates.generatedArrangement')}</span><br />
        {t('library.howtoNote')}
      </p>
      {groups.map(({ s, steps }) => (
        <section key={s.id}>
          <h3 className="mb-4 break-words font-display text-2xl">{s.title}</h3>
          <ol className="grid gap-5">
            {steps.map((it, n) => (
              <li key={it.id} className="grid grid-cols-[28px_1fr] gap-3 md:grid-cols-[36px_1fr]">
                <span className="font-display text-2xl text-[hsl(var(--pencil))]">{n + 1}</span>
                <div className="min-w-0">
                  {!titleIsQuote(it) && <div className="mb-2 break-words font-medium">{it.title}</div>}
                  {it.excerpts.map((e, k) => <ExcerptBlock key={k} excerpt={e} compact />)}
                </div>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}

function Summaries({ items }: { items: Item[] }) {
  const { data } = useNotebook();
  const { openSourcePage } = useNav();
  const { t } = useI18n();
  return (
    <div className="grid gap-12">
      <p className="max-w-2xl text-sm text-muted-foreground">{t('library.summaryNote')}</p>
      {data.sources.map((s) => {
        const ex = items.flatMap((i) => i.excerpts.filter((e) => e.sourceId === s.id)).sort((a, b) => a.page - b.page);
        const unique = ex.filter((e, i) => ex.findIndex((x) => x.text === e.text) === i);
        return (
          <section key={s.id} data-testid={`summary-${s.id}`}>
            <div className="eyebrow">{s.origin === 'demo' ? t('sourcePage.demo') : t('sourcePage.yours')} · {t('library.summaryCount', { count: unique.length })}</div>
            <h3 className="mt-1 mb-4 break-words font-display text-2xl">{s.title}</h3>
            {unique.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('library.summaryNone')}</p>
            ) : (
              <div className="max-w-[68ch] break-words font-serif text-[1.05rem] leading-[1.85]">
                {unique.map((e, i) => (
                  <span key={i}>
                    {e.text}{' '}
                    <button type="button" onClick={() => openSourcePage(e.sourceId, e.page, e.text)} className="align-super font-mono text-[10px] text-[hsl(var(--pencil))] hover:underline" data-testid={`button-summary-cite-${s.id}-${i}`}>{t('common.page', { page: e.page })}</button>{' '}
                  </span>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
