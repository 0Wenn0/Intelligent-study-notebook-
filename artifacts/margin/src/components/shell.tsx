import { useState, type ReactNode } from 'react';
import { BookMarked, FileText, GraduationCap, Inbox, LayoutPanelLeft, LineChart, Plus, ShieldCheck } from 'lucide-react';
import { useNav, useNotebook, type View } from '@/store/notebook';
import { cn } from '@/lib/utils';
import { StorageBanner } from './storage-banner';
import { SourcePageDialog } from './source-page-dialog';
import { AddSourceDialog } from './add-source-dialog';
import { PrivacyDialog } from './privacy-dialog';
import { LangSwitch } from './bits';
import { WelcomeDialog } from './welcome-dialog';
import { useI18n } from '@/i18n';

const NAV: { id: View; icon: typeof Inbox }[] = [
  { id: 'overview', icon: LayoutPanelLeft },
  { id: 'sources', icon: FileText },
  { id: 'review', icon: Inbox },
  { id: 'library', icon: BookMarked },
  { id: 'study', icon: GraduationCap },
  { id: 'understanding', icon: LineChart },
];

export function Shell({ children }: { children: ReactNode }) {
  const { data, markWelcomeSeen } = useNotebook();
  const { view, go, setAddOpen, setPrivacyOpen } = useNav();
  const { t, persistFailed } = useI18n();
  const pending = data.items.filter((i) => i.status === 'pending').length;
  const approved = data.items.filter((i) => i.status === 'approved').length;

  // First visit: explain what the app is for before anything about data or settings.
  const [welcomeOpen, setWelcomeOpen] = useState(() => !data.prefs.welcomeSeen);
  const closeWelcome = () => {
    setWelcomeOpen(false);
    if (!data.prefs.welcomeSeen) markWelcomeSeen();
  };

  const count = (id: View) => (id === 'review' ? pending : id === 'library' ? approved : null);

  return (
    <div className="min-h-[100dvh] md:grid md:grid-cols-[232px_1fr]">
      <aside className="sticky top-0 z-30 border-b bg-sidebar/95 backdrop-blur md:h-[100dvh] md:border-b-0 md:border-r">
        <div className="flex items-center justify-between gap-3 px-5 py-4 md:block md:py-7">
          <div className="flex items-start justify-between gap-2">
            <button type="button" onClick={() => go('overview')} className="text-left" data-testid="link-home">
              <div className="font-display text-[1.7rem] leading-none tracking-tight">
                {t('app.name')}<span className="text-[hsl(var(--pencil))]">.</span>
              </div>
              <div className="mt-1 hidden font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground md:block">{t('app.tagline')}</div>
            </button>
            <LangSwitch className="hidden md:inline-flex" />
          </div>
          <div className="flex items-center gap-2 md:hidden">
            <LangSwitch />
            <button type="button" onClick={() => setAddOpen(true)} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground" data-testid="button-add-source-mobile">
              <Plus className="size-4" /> {t('app.import')}
            </button>
          </div>
          {persistFailed && <p role="status" className="mt-2 text-[11px] leading-snug text-destructive">{t('app.langNotSaved')}</p>}
        </div>
        <nav aria-label={t('app.mainNav')} className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:px-3 md:pb-0">
          {NAV.map((n) => {
            const c = count(n.id);
            const active = view === n.id;
            return (
              <button
                key={n.id}
                type="button"
                data-testid={`link-nav-${n.id}`}
                onClick={() => go(n.id)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'group relative flex shrink-0 items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
                  active ? 'bg-card text-foreground shadow-sm' : 'text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-foreground',
                )}
              >
                {active && <span className="absolute -left-3 top-2 bottom-2 hidden w-[2px] rounded bg-[hsl(var(--pencil))] md:block" />}
                <n.icon className={cn('size-4 transition', active ? 'text-primary' : 'opacity-70 group-hover:opacity-100')} />
                <span>{t(`nav.${n.id}`)}</span>
                {c !== null && c > 0 && <span className="ml-auto pl-2 font-mono text-[11px] text-muted-foreground">{c}</span>}
              </button>
            );
          })}
        </nav>
        <div className="hidden px-3 pt-6 md:block">
          <button type="button" onClick={() => setAddOpen(true)} data-testid="button-add-source" className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-3 py-2.5 text-sm text-primary-foreground shadow-sm transition hover:-translate-y-px hover:shadow-md active:translate-y-0">
            <Plus className="size-4" /> {t('app.importPdf')}
          </button>
        </div>
        <div className="absolute bottom-0 hidden w-full p-4 md:block">
          <button type="button" onClick={() => setPrivacyOpen(true)} data-testid="button-privacy" className="flex w-full items-start gap-2 rounded-md p-2 text-left text-xs leading-snug text-muted-foreground transition hover:bg-sidebar-accent/60 hover:text-foreground">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-[hsl(var(--sage))]" />
            <span>{t('app.privacyShort')}</span>
          </button>
        </div>
      </aside>
      <div className="min-w-0">
        <StorageBanner />
        <main className="margin-rule mx-auto max-w-[1080px] px-5 py-8 md:ml-10 md:px-12 md:py-12">
          {children}
          <button type="button" onClick={() => setPrivacyOpen(true)} className="mt-16 text-xs text-muted-foreground underline-offset-4 hover:underline md:hidden" data-testid="button-privacy-mobile">
            {t('app.privacyMobile')}
          </button>
        </main>
      </div>
      <SourcePageDialog />
      <AddSourceDialog />
      <PrivacyDialog onShowHowTo={() => { setPrivacyOpen(false); setWelcomeOpen(true); }} />
      <WelcomeDialog open={welcomeOpen} onClose={closeWelcome} onUpload={() => setAddOpen(true)} />
    </div>
  );
}
