export interface WidgetSdkSettingField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'boolean' | 'select';
  options?: Array<{ label: string; value: any }>;
  defaultValue?: any;
}

export interface WidgetSdkConfig {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  permissions: string[];
  settingsSchema?: WidgetSdkSettingField[];
  render: (container: HTMLElement, api: DashFlowApi) => void;
}

export interface DashFlowApi {
  storage: {
    get: <T>(key: string, defaultValue?: T) => Promise<T>;
    set: <T>(key: string, value: T) => Promise<void>;
  };
  events: {
    on: (event: string, callback: (data: any) => void) => void;
    emit: (event: string, data: any) => void;
  };
  settings: {
    get: <T>(key: string, defaultValue?: T) => T;
  };
}

/**
 * Публичная функция создания сторонних плагинов для DashFlow
 */
export function createWidget(config: WidgetSdkConfig): WidgetSdkConfig {
  return config;
}
