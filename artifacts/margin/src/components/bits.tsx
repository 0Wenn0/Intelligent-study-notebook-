import { AlertTriangle, BookOpen, Scissors } from 'lucide-react';
import type { ReactNode } from 'react';
import type { Excerpt, Item, Kind } from '@/lib/types';
import type { ClaimToken } from '@/lib/claims';
import { useNav, useNotebook } from '@/store/notebook';
import { translate, useI18n, LANGUAGES } from '@/i18n';
import { cn } from '@/lib/utils';

const kindTone: Record<Kind, string> = {
  Concept: 'bg-primary/10 text-primary',
  Terminology: 'bg-[hsl(var(--sage)/0.14)] text-[hsl(var(--sage))]',
  System: 'bg-[hsl(200_35%_40%/0.12)] text-[hsl(200_35%_32%)]',
  Process: 'bg-[hsl(40_70%_50%/0.16)] text-[hsl(32_60%_30%)]',
  'How-to': 'bg-[hsl(var(--pencil)/0.12)] text-[hsl(var(--pencil))]',
  Question: 'bg-muted text-muted-foreground border border-dashed border-muted-foreground/40',
};

export function KindBadge({ kind }: { kind: Kind }) {
  const { t } = useI18n();
  return <span className={cn('inline-flex items-center rounded-sm px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider', kindTone[kind])}>{t(`kinds.${kind}`)}</span>;
}

export function DemoMark({ item }: { item: Pick<Item, 'demo'> }) {
  const { t } = useI18n();
  if (!item.demo) return null;
  return (
    <span className="inline-flex items-center rounded-sm border border-[hsl(var(--pencil)/0.4)] px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[hsl(var(--pencil))]">
      {t('common.demo')}
    </span>
  );
}

export function GeneratedLabelMark({ item }: { item: Pick<Item, 'generatedLabel' | 'edited'> }) {
  const { t } = useI18n();
  if (!item.generatedLabel) return null;
  return <span className="font-mono text-[10px] uppercase tracking-wider text-[hsl(var(--pencil))]">{t('templates.labelGenerated')}</span>;
}

/** Generated template bodies are re-rendered in the current UI language while unedited. */
export function displayBody(item: Item): string {
  if (item.generated && !item.edited && item.body) {
    return translate('templates.investigation', { title: item.title, page: item.excerpts[0]?.page ?? '' });
  }
  return item.body;
}

/** The text compared against the excerpt: templates are scaffolding, not factual additions. */
export function claimExplanation(item: Item): string {
  return item.generated && !item.edited ? '' : item.body;
}

export function excerptText(item: Pick<Item, 'excerpts'>): string {
  return item.excerpts.map((e) => e.text).join('\n\n');
}

export function Interpretation({ item, className }: { item: Item; className?: string }) {
  const { t } = useI18n();
  const body = displayBody(item);
  if (!body) return null;
  return (
    <div className={className}>
      <SectionLabel tone={item.generated ? 'pencil' : 'ink'}>{item.generated ? (item.kind === 'Question' ? t('templates.investigationLabel') : t('interpretation.generated')) : t('interpretation.yours')}</SectionLabel>
      <p className={cn('whitespace-pre-line text-[0.95rem] leading-relaxed', item.generated && 'italic text-muted-foreground')}>{body}</p>
    </div>
  );
}

export function ClaimText({ tokens, className }: { tokens: ClaimToken[]; className?: string }) {
  const { t } = useI18n();
  return (
    <span className={cn('whitespace-pre-line', className)}>
      {tokens.map((tk, i) =>
        tk.unsupported || tk.connector ? (
          <mark
            key={i}
            title={tk.connector ? t('claims.connector') : t('claims.unsupported')}
            className={cn('rounded-sm px-0.5 text-inherit', tk.connector ? 'bg-[hsl(var(--pencil)/0.2)] underline decoration-[hsl(var(--pencil))] decoration-wavy underline-offset-4' : 'bg-[hsl(var(--pencil)/0.12)]')}
          >
            {tk.text}
          </mark>
        ) : (
          <span key={i}>{tk.text}</span>
        ),
      )}
    </span>
  );
}

