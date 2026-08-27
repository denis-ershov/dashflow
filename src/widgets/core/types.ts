import type React from 'react';
import type {
  WidgetCategory as CoreWidgetCategory,
  WidgetPermission,
  WidgetSurfaceType,
  WidgetSize,
  WidgetProps,
  WidgetSettingFieldSchema,
} from '@/core/widget/types';
import type { TranslationKey } from '@/core/i18n';

export type WidgetCategory = CoreWidgetCategory | 'health';

export interface WidgetSettingField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'select';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  options?: Array<{ label: string; value: any }>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  defaultValue?: any;
}

export interface WidgetDefinition<S = Record<string, unknown>> {
  id: string;
  name?: string;
  nameKey?: TranslationKey;
  description?: string;
  descriptionKey?: TranslationKey;
  version: string;
  iconName: string;
  category: WidgetCategory;
  surface?: WidgetSurfaceType;
  size?: WidgetSize;
  defaultSize?: { w: number; h: number };
  minSize?: { w: number; h: number };
  maxSize?: { w: number; h: number };
  permissions?: WidgetPermission[] | string[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  settingsSchema?: WidgetSettingFieldSchema<S>[] | WidgetSettingField[] | any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component?: React.ComponentType<WidgetProps<S>> | React.ComponentType<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  load?: () => Promise<{ default: React.ComponentType<WidgetProps<S>> | React.ComponentType<any> }>;
}

export * from '@/core/widget/types';
