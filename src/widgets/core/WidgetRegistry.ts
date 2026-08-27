import { WidgetRegistry as CoreWidgetRegistry } from '@/core/widget/registry';
import type { WidgetDefinition } from './types';

class LegacyWidgetRegistryService {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private legacyWidgets = new Map<string, any>();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public register(definition: WidgetDefinition | any): void {
    this.legacyWidgets.set(definition.id, definition);
    CoreWidgetRegistry.register(definition);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public get(id: string): any {
    return this.legacyWidgets.get(id) || CoreWidgetRegistry.get(id);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public getAll(): any[] {
    if (this.legacyWidgets.size > 0) {
      return Array.from(this.legacyWidgets.values());
    }
    return CoreWidgetRegistry.getAll();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public getByCategory(category: string): any[] {
    return this.getAll().filter((w) => w.category === category);
  }

  public isRegistered(id: string): boolean {
    return this.legacyWidgets.has(id) || CoreWidgetRegistry.isRegistered(id);
  }

  public clear(): void {
    this.legacyWidgets.clear();
    CoreWidgetRegistry.clear();
  }
}

export const WidgetRegistry = new LegacyWidgetRegistryService();
