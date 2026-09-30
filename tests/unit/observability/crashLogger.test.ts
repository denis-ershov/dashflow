import { describe, it, expect, beforeEach } from 'vitest';
import { crashLogger } from '@/core/observability/crashLogger';
import { sanitizeString, sanitizeMeta } from '@/core/observability/sanitizer';

describe('Observability: Sanitizer', () => {
  it('должен маскировать пути пользователей Windows и POSIX', () => {
    const winPath = 'Error at C:\\Users\\Administrator\\AppData\\Local\\Temp\\file.ts';
    const posixPath = 'Error at /home/john_doe/dashflow/index.ts';

    expect(sanitizeString(winPath)).toContain('C:\\Users\\[REDACTED]');
    expect(sanitizeString(posixPath)).toContain('/home/[REDACTED]');
  });

  it('должен маскировать email-адреса и секретные токены в URL', () => {
    const textWithEmail = 'Sent report to admin@example.com successfully';
    const urlWithToken = 'https://api.example.com/data?token=secret123&apiKey=supersecret456&foo=bar';

    expect(sanitizeString(textWithEmail)).toContain('[EMAIL_REDACTED]');
    expect(sanitizeString(urlWithToken)).toContain('token=[TOKEN_REDACTED]');
    expect(sanitizeString(urlWithToken)).toContain('apiKey=[TOKEN_REDACTED]');
    expect(sanitizeString(urlWithToken)).toContain('foo=bar');
  });

  it('должен корректно санитизировать метаданные', () => {
    const meta = {
      userEmail: 'user@test.org',
      count: 42,
      active: true,
    };
    const sanitized = sanitizeMeta(meta);
    expect(sanitized?.userEmail).toBe('[EMAIL_REDACTED]');
    expect(sanitized?.count).toBe(42);
    expect(sanitized?.active).toBe(true);
  });
});

describe('Observability: CrashLoggerService', () => {
  beforeEach(async () => {
    await crashLogger.clearCrashReports();
  });

  it('должен логировать ошибки с правильным уровнем и контекстом', () => {
    const report = crashLogger.logError(new Error('Тестовая ошибка рендеринга'), 'widget', {
      widgetId: 'clock',
    });

    expect(report.id).toBeDefined();
    expect(report.level).toBe('error');
    expect(report.context).toBe('widget');
    expect(report.message).toBe('Тестовая ошибка рендеринга');
    expect(report.meta?.widgetId).toBe('clock');

    const reports = crashLogger.getCrashReports();
    expect(reports.length).toBe(1);
    expect(reports[0].id).toBe(report.id);
  });

  it('должен логировать предупреждения', () => {
    const report = crashLogger.logWarning('Сетевой сбой при обращении к API', 'network');
    expect(report.level).toBe('warning');
    expect(report.context).toBe('network');
    expect(report.message).toBe('Сетевой сбой при обращении к API');
  });

  it('должен ограничивать максимальное число отчетов до 20 (кольцевой буфер)', () => {
    for (let i = 0; i < 25; i++) {
      crashLogger.logError(new Error(`Ошибка #${i}`), 'general');
    }

    const reports = crashLogger.getCrashReports();
    expect(reports.length).toBe(20);
    expect(reports[reports.length - 1].message).toBe('Ошибка #24');
    expect(reports[0].message).toBe('Ошибка #5');
  });

  it('должен очищать журнал отчетов', async () => {
    crashLogger.logError(new Error('Тест'), 'general');
    expect(crashLogger.getCrashReports().length).toBe(1);

    await crashLogger.clearCrashReports();
    expect(crashLogger.getCrashReports().length).toBe(0);
  });

  it('должен генерировать валидный JSON диагностического отчета', () => {
    crashLogger.logError(new Error('Сбой для экспорта'), 'root');
    const jsonStr = crashLogger.exportDiagnosticReport();

    expect(() => {
      JSON.parse(jsonStr);
    }).not.toThrow();
    const parsed = JSON.parse(jsonStr) as {
      appVersion: string;
      crashCount: number;
      crashes: Array<{ message: string }>;
    };
    expect(parsed.appVersion).toBeDefined();
    expect(parsed.crashCount).toBe(1);
    expect(parsed.crashes[0].message).toBe('Сбой для экспорта');
  });
});
