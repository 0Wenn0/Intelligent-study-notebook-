import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Shell } from '@/components/shell';
import { I18nProvider } from '@/i18n';
import { NavProvider, NotebookProvider, useNav } from '@/store/notebook';
import Overview from '@/pages/overview';
import Sources from '@/pages/sources';
import Review from '@/pages/review';
import Library from '@/pages/library';
import Study from '@/pages/study';
import Understanding from '@/pages/understanding';

function Current() {
  const { view, focusItemId, focusSourceId } = useNav();
  const key = `${view}-${focusItemId ?? ''}-${focusSourceId ?? ''}`;
  return (
    <ErrorBoundary resetKey={key}>
      <div key={key}>
        {view === 'overview' && <Overview />}
        {view === 'sources' && <Sources />}
        {view === 'review' && <Review />}
        {view === 'library' && <Library />}
        {view === 'study' && <Study />}
        {view === 'understanding' && <Understanding />}
      </div>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <I18nProvider>
    <TooltipProvider>
      <NotebookProvider>
        <NavProvider>
          <Shell>
            <Current />
          </Shell>
        </NavProvider>
      </NotebookProvider>
      <Toaster />
    </TooltipProvider>
    </I18nProvider>
  );
}

export default App;
