import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useI18nStore, tp } from '@/core/i18n';
import { FloatingDock } from '@/features/dock/FloatingDock';
import { SettingsModal } from '@/features/settings/components/SettingsModal';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { WidgetSettingsForm } from '@/core/widget/WidgetSettingsForm';
import { clockManifest } from '@/widgets/built-in/ClockWidget/manifest';
import {
  formatWindSpeed,
  getWeatherDescription,
  getWindDirectionText,
} from '@/widgets/built-in/WeatherWidget/weatherService';
import { getQuotes } from '@/widgets/built-in/QuotesWidget/quotes';

describe('Интерфейс на английском', () => {
  beforeEach(() => {
    useI18nStore.setState({ language: 'en' });
  });

  it('док подписан по-английски', () => {
    render(
      <FloatingDock
        layoutMode="modular"
        onToggleLayoutMode={vi.fn()}
        onOpenAddWidget={vi.fn()}
        onOpenAppearance={vi.fn()}
        onOpenSettings={vi.fn()}
        onOpenCommandPalette={vi.fn()}
      />,
    );
    expect(screen.getByRole('navigation', { name: 'Quick controls' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add widget' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Settings' })).toBeInTheDocument();
  });

  it('настройки показывают английские тексты и множественное число', () => {
    useDashboardStore.setState({ activeModal: 'settings' });
    render(<SettingsModal />);
    expect(screen.getByText('Layout mode')).toBeInTheDocument();
    expect(screen.getByText('16 columns')).toBeInTheDocument();
  });
});

describe('tp(): множественное число', () => {
  it('выбирает русские формы one/few/many', () => {
    expect(tp('layoutSettings.columnsCount', 1, undefined, 'ru')).toBe('1 колонка');
    expect(tp('layoutSettings.columnsCount', 24, undefined, 'ru')).toBe('24 колонки');
    expect(tp('layoutSettings.columnsCount', 12, undefined, 'ru')).toBe('12 колонок');
  });

  it('выбирает английские формы one/other', () => {
    expect(tp('layoutSettings.columnsCount', 1, undefined, 'en')).toBe('1 column');
    expect(tp('layoutSettings.columnsCount', 12, undefined, 'en')).toBe('12 columns');
  });
});

describe('Виджеты на английском', () => {
  beforeEach(() => {
    useI18nStore.setState({ language: 'en' });
  });

  it('погода: описание, единицы и стороны света', () => {
    expect(getWeatherDescription(0, true, 'en')).toBe('Clear');
    expect(formatWindSpeed(10, 'kmh', 'en')).toBe('36 km/h');
    expect(getWindDirectionText(315, 'en')).toBe('NW');
  });

  it('цитаты отдаются на языке интерфейса', () => {
    expect(getQuotes('en')[0].text).toBe('Simplicity is prerequisite for reliability.');
  });

  it('форма настроек переводит подписи манифеста', () => {
    render(
      <WidgetSettingsForm
        schema={clockManifest.settingsSchema ?? []}
        values={{}}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText('Clock face style')).toBeInTheDocument();
  });
});
