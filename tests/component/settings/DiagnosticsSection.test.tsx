import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DiagnosticsSection } from '@/features/settings/components/DiagnosticsSection';
import { crashLogger } from '@/core/observability';

describe('DiagnosticsSection Component (Live Log Viewer)', () => {
  beforeEach(async () => {
    await crashLogger.clearCrashReports();
    vi.clearAllMocks();
  });

  it('renders healthy state and empty log message when no crashes recorded', () => {
    render(<DiagnosticsSection />);

    expect(screen.getByText('Техническое здоровье системы')).toBeInTheDocument();
    expect(screen.getByText('Система стабильна')).toBeInTheDocument();
    expect(screen.getByText('Журнал пуст')).toBeInTheDocument();
  });

  it('renders log entries, filters by level, and expands stack trace', () => {
    // Добавляем тестовые события
    crashLogger.logWarning('Сетевой сбой при запросе', 'network', { url: 'https://api.test/data' });
    crashLogger.logError(new Error('Критический сбой рендера'), 'widget');

    render(<DiagnosticsSection />);

    // Проверяем индикатор
    expect(screen.getByText('Событий: 2')).toBeInTheDocument();
    expect(screen.getByText('Сетевой сбой при запросе')).toBeInTheDocument();
    expect(screen.getByText('Критический сбой рендера')).toBeInTheDocument();

    // Фильтр только ошибок
    const errorFilterBtn = screen.getByText(/Ошибки \(1\)/);
    fireEvent.click(errorFilterBtn);

    expect(screen.getByText('Критический сбой рендера')).toBeInTheDocument();
    expect(screen.queryByText('Сетевой сбой при запросе')).not.toBeInTheDocument();

    // Возвращаем все
    const allFilterBtn = screen.getByText(/Все \(2\)/);
    fireEvent.click(allFilterBtn);

    // Раскрываем аккордеон с ошибкой
    const errorEntry = screen.getByText('Критический сбой рендера');
    fireEvent.click(errorEntry);

    // Должен отобразиться заголовок стека
    expect(screen.getByText('Стек вызовов (Stack Trace):')).toBeInTheDocument();
  });
});
