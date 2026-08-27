import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTranslation, useI18nStore } from '@/core/i18n';

describe('useTranslation Hook', () => {
  beforeEach(() => {
    localStorage.clear();
    act(() => {
      useI18nStore.getState().setLanguage('ru');
    });
  });

  it('должен возвращать перевод для текущего языка (ru по умолчанию)', () => {
    const { result } = renderHook(() => useTranslation());

    expect(result.current.language).toBe('ru');
    expect(result.current.t('common.save')).toBe('Сохранить');
    expect(result.current.t('widgets.clock')).toBe('Часы');
  });

  it('при смене языка через setLanguage должен реактивно обновлять перевод', () => {
    const { result } = renderHook(() => useTranslation());

    act(() => {
      result.current.setLanguage('en');
    });

    expect(result.current.language).toBe('en');
    expect(result.current.t('common.save')).toBe('Save');
    expect(result.current.t('widgets.clock')).toBe('Clock');
  });

  it('должен форматировать числа и даты с учетом текущей локали', () => {
    const { result } = renderHook(() => useTranslation());

    const numFormattedRu = result.current.formatNumber(1234567.89);
    expect(numFormattedRu).toBeDefined();

    act(() => {
      result.current.setLanguage('en');
    });

    const numFormattedEn = result.current.formatNumber(1234567.89);
    expect(numFormattedEn).toBe('1,234,567.89');
  });

  it('должен определять плюральную форму для текущего языка', () => {
    const { result } = renderHook(() => useTranslation());
    expect(result.current.getPluralForm(1)).toBe('one');
    expect(result.current.getPluralForm(2)).toBe('few');
    expect(result.current.getPluralForm(5)).toBe('many');
  });
});
