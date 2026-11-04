import type { Confidence } from '@/lib/types';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';

const LEVELS: Confidence[] = [1, 2, 3, 4];

/** Confidence is asked before the answer is revealed, so calibration can be measured. */
export function ConfidencePicker({ value, onChange, disabled }: { value: Confidence | null; onChange: (c: Confidence) => void; disabled?: boolean }) {
  const { t } = useI18n();
  return (
    <fieldset disabled={disabled} className="grid gap-2">
      <legend className="eyebrow mb-2">{t('study.confidenceAsk')}</legend>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {LEVELS.map((c) => (
          <button
            key={c}
            type="button"
            aria-pressed={value === c}
            onClick={() => onChange(c)}
            data-testid={`button-confidence-${c}`}
            className={cn(
              'rounded-md border px-2 py-2 text-left text-sm transition disabled:opacity-60',
              value === c ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:border-primary/50',
            )}
          >
            <span className="font-mono text-xs opacity-70">{c}</span> {t(`study.confidence${c}`)}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
