import { useState, useEffect, useRef, memo } from 'react';
import { useWidgetsStore } from '@/stores';
import { WidgetRenderer } from '@/widgets';

/**
 * Lazy widget slot - defers rendering until the slot is in viewport.
 * Reduces initial render cost when many widgets are below the fold.
 */
const LazyWidgetSlot = memo(function LazyWidgetSlot({ widgetId }: { widgetId: string }) {
  const [inView, setInView] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const widget = useWidgetsStore((s) => s.instances[widgetId]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setInView(true);
      },
      { rootMargin: '100px', threshold: 0.01 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  if (!widget) {
    return <div className="p-3 text-slate-500 text-sm">Unknown widget</div>;
  }

  return (
    <div ref={containerRef} className="min-h-0">
      {inView ? (
        <WidgetRenderer type={widget.type} instanceId={widget.id} config={widget.config} />
      ) : (
        <div className="min-h-[60px]" aria-hidden="true" />
      )}
    </div>
  );
});
