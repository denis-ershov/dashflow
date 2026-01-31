export { registerWidget, getWidget, hasWidget, listWidgets, getWidgetTypes } from './registry';
export { createInstance, getDefaultSize } from './instance';
export { WidgetRenderer } from './WidgetRenderer';
export type { WidgetRendererProps } from './WidgetRenderer';
export { WidgetErrorBoundary } from './WidgetErrorBoundary';
export { PlaceholderWidget } from './PlaceholderWidget';
export type { PlaceholderReason } from './PlaceholderWidget';
export type {
  WidgetDefinition,
  WidgetMetadata,
  WidgetDefaultSize,
  WidgetComponentProps,
  WidgetSettingsProps,
} from './types';
