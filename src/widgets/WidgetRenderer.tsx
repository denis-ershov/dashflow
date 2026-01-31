import { memo } from 'react';
import { getWidget } from './registry';
import { WidgetErrorBoundary } from './WidgetErrorBoundary';
import { PlaceholderWidget } from './PlaceholderWidget';

export interface WidgetRendererProps {
  type: string;
  instanceId: string;
  config: Record<string, unknown>;
}

/**
 * Widget rendering engine:
 * 1. Resolve widget component via registry
 * 2. Pass instance-specific config to widget
 * 3. Wrap in error boundary for graceful fallback
 * 4. Fallback to PlaceholderWidget if type is missing
 */
export const WidgetRenderer = memo(function WidgetRenderer({
  type,
  instanceId,
  config = {},
}: WidgetRendererProps) {
  const definition = getWidget(type);

  if (!definition) {
    return <PlaceholderWidget type={type} widgetId={instanceId} reason="missing" />;
  }

  const Component = definition.component;

  if (typeof Component !== 'function' && typeof Component !== 'object') {
    return <PlaceholderWidget type={type} widgetId={instanceId} reason="invalid" />;
  }

  return (
    <WidgetErrorBoundary type={type} instanceId={instanceId}>
      <Component instanceId={instanceId} config={config} />
    </WidgetErrorBoundary>
  );
});
