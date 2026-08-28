import React, { useMemo } from 'react';
import { Input, Switch, Slider } from '@/ui/primitives';
import { t, isTranslationKey } from '@/core/i18n';
import type { WidgetSettingFieldSchema } from './types';

export interface WidgetSettingsFormProps<S> {
  schema: WidgetSettingFieldSchema<S>[];
  values: S;
  onChange: (newValues: S) => void;
}

function resolveLabel(key: string): string {
  return isTranslationKey(key) ? t(key) : key;
}

/**
 * Автоматический декларативный генератор формы настроек виджета на базе дизайн-системы DashFlow
 */
export function WidgetSettingsForm<S>({
  schema,
  values,
  onChange,
}: WidgetSettingsFormProps<S>): React.ReactElement {
  const effectiveValues = useMemo(() => {
    const defaults: Record<string, unknown> = {};
    for (const field of schema) {
      if (field.defaultValue !== undefined) {
        defaults[String(field.key)] = field.defaultValue;
      }
    }
    return { ...defaults, ...(values as Record<string, unknown>) } as S;
  }, [schema, values]);

  const updateField = (key: keyof S, val: unknown) => {
    onChange({
      ...effectiveValues,
      [key]: val,
    });
  };

  const valuesObj = effectiveValues as Record<string, unknown>;

  return (
    <div className="flex flex-col gap-4">
      {schema.map((field) => {
        const key = field.key;
        const keyStr = String(key);
        const rawValue = valuesObj[keyStr];
        const label = resolveLabel(field.labelKey);

        switch (field.type) {
          case 'text':
            return (
              <Input
                key={keyStr}
                label={label}
                value={typeof rawValue === 'string' ? rawValue : String(field.defaultValue ?? '')}
                onChange={(e) => updateField(key, e.target.value)}
              />
            );

          case 'number':
            return (
              <Input
                key={keyStr}
                type="number"
                label={label}
                value={typeof rawValue === 'number' ? String(rawValue) : String(field.defaultValue ?? 0)}
                onChange={(e) => updateField(key, Number(e.target.value))}
              />
            );

          case 'boolean':
            return (
              <Switch
                key={keyStr}
                label={label}
                checked={typeof rawValue === 'boolean' ? rawValue : Boolean(field.defaultValue)}
                onChange={(checked) => updateField(key, checked)}
              />
            );

          case 'slider':
            return (
              <Slider
                key={keyStr}
                label={label}
                value={typeof rawValue === 'number' ? rawValue : Number(field.defaultValue ?? 0)}
                min={field.min ?? 0}
                max={field.max ?? 100}
                step={field.step ?? 1}
                unit={field.unit}
                onChange={(val) => updateField(key, val)}
              />
            );

          case 'select':
            return (
              <div key={keyStr} className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-fg-muted uppercase tracking-wider">
                  {label}
                </label>
                <div className="relative">
                  <select
                    value={typeof rawValue === 'string' || typeof rawValue === 'number' ? String(rawValue) : String(field.defaultValue ?? '')}
                    onChange={(e) => updateField(key, e.target.value)}
                    className="w-full min-h-[44px] px-3 bg-surface text-sm text-fg border border-line rounded-md focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 appearance-none cursor-pointer"
                  >
                    {field.options?.map((opt) => (
                      <option key={String(opt.value)} value={String(opt.value)}>
                        {resolveLabel(opt.labelKey)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            );

          case 'color':
            return (
              <div key={keyStr} className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-fg-muted uppercase tracking-wider">
                  {label}
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={typeof rawValue === 'string' ? rawValue : String(field.defaultValue ?? '#000000')}
                    onChange={(e) => updateField(key, e.target.value)}
                    className="w-11 h-11 rounded-md border border-line cursor-pointer bg-transparent"
                  />
                  <Input
                    value={typeof rawValue === 'string' ? rawValue : String(field.defaultValue ?? '')}
                    onChange={(e) => updateField(key, e.target.value)}
                  />
                </div>
              </div>
            );

          case 'multiselect': {
            const rawArr = Array.isArray(rawValue)
              ? rawValue
              : Array.isArray(field.defaultValue)
                ? (field.defaultValue as unknown[])
                : [];
            const currentArray: Array<string | number> = rawArr.filter(
              (item): item is string | number => typeof item === 'string' || typeof item === 'number',
            );

            return (
              <div key={keyStr} className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-fg-muted uppercase tracking-wider">
                  {label}
                </label>
                <div className="flex flex-wrap gap-2">
                  {field.options?.map((opt) => {
                    const isSelected = currentArray.includes(opt.value);
                    return (
                      <button
                        key={String(opt.value)}
                        type="button"
                        onClick={() => {
                          const next: Array<string | number> = isSelected
                            ? currentArray.filter((v) => v !== opt.value)
                            : [...currentArray, opt.value];
                          updateField(key, next);
                        }}
                        className={`min-h-[44px] px-3 rounded-md text-xs font-medium border transition-colors ${
                          isSelected
                            ? 'bg-primary text-primary-fg border-primary'
                            : 'bg-surface text-fg border-line hover:border-line-hover'
                        }`}
                      >
                        {resolveLabel(opt.labelKey)}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          }

          default:
            return null;
        }
      })}
    </div>
  );
}