export function ClaimWarning({ words, onTrim }: { words: string[]; onTrim?: () => void }) {
  const { t } = useI18n();
  return (
    <div role="status" data-testid="status-claim-warning" className="rounded-md border border-[hsl(var(--pencil)/0.4)] bg-[hsl(var(--pencil)/0.05)] px-3 py-2.5 text-sm">
      <div className="flex flex-wrap items-start gap-2">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[hsl(var(--pencil))]" />
        <div className="min-w-0 flex-1">
          <div className="font-medium text-[hsl(var(--pencil))]">{t('claims.warning')}</div>
          <div className="mt-0.5 break-words text-xs text-muted-foreground">{t('claims.words', { words: words.join(', ') })}</div>
        </div>
        {onTrim && (
          <button type="button" onClick={onTrim} data-testid="button-trim-source" className="inline-flex items-center gap-1 rounded-md border bg-card px-2 py-1 text-xs transition hover:border-primary/50">
            <Scissors className="size-3" /> {t('claims.trim')}
          </button>
        )}
      </div>
      <p className="mt-2 text-[11px] leading-snug text-muted-foreground">{t('claims.heuristic')}</p>
    </div>
  );
}

export function LangSwitch({ className }: { className?: string }) {
  const { language, setLanguage, t } = useI18n();
  return (
    <div role="group" aria-label={t('app.languageSwitch')} className={cn('inline-flex rounded-md border bg-card/70 p-0.5 font-mono text-[11px]', className)}>
      {LANGUAGES.map((l, i) => (
        <span key={l} className="flex items-center">
          {i > 0 && <span aria-hidden className="px-0.5 text-muted-foreground/60">|</span>}
          <button
            type="button"
            lang={l}
            aria-pressed={language === l}
            onClick={() => setLanguage(l)}
            data-testid={`button-lang-${l}`}
            className={cn('rounded px-1.5 py-0.5 uppercase transition', language === l ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground')}
          >
            {l}
          </button>
        </span>
      ))}
    </div>
  );
}

export function ExcerptBlock({ excerpt, compact }: { excerpt: Excerpt; compact?: boolean }) {
  const { data } = useNotebook();
  const { openSourcePage } = useNav();
  const { t } = useI18n();
  const src = data.sources.find((s) => s.id === excerpt.sourceId);
  return (
    <figure className={cn('excerpt rounded-r-sm', compact ? 'px-3 py-2' : 'px-4 py-3')}>
      <blockquote className={cn('whitespace-pre-line break-words leading-relaxed text-foreground/90', compact ? 'text-[0.95rem] line-clamp-4' : 'text-[1.05rem]')}>{excerpt.text}</blockquote>
      <figcaption className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        <span className="min-w-0 break-words font-mono">
          {src ? src.title : t('common.missingSource')} · {t('common.page', { page: excerpt.page })}
        </span>
        {src && (
          <button
            type="button"
            data-testid={`button-open-page-${excerpt.sourceId}-${excerpt.page}`}
            onClick={(e) => {
              e.stopPropagation();
              openSourcePage(excerpt.sourceId, excerpt.page, excerpt.text);
            }}
            className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-primary underline-offset-4 transition hover:bg-primary/10 hover:underline"
          >
            <BookOpen className="size-3" /> {t('common.openPage', { page: excerpt.page })}
          </button>
        )}
      </figcaption>
    </figure>
  );
}

export function SectionLabel({ children, tone = 'muted' }: { children: ReactNode; tone?: 'muted' | 'pencil' | 'ink' }) {
  return (
    <div className={cn('eyebrow mb-2', tone === 'pencil' && '!text-[hsl(var(--pencil))]', tone === 'ink' && '!text-primary')}>{children}</div>
  );
}

export function PageHeader({ eyebrow, title, children, actions }: { eyebrow: string; title: string; children?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="reveal mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="max-w-2xl">
        <div className="eyebrow mb-2">{eyebrow}</div>
        <h1 className="font-display text-3xl leading-tight md:text-[2.6rem]">{title}</h1>
        {children && <div className="mt-3 text-[0.95rem] leading-relaxed text-muted-foreground">{children}</div>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function Empty({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="reveal rounded-lg border border-dashed border-border bg-card/60 px-6 py-12 text-center">
      <div className="mx-auto mb-4 h-px w-16 bg-[hsl(var(--pencil)/0.5)]" />
      <h3 className="font-display text-xl">{title}</h3>
      {children && <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{children}</p>}
      {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

export function Bar({ value, tone = 'primary' }: { value: number; tone?: 'primary' | 'sage' | 'pencil' | 'ochre' }) {
  const color = { primary: 'hsl(var(--primary))', sage: 'hsl(var(--sage))', pencil: 'hsl(var(--pencil))', ochre: 'hsl(40 70% 50%)' }[tone];
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="bar" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <span style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export function fmtDuration(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return m ? translate('duration.ms', { m, s: sec.toString().padStart(2, '0') }) : translate('duration.s', { s: sec });
}
