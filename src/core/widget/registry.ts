import type { WidgetCategory, WidgetDefinition } from './types';

/**
 * Реестр определений виджетов DashFlow
 */
export class WidgetRegistry {
  private static readonly widgets = new Map<string, WidgetDefinition<never>>();

  /**
   * Регистрация манифеста виджета в реестре
   */
  public static register<S>(definition: WidgetDefinition<S>): void {
    this.widgets.set(definition.id, definition as unknown as WidgetDefinition<never>);
  }

  /**
   * Получение определения виджета по его идентификатору
   */
  public static get<S = Record<string, unknown>>(id: string): WidgetDefinition<S> | undefined {
    return this.widgets.get(id) as unknown as WidgetDefinition<S> | undefined;
  }

  /**
   * Проверка зарегистрирован ли виджет с указанным id
   */
  public static isRegistered(id: string): boolean {
    return this.widgets.has(id);
  }

  /**
   * Получение полного списка зарегистрированных виджетов
   */
  public static getAll(): WidgetDefinition[] {
    return Array.from(this.widgets.values()) as unknown as WidgetDefinition[];
  }

  /**
   * Фильтрация виджетов по категории
   */
  public static getByCategory(category: WidgetCategory): WidgetDefinition[] {
    return this.getAll().filter((widget) => widget.category === category);
  }

  /**
   * Очистка реестра (для изолированного тестирования)
   */
  public static clear(): void {
    this.widgets.clear();
  }

  /**
   * Безопасное получение определения или заглушки для неизвестного / удаленного виджета
   */
  public static getOrFallback(id: string): WidgetDefinition {
    const existing = this.get(id);
    if (existing) return existing;

    return {
      id,
      nameKey: 'errors.widgetFailed',
      descriptionKey: 'errors.notFound',
      version: '1.0.0',
      iconName: 'AlertTriangle',
      category: 'system',
      surface: 'panel',
      size: { defaultW: 4, defaultH: 2, minW: 2, minH: 1 },
      load: () =>
        Promise.resolve({
          default: () => null,
        }),
    };
  }
}
