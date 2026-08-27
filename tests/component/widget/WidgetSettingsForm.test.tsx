import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WidgetSettingsForm } from '@/core/widget/WidgetSettingsForm';
import type { WidgetSettingFieldSchema } from '@/core/widget/types';

describe('WidgetSettingsForm Component', () => {
  interface TestSettings {
    title: string;
    refreshInterval: number;
    enabled: boolean;
    mode: string;
  }

  const schema: WidgetSettingFieldSchema<TestSettings>[] = [
    {
      key: 'title',
      labelKey: 'common.edit',
      type: 'text',
      defaultValue: 'Мой виджет',
    },
    {
      key: 'refreshInterval',
      labelKey: 'common.save',
      type: 'slider',
      defaultValue: 30,
      min: 10,
      max: 120,
      unit: 'с',
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
      defaultValue: 'dark',
      options: [
        { labelKey: 'common.enabled', value: 'light' },
        { labelKey: 'common.disabled', value: 'dark' },
      ],
    },
  ];

  it('должен отображать все поля формы согласно переданной схеме', () => {
    const values: TestSettings = {
      title: 'Мой виджет',
      refreshInterval: 30,
      enabled: true,
      mode: 'dark',
    };

    render(<WidgetSettingsForm schema={schema} values={values} onChange={vi.fn()} />);

    expect(screen.getByDisplayValue('Мой виджет')).toBeInTheDocument();
    expect(screen.getByRole('switch')).toBeInTheDocument();
    expect(screen.getByRole('slider')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('должен вызывать onChange при изменении текстового поля', () => {
    const values: TestSettings = {
      title: 'Старый заголовок',
      refreshInterval: 30,
      enabled: true,
      mode: 'dark',
    };

    const handleChange = vi.fn();
    render(<WidgetSettingsForm schema={schema} values={values} onChange={handleChange} />);

    const input = screen.getByDisplayValue('Старый заголовок');
    fireEvent.change(input, { target: { value: 'Новый заголовок' } });

    expect(handleChange).toHaveBeenCalledWith({
      ...values,
      title: 'Новый заголовок',
    });
  });

  it('должен вызывать onChange при переключении Switch', () => {
    const values: TestSettings = {
      title: 'Виджет',
      refreshInterval: 30,
      enabled: false,
      mode: 'dark',
    };

    const handleChange = vi.fn();
    render(<WidgetSettingsForm schema={schema} values={values} onChange={handleChange} />);

    const toggle = screen.getByRole('switch');
    fireEvent.click(toggle);

    expect(handleChange).toHaveBeenCalledWith({
      ...values,
      enabled: true,
    });
  });
});
