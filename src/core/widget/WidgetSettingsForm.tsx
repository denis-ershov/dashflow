import React, { useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import { Input, Switch, Slider } from '@/ui/primitives';
import { t, isTranslationKey } from '@/core/i18n';
import { cn } from '@/ui/lib/cn';
import type { WidgetSettingFieldSchema } from './types';

export interface WidgetSettingsFormProps<S> {
  schema: WidgetSettingFieldSchema<S>[];
  values: S;
  onChange: (newValues: S) => void;
}

function resolveLabel(key?: string): string {
  if (!key) return '';
  return isTranslationKey(key) ? t(key) : key;
}

const SECTION_TITLES: Record<string, string> = {
  appearance: 'Внешний вид и оформление',
  behavior: 'Поведение и логика',
  data: 'Данные и интеграции',
  advanced: 'Дополнительные параметры',
};

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

  // Группировка по секциям (если заданы)
  const sections = useMemo(() => {
    const map = new Map<string, WidgetSettingFieldSchema<S>[]>();
    for (const field of schema) {
      const sec = field.section || 'default';
      if (!map.has(sec)) {
        map.set(sec, []);
      }
      map.get(sec)!.push(field);
    }
    return Array.from(map.entries());
  }, [schema]);

  const renderField = (field: WidgetSettingFieldSchema<S>) => {
    const key = field.key;
    const keyStr = String(key);
    const rawValue = valuesObj[keyStr];
    const label = resolveLabel(field.labelKey);
    const helperText = resolveLabel(field.helperText);

    let control: React.ReactNode = null;

    switch (field.type) {
      case 'text':
        control = (
          <Input
            label={label}
            placeholder={field.placeholder}
            value={typeof rawValue === 'string' ? rawValue : String(field.defaultValue ?? '')}
            onChange={(e) => updateField(key, e.target.value)}
          />
        );
        break;

      case 'number':
        control = (
          <Input
            type="number"
            label={label}
            placeholder={field.placeholder}
            min={field.min}
            max={field.max}
            step={field.step}
            value={
              typeof rawValue === 'number' ? String(rawValue) : String(field.defaultValue ?? 0)
            }
            onChange={(e) => updateField(key, Number(e.target.value))}
          />
        );
        break;

      case 'boolean':
        control = (
          <Switch
            label={label}
            checked={typeof rawValue === 'boolean' ? rawValue : Boolean(field.defaultValue)}
            onChange={(checked) => updateField(key, checked)}
          />
        );
        break;

      case 'slider':
        control = (
          <Slider
            label={label}
            value={typeof rawValue === 'number' ? rawValue : Number(field.defaultValue ?? 0)}
            min={field.min ?? 0}
            max={field.max ?? 100}
            step={field.step ?? 1}
            unit={field.unit}
            onChange={(val) => updateField(key, val)}
          />
        );
        break;

      case 'segmented':
        control = (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-fg-muted uppercase tracking-wider">
              {label}
            </label>
            <div className="p-1 bg-surface-elevated/70 border border-line rounded-xl flex gap-1">
              {field.options?.map((opt) => {
                const currentVal = rawValue ?? field.defaultValue;
                const isSelected =
                  (typeof currentVal === 'string' ||
                  typeof currentVal === 'number' ||
                  typeof currentVal === 'boolean'
                    ? String(currentVal)
                    : '') === String(opt.value);
                return (
                  <button
                    key={String(opt.value)}
                    type="button"
                    onClick={() => updateField(key, opt.value)}
                    className={cn(
                      'flex-1 min-h-[36px] px-3 py-1 rounded-lg text-xs font-medium transition-all duration-150',
                      isSelected
                        ? 'bg-primary text-primary-fg shadow-sm font-semibold'
                        : 'text-fg-muted hover:text-fg hover:bg-surface/50',
                    )}
                  >
                    {resolveLabel(opt.labelKey)}
                  </button>
                );
              })}
            </div>
          </div>
        );
        break;

      case 'select':
        control = (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-fg-muted uppercase tracking-wider">
              {label}
            </label>
            <div className="relative">
              <select
                value={
                  typeof rawValue === 'string' || typeof rawValue === 'number'
                    ? String(rawValue)
                    : String(field.defaultValue ?? '')
                }
                onChange={(e) => updateField(key, e.target.value)}
                className="w-full min-h-[44px] px-3 pr-8 bg-surface text-sm text-fg border border-line rounded-xl focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 appearance-none cursor-pointer transition-colors"
              >
                {field.options?.map((opt) => (
                  <option key={String(opt.value)} value={String(opt.value)}>
                    {resolveLabel(opt.labelKey)}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-fg-muted absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        );
        break;

      case 'color':
        control = (
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-fg-muted uppercase tracking-wider">
              {label}
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={
                  typeof rawValue === 'string'
                    ? rawValue
                    : String(field.defaultValue ?? '#000000')
                }
                onChange={(e) => updateField(key, e.target.value)}
                className="w-11 h-11 rounded-xl border border-line cursor-pointer bg-transparent"
              />
              <Input
                value={
                  typeof rawValue === 'string' ? rawValue : String(field.defaultValue ?? '')
                }
                onChange={(e) => updateField(key, e.target.value)}
              />
            </div>
          </div>
        );
        break;

      case 'multiselect': {
        const rawArr = Array.isArray(rawValue)
          ? rawValue
          : Array.isArray(field.defaultValue)
            ? (field.defaultValue as unknown[])
            : [];
        const currentArray: Array<string | number> = rawArr.filter(
          (item): item is string | number =>
            typeof item === 'string' || typeof item === 'number',
        );

        control = (
          <div className="flex flex-col gap-2">
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
                    className={cn(
                      'min-h-[36px] px-3 py-1 rounded-xl text-xs font-medium border transition-all duration-150',
                      isSelected
                        ? 'bg-primary text-primary-fg border-primary shadow-sm'
                        : 'bg-surface text-fg border-line hover:border-line-hover hover:bg-surface-hover',
                    )}
                  >
                    {resolveLabel(opt.labelKey)}
                  </button>
                );
              })}
            </div>
          </div>
        );
        break;
      }

      default:
        return null;
    }

    return (
      <div key={keyStr} className="flex flex-col">
        {control}
        {helperText && (
          <p className="text-xs text-fg-muted mt-1 leading-relaxed">{helperText}</p>
        )}
      </div>
    );
  };

  // Если секция всего одна (default), рендерим плоский список
  if (sections.length <= 1) {
    return (
      <div className="flex flex-col gap-4">
        {schema.map((field) => renderField(field))}
      </div>
    );
  }

  // Если есть именованные секции, рендерим с заголовками карточек
  return (
    <div className="flex flex-col gap-6">
      {sections.map(([secKey, fields]) => {
        const title = SECTION_TITLES[secKey] || secKey;
        return (
          <div key={secKey} className="flex flex-col gap-3 pb-4 border-b border-line/50 last:border-b-0 last:pb-0">
            {secKey !== 'default' && (
              <h4 className="text-xs font-bold text-fg tracking-wide uppercase flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary" />
                {title}
              </h4>
            )}
            <div className="flex flex-col gap-4">
              {fields.map((field) => renderField(field))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
