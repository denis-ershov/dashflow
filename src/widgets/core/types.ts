import React from 'react';

export type WidgetCategory =
  | 'productivity'
  | 'utilities'
  | 'finance'
  | 'developer'
  | 'news'
  | 'social'
  | 'entertainment'
  | 'health';

export interface WidgetSettingField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'select';
  options?: Array<{ label: string; value: any }>;
  defaultValue?: any;
}

export interface WidgetDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  iconName: string;
  category: WidgetCategory;
  defaultSize: { w: number; h: number };
  minSize?: { w: number; h: number };
  maxSize?: { w: number; h: number };
  permissions?: string[];
  settingsSchema?: WidgetSettingField[];
  component: React.ComponentType<{ instanceId: string; settings?: any }>;
}
