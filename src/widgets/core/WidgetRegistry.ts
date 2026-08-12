import { WidgetDefinition } from './types';

class WidgetRegistryService {
  private widgets: Map<string, WidgetDefinition> = new Map();

  public register(definition: WidgetDefinition): void {
    if (this.widgets.has(definition.id)) {
      console.warn(`[WidgetRegistry] Виджет с id "${definition.id}" уже зарегистрирован.`);
    }
    this.widgets.set(definition.id, definition);
  }

  public get(id: string): WidgetDefinition | undefined {
    return this.widgets.get(id);
  }

  public getAll(): WidgetDefinition[] {
    return Array.from(this.widgets.values());
  }

  public getByCategory(category: string): WidgetDefinition[] {
    return this.getAll().filter((w) => w.category === category);
  }
}

export const WidgetRegistry = new WidgetRegistryService();
