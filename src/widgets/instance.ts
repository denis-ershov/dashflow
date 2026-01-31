import type { WidgetInstance, WidgetConfig } from '@/types/dashboard';
import type { WidgetDefinition } from './types';
import { getWidget } from './registry';

/**
 * Widget instance model - bridges registry definitions with runtime instances.
 * Multiple instances of the same widget type share the definition.
 */

export function createInstance(
  type: string,
  id: string,
  overrides?: { config?: Partial<WidgetConfig> }
): WidgetInstance | null {
  const definition = getWidget(type);
  if (!definition) return null;

  const defaultConfig = (definition.defaultConfig ?? {}) as WidgetConfig;
  const config = { ...defaultConfig, ...overrides?.config };

  return {
    id,
    type,
    config,
    version: 1,
  };
}

export function getDefaultSize(type: string): { w: number; h: number } | null {
  const definition = getWidget(type);
  if (!definition) return null;
  const { w, h } = definition.defaultSize;
  return { w, h };
}
