import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useI18nStore } from '@/core/i18n';
import { SpacesModal } from '@/features/dashboard/components/SpacesModal';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { getActiveSpace } from '../../helpers/dashboard';

describe('Создание пространства', () => {
  beforeEach(() => {
    const { resetDashboard, setActiveModal } = useDashboardStore.getState();
    resetDashboard();
    setActiveModal('spaces');
  });

  it('оставляет пустое пространство вариантом по умолчанию и требует для него имя', () => {
    useI18nStore.setState({ language: 'ru' });
    render(<SpacesModal />);
    const create = screen.getByRole('button', { name: 'Новое пространство' });
    expect(screen.getByRole('combobox', { name: 'Шаблон раскладки' })).toHaveValue('empty');
    expect(create).toBeDisabled();
    fireEvent.change(screen.getByRole('textbox', { name: 'Название пространства' }), {
      target: { value: 'Работа' },
    });
    fireEvent.click(create);
    expect(getActiveSpace()).toMatchObject({ title: 'Работа', instances: [] });
  });

  it('подставляет локализованное имя шаблона при создании без своего имени', () => {
    useI18nStore.setState({ language: 'en' });
    render(<SpacesModal />);
    fireEvent.change(screen.getByRole('combobox', { name: 'Layout preset' }), {
      target: { value: 'focus' },
    });
    expect(screen.getByText('One task list and a Pomodoro timer')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'New space' }));
    expect(getActiveSpace()).toMatchObject({ title: 'Focus', layoutMode: 'canvas' });
    expect(useDashboardStore.getState().activeModal).toBeNull();
  });
});
