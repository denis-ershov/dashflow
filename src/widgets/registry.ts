import type { WidgetDefinition } from './types';

/**
 * Widget registry - dynamic registration of widget plugins.
 * Multiple instances of the same widget type are supported via WidgetInstance.
 */

const registry = new Map<string, WidgetDefinition>();

export function registerWidget(definition: WidgetDefinition): void {
  const type = definition.metadata.type;
  if (registry.has(type)) {
    console.warn(`[DashFlow] Widget "${type}" already registered, overwriting`);
  }
  registry.set(type, definition);
}

export function unregisterWidget(type: string): boolean {
  return registry.delete(type);
}

export function getWidget(type: string): WidgetDefinition | undefined {
  return registry.get(type);
}

export function hasWidget(type: string): boolean {
  return registry.has(type);
}

export function listWidgets(): WidgetDefinition[] {
  return Array.from(registry.values());
}

export function getWidgetTypes(): string[] {
  return Array.from(registry.keys());
}
