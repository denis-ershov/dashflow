import { StorageAdapter, STORAGE_KEYS } from '@/core/storage';
import { sanitizeString, sanitizeMeta } from './sanitizer';
import type { CrashReport, CrashLevel, CrashContext } from './types';

const MAX_REPORTS = 20;
const APP_VERSION = '3.7.2';

class CrashLoggerService {
  private inMemoryReports: CrashReport[] = [];
  private isLoaded = false;
  private saveDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.loadFromStorage().catch(() => {
      // Игнорируем ошибку при первичной загрузке
    });
  }

  private async loadFromStorage(): Promise<void> {
    if (this.isLoaded) return;
    try {
      const stored = await StorageAdapter.get<CrashReport[]>(STORAGE_KEYS.CRASH_LOGS_V1, []);
      if (Array.isArray(stored)) {
        this.inMemoryReports = stored.slice(-MAX_REPORTS);
      }
    } catch {
      this.inMemoryReports = [];
    } finally {
      this.isLoaded = true;
    }
  }

  private scheduleSave(): void {
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
    }
    this.saveDebounceTimer = setTimeout(() => {
      void StorageAdapter.set(STORAGE_KEYS.CRASH_LOGS_V1, this.inMemoryReports);
    }, 500);
  }

  public logError(
    error: unknown,
    context: CrashContext = 'general',
    meta?: Record<string, string | number | boolean>,
  ): CrashReport {
    return this.record(error, 'error', context, meta);
  }

  public logWarning(
    message: string,
    context: CrashContext = 'general',
    meta?: Record<string, string | number | boolean>,
  ): CrashReport {
    return this.record(new Error(message), 'warning', context, meta);
  }

  public logFatal(
    error: unknown,
    context: CrashContext = 'root',
    meta?: Record<string, string | number | boolean>,
  ): CrashReport {
    return this.record(error, 'fatal', context, meta);
  }

  private record(
    err: unknown,
    level: CrashLevel,
    context: CrashContext,
    meta?: Record<string, string | number | boolean>,
  ): CrashReport {
    const errorObj = err instanceof Error ? err : new Error(String(err));
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown';

    const report: CrashReport = {
      id: `crash_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
      level,
      context,
      name: sanitizeString(errorObj.name || 'Error'),
      message: sanitizeString(errorObj.message || 'Unknown error'),
      stack: sanitizeString(errorObj.stack),
      meta: sanitizeMeta(meta),
      version: APP_VERSION,
      userAgent: sanitizeString(userAgent),
    };

    this.inMemoryReports.push(report);
    if (this.inMemoryReports.length > MAX_REPORTS) {
      this.inMemoryReports = this.inMemoryReports.slice(-MAX_REPORTS);
    }

    this.scheduleSave();
    return report;
  }

  public getCrashReports(): CrashReport[] {
    return [...this.inMemoryReports];
  }

  public async clearCrashReports(): Promise<void> {
    this.inMemoryReports = [];
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
    }
    await StorageAdapter.set(STORAGE_KEYS.CRASH_LOGS_V1, []);
  }

  public exportDiagnosticReport(): string {
    const reportData = {
      exportedAt: new Date().toISOString(),
      appVersion: APP_VERSION,
      platform: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
      online: typeof navigator !== 'undefined' ? navigator.onLine : true,
      screenResolution:
        typeof window !== 'undefined'
          ? `${window.screen.width}x${window.screen.height} (dpr: ${window.devicePixelRatio})`
          : 'Unknown',
      crashCount: this.inMemoryReports.length,
      crashes: this.inMemoryReports,
    };

    return JSON.stringify(reportData, null, 2);
  }
}

export const crashLogger = new CrashLoggerService();
