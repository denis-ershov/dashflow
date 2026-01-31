/**
 * Widget plugin system - type definitions.
 */

import type { ComponentType } from 'react';

export interface WidgetMetadata {
  /** Unique type identifier (e.g. 'clock', 'notes') */
  type: string;
  /** Display name */
  name: string;
  /** Short description */
  description?: string;
  /** Icon name or URL */
  icon?: string;
  /** Author or source */
  author?: string;
}

export interface WidgetDefaultSize {
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
}

export interface WidgetDefinition<Config = Record<string, unknown>> {
  metadata: WidgetMetadata;
  /** React component - receives instance id and config */
  component: ComponentType<WidgetComponentProps<Config>>;
  /** Default grid size when adding a new instance */
  defaultSize: WidgetDefaultSize;
  /** Optional settings panel component (edit mode) */
  SettingsPanel?: ComponentType<WidgetSettingsProps<Config>>;
  /** Default config for new instances */
  defaultConfig?: Config;
}

export interface WidgetComponentProps<Config = Record<string, unknown>> {
  instanceId: string;
  config: Config;
}

export interface WidgetSettingsProps<Config = Record<string, unknown>> {
  instanceId: string;
  config: Config;
  onConfigChange: (updates: Partial<Config>) => void;
}
