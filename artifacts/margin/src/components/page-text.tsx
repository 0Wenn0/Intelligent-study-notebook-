import { useEffect, useRef } from 'react';

export function PageText({ text, highlight }: { text: string; highlight?: string }) {
  const ref = useRef<HTMLElement>(null);
  const at = highlight ? text.indexOf(highlight) : -1;
  useEffect(() => {
    ref.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [highlight, text]);
  return (
    <div className="whitespace-pre-line font-serif text-[1.02rem] leading-[1.75] text-foreground/90" data-testid="text-source-page">
      {at >= 0 && highlight ? (
        <>
          {text.slice(0, at)}
          <mark ref={ref} className="rounded-sm bg-[hsl(var(--highlight))] px-0.5 text-foreground">{highlight}</mark>
          {text.slice(at + highlight.length)}
        </>
      ) : (
        text
      )}
    </div>
  );
}
