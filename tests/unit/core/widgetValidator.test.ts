import { describe, it, expect } from 'vitest';
import { validateWidgetSettings } from '@/core/widget/validator';
import type { WidgetSettingFieldSchema } from '@/core/widget/types';

describe('Widget Settings Validator', () => {
  interface TestSettings {
    title: string;
    count: number;
    enabled: boolean;
    mode: 'fast' | 'slow';
    tags: string[];
    color: string;
  }

  const schema: WidgetSettingFieldSchema<TestSettings>[] = [
    {
      key: 'title',
      labelKey: 'common.edit',
      type: 'text',
      defaultValue: 'Default Title',
    },
    {
      key: 'count',
      labelKey: 'common.save',
      type: 'slider',
      defaultValue: 10,
      min: 1,
      max: 100,
    },
    {
      key: 'enabled',
      labelKey: 'common.enabled',
      type: 'boolean',
      defaultValue: true,
    },
    {
      key: 'mode',
      labelKey: 'appearance.activeTheme',
      type: 'select',
      defaultValue: 'fast',
      options: [
        { labelKey: 'common.enabled', value: 'fast' },
        { labelKey: 'common.disabled', value: 'slow' },
      ],
    },
    {
      key: 'tags',
      labelKey: 'widgets.rssReader',
      type: 'multiselect',
      defaultValue: ['tag1'],
      options: [
        { labelKey: 'common.add', value: 'tag1' },
        { labelKey: 'common.add', value: 'tag2' },
      ],
    },
    {
      key: 'color',
      labelKey: 'appearance.themePreset',
      type: 'color',
      defaultValue: '#3b82f6',
    },
  ];

  it('должен возвращать валидные настройки без изменений', () => {
    const valid = {
      title: 'Custom Title',
      count: 50,
      enabled: false,
      mode: 'slow' as const,
      tags: ['tag1', 'tag2'],
      color: '#ff0000',
    };

    const res = validateWidgetSettings(valid, schema);
    expect(res).toEqual(valid);
  });

  it('при передаче null/undefined/не-объекта должен возвращать дефолтные значения из схемы', () => {
    const resNull = validateWidgetSettings(null, schema);
    expect(resNull.title).toBe('Default Title');
    expect(resNull.count).toBe(10);
    expect(resNull.enabled).toBe(true);
    expect(resNull.mode).toBe('fast');
    expect(resNull.tags).toEqual(['tag1']);
    expect(resNull.color).toBe('#3b82f6');

    const resStr = validateWidgetSettings('garbage string', schema);
    expect(resStr.title).toBe('Default Title');
  });

  it('при невалидном типе поля должен подставлять defaultValue', () => {
    const corrupted = {
      title: 12345, // ожидалась строка
      count: 'not a number', // ожидалось число
      enabled: 'true', // ожидался boolean
      mode: 'invalid_mode', // не в списке options
      tags: 'not an array', // ожидался массив
      color: 999, // ожидалась строка
    };

    const res = validateWidgetSettings(corrupted, schema);
    expect(res.title).toBe('Default Title');
    expect(res.count).toBe(10);
    expect(res.enabled).toBe(true);
    expect(res.mode).toBe('fast');
    expect(res.tags).toEqual(['tag1']);
    expect(res.color).toBe('#3b82f6');
  });

  it('при выходе числа за пределы min/max должен подставлять defaultValue', () => {
    const outOfBounds = {
      count: 9999, // max 100
    };

    const res = validateWidgetSettings(outOfBounds, schema);
    expect(res.count).toBe(10);

    const negative = {
      count: -5, // min 1
    };
    const resNeg = validateWidgetSettings(negative, schema);
    expect(resNeg.count).toBe(10);
  });

  it('при multiselect должен фильтровать недопустимые значения', () => {
    const mixed = {
      tags: ['tag1', 'hacker_tag', 'tag2'],
    };

    const res = validateWidgetSettings(mixed, schema);
    expect(res.tags).toEqual(['tag1', 'tag2']);
  });

  it('если схема не передана, должен возвращать объект как есть или пустой объект', () => {
    const freeForm = { customKey: 'customVal' };
    expect(validateWidgetSettings(freeForm, undefined)).toEqual(freeForm);
    expect(validateWidgetSettings(null, undefined)).toEqual({});
  });
});
