import type React from 'react';
import type { TranslationKey } from '@/core/i18n/i18n';

/**
 * Категории виджетов DashFlow
 */
export type WidgetCategory =
  | 'hero'
  | 'productivity'
  | 'utilities'
  | 'finance'
  | 'developer'
  | 'news'
  | 'social'
  | 'entertainment'
  | 'system';

/**
 * Строгий список разрешений для виджетов и плагинов
 */
export type WidgetPermission = 'storage' | 'network' | 'bookmarks' | 'geolocation';

/**
 * Тип визуальной поверхности виджета (Секция 3, Спецификация 2026-08-24)
 * - chromeless: без фона, без рамки, без шапки (clock, search)
 * - panel: стеклянная панель с опциональным заголовком
 * - tiles: контейнер плиток с подписями и внутренней сеткой (bookmarks, quickLinks)
 */
export type WidgetSurfaceType = 'chromeless' | 'panel' | 'tiles';

/**
 * Размеры виджета в ячейках сетки
 */
export interface WidgetSize {
  defaultW: number;
  defaultH: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
}

/**
 * Доступные типы полей настроек виджетов
 */
export type WidgetSettingFieldType =
  | 'text'
  | 'number'
  | 'boolean'
  | 'select'
  | 'slider'
  | 'color'
  | 'multiselect'
  | 'segmented';

export interface WidgetSettingOption<V extends string | number = string | number> {
  labelKey: string;
  value: V;
}

/**
 * Схема одного поля настройки виджета
 */
export interface WidgetSettingFieldSchema<S, K extends keyof S = keyof S> {
  key: K;
  labelKey: string;
  type: WidgetSettingFieldType;
  defaultValue: S[K];
  helperText?: string;
  section?: 'appearance' | 'behavior' | 'data' | 'advanced' | (string & {});
  placeholder?: string;
  options?: WidgetSettingOption[];
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
}

/**
 * Пропсы, передаваемые в компонент виджета
 */
export interface WidgetProps<S = Record<string, unknown>> {
  instanceId: string;
  settings: S;
  isEditMode?: boolean;
  onUpdateSettings?: (newSettings: Partial<S>) => void;
}

/**
 * Строгий манифест определения виджета с поддержкой Code-Splitting (load)
 */
export interface WidgetDefinition<S = Record<string, unknown>> {
  id: string;
  nameKey?: TranslationKey;
  descriptionKey?: TranslationKey;
  name?: string;
  description?: string;
  author?: string;
  version: string;
  iconName?: string;
  category: WidgetCategory;
  surface: WidgetSurfaceType;
  size: WidgetSize;
  permissions?: WidgetPermission[];
  settingsSchema?: WidgetSettingFieldSchema<S>[];
  load: () => Promise<{ default: React.ComponentType<WidgetProps<S>> }>;
  loadSettings?: () => Promise<{
    default: React.ComponentType<{ settings: S; onChange: (newSettings: S) => void }>;
  }>;
}

export type WidgetManifest<S = Record<string, unknown>> = WidgetDefinition<S>;

/**
 * Экземпляр установленного на дашборд виджета
 */
export interface WidgetInstance<S = Record<string, unknown>> {
  instanceId: string;
  widgetId: string;
  settings: S;
}
