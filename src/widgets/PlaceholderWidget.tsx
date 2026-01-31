export type PlaceholderReason = 'missing' | 'invalid';

interface PlaceholderWidgetProps {
  type: string;
  widgetId: string;
  /** Why the placeholder is shown */
  reason?: PlaceholderReason;
}

export function PlaceholderWidget({ type, widgetId, reason = 'missing' }: PlaceholderWidgetProps) {
  const message =
    reason === 'missing'
      ? 'Widget not found'
      : 'Invalid widget';

  return (
    <div className="flex flex-col items-center justify-center h-full p-4 text-slate-500">
      <span className="text-2xl mb-2">◇</span>
      <span className="text-xs font-medium text-slate-400">{message}</span>
      <span className="text-[10px] uppercase tracking-wider mt-0.5">{type}</span>
      <span className="text-[10px] text-slate-600 mt-0.5 truncate max-w-full">{widgetId}</span>
    </div>
  );
}
