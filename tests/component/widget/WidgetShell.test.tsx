import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WidgetShell } from '@/core/widget/WidgetShell';

describe('WidgetShell Component', () => {
  it('должен рендерить дочерний контент внутри panel-оболочки', () => {
    render(
      <WidgetShell instanceId="inst-1" title="Тестовый виджет" surface="panel">
        <div>Содержимое виджета</div>
      </WidgetShell>,
    );

    expect(screen.getByText('Тестовый виджет')).toBeInTheDocument();
    expect(screen.getByText('Содержимое виджета')).toBeInTheDocument();
  });

  it('в режиме chromeless не должен рендерить видимую шапку в обычном режиме', () => {
    render(
      <WidgetShell instanceId="inst-1" title="Часы" surface="chromeless" isEditMode={false}>
        <div>12:00</div>
      </WidgetShell>,
    );

    expect(screen.queryByText('Часы')).not.toBeInTheDocument();
    expect(screen.getByText('12:00')).toBeInTheDocument();
  });

  it('в режиме редактирования (isEditMode) должен отображать кнопки настроек и удаления', () => {
    const handleSettings = vi.fn();
    const handleRemove = vi.fn();

    render(
      <WidgetShell
        instanceId="inst-1"
        title="Виджет"
        surface="panel"
        isEditMode={true}
        onOpenSettings={handleSettings}
        onRemove={handleRemove}
      >
        <div>Контент</div>
      </WidgetShell>,
    );

    const settingsBtn = screen.getByLabelText(/настройки/i);
    const removeBtn = screen.getByLabelText(/удалить/i);

    expect(settingsBtn).toBeInTheDocument();
    expect(removeBtn).toBeInTheDocument();

    fireEvent.click(settingsBtn);
    expect(handleSettings).toHaveBeenCalled();

    fireEvent.click(removeBtn);
    expect(handleRemove).toHaveBeenCalled();
  });

  it('должен перехватывать ошибки рендеринга через ErrorBoundary и показывать fallback', () => {
    const FaultyComponent: React.FC = () => {
      throw new Error('Критический сбой рендеринга виджета');
    };

    // Глушим вывод console.error для ожидаемой ошибки
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <WidgetShell instanceId="faulty-1" title="Сбойный виджет" surface="panel">
        <FaultyComponent />
      </WidgetShell>,
    );

    expect(screen.getByText('Не удалось загрузить виджет')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /попробовать снова/i })).toBeInTheDocument();
    spy.mockRestore();
  });
});
