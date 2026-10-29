import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/core/i18n';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Copy,
  Check,
  Trash2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Terminal,
  Clock,
} from 'lucide-react';
import { Button, Switch } from '@/ui/primitives';
import { crashLogger, webVitals, type CrashReport, type WebVitalsMetrics } from '@/core/observability';
import { getAllCircuitBreakers } from '@/core/network';
import {
  useFeatureFlags,
  FEATURE_FLAG_DEFINITIONS,
  type FeatureFlagKey,
} from '@/core/featureFlags';

function formatTime(timestamp: number): string {
  try {
    return new Date(timestamp).toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return '';
  }
}

export const DiagnosticsSection: React.FC = () => {
  const { t } = useTranslation();
  const [reports, setReports] = useState<CrashReport[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterLevel, setFilterLevel] = useState<'all' | 'error' | 'warning'>('all');
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedEntryId, setCopiedEntryId] = useState<string | null>(null);
  const [vitals, setVitals] = useState<WebVitalsMetrics>({
    lcp: null,
    cls: null,
    inp: null,
    domContentLoaded: null,
    loadTime: null,
  });
  const { flags, setFlag } = useFeatureFlags();

  useEffect(() => {
    setReports(crashLogger.getCrashReports());
    setVitals(webVitals.getMetrics());

    const interval = setInterval(() => {
      setReports(crashLogger.getCrashReports());
      setVitals(webVitals.getMetrics());
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const handleCopyReport = async () => {
    const reportStr = crashLogger.exportDiagnosticReport();
    await navigator.clipboard.writeText(reportStr);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleCopySingleEntry = async (report: CrashReport, e: React.MouseEvent) => {
    e.stopPropagation();
    const formatted = JSON.stringify(report, null, 2);
    await navigator.clipboard.writeText(formatted);
    setCopiedEntryId(report.id);
    setTimeout(() => setCopiedEntryId(null), 2000);
  };

  const handleClearReports = async () => {
    await crashLogger.clearCrashReports();
    setReports([]);
    setExpandedId(null);
  };

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const circuitBreakers = getAllCircuitBreakers();
  const isHealthy = reports.length === 0;

  const filteredReports = reports.filter((r) => {
    if (filterLevel === 'all') return true;
    if (filterLevel === 'error') return r.level === 'error' || r.level === 'fatal';
    if (filterLevel === 'warning') return r.level === 'warning';
    return true;
  });

  const errorCount = reports.filter((r) => r.level === 'error' || r.level === 'fatal').length;
  const warningCount = reports.filter((r) => r.level === 'warning').length;

  return (
    <div className="space-y-4">
      {/* Карточка 1: Статус здоровья и Web Vitals */}
      <div className="p-4 rounded-xl bg-surface border border-line space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-fg">
            <Activity className="w-4 h-4 text-primary" />
            <span>{t('diagnostics.healthTitle')}</span>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
              isHealthy
                ? 'bg-success/10 text-success border-success/30'
                : 'bg-warning/10 text-warning border-warning/30'
            }`}
          >
            {isHealthy ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{t('diagnostics.stable')}</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{t('diagnostics.events', { count: reports.length })}</span>
              </>
            )}
          </span>
        </div>

        {/* Метрики Web Vitals и Память */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          <div className="p-2 rounded-lg bg-surface-active/60 border border-line text-center">
            <span className="text-2xs text-fg-muted uppercase tracking-wider block">{t('diagnostics.lcp')}</span>
            <span className="text-xs font-bold text-fg font-mono">
              {vitals.lcp !== null ? t('diagnostics.ms', { value: vitals.lcp }) : '—'}
            </span>
          </div>

          <div className="p-2 rounded-lg bg-surface-active/60 border border-line text-center">
            <span className="text-2xs text-fg-muted uppercase tracking-wider block">{t('diagnostics.cls')}</span>
            <span className="text-xs font-bold text-fg font-mono">
              {vitals.cls !== null ? vitals.cls : '0.00'}
            </span>
          </div>

          <div className="p-2 rounded-lg bg-surface-active/60 border border-line text-center">
            <span className="text-2xs text-fg-muted uppercase tracking-wider block">{t('diagnostics.domReady')}</span>
            <span className="text-xs font-bold text-fg font-mono">
              {vitals.domContentLoaded !== null ? t('diagnostics.ms', { value: vitals.domContentLoaded }) : '—'}
            </span>
          </div>

          <div className="p-2 rounded-lg bg-surface-active/60 border border-line text-center">
            <span className="text-2xs text-fg-muted uppercase tracking-wider block">{t('diagnostics.memory')}</span>
            <span className="text-xs font-bold text-fg font-mono">
              {vitals.memory?.usedJSHeapSizeMb ? t('diagnostics.mb', { value: vitals.memory.usedJSHeapSizeMb }) : '—'}
            </span>
          </div>
        </div>

        {/* Статус Circuit Breakers */}
        {circuitBreakers.length > 0 && (
          <div className="pt-2 border-t border-line text-xs flex flex-wrap items-center gap-3">
            <span className="text-fg-muted text-2xs font-medium">{t('diagnostics.breakers')}</span>
            {circuitBreakers.map((cb) => (
              <span
                key={cb.name}
                className="inline-flex items-center gap-1.5 text-2xs px-2 py-0.5 rounded bg-surface-active text-fg border border-line"
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    cb.getState() === 'CLOSED'
                      ? 'bg-success'
                      : cb.getState() === 'HALF_OPEN'
                        ? 'bg-warning animate-pulse'
                        : 'bg-danger animate-pulse'
                  }`}
                />
                <span className="font-mono">{cb.name}</span>
                <span className="text-2xs text-fg-muted">({cb.getState()})</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Карточка 2: Журнал событий и логов (Live Log Viewer) */}
      <div className="p-4 rounded-xl bg-surface border border-line space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-fg">
            <Terminal className="w-4 h-4 text-primary" />
            <span>{t('diagnostics.logTitle')}</span>
            {reports.length > 0 && (
              <span className="text-xs px-2 py-0.2 rounded-full bg-surface-active border border-line font-mono text-fg-muted">
                {reports.length}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              icon={copiedAll ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
              onClick={handleCopyReport}
            >
              {copiedAll ? t('diagnostics.reportCopied') : t('diagnostics.copyReport')}
            </Button>

            {reports.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                icon={<Trash2 className="w-3.5 h-3.5" />}
                onClick={handleClearReports}
              >
                {t('diagnostics.clear')}
              </Button>
            )}
          </div>
        </div>

        {/* Фильтры по уровню */}
        {reports.length > 0 && (
          <div className="flex items-center gap-1.5 pt-1 text-xs">
            <button
              type="button"
              onClick={() => setFilterLevel('all')}
              className={`px-2.5 py-1 rounded-lg border transition-colors cursor-pointer text-xs ${
                filterLevel === 'all'
                  ? 'bg-primary text-primary-fg border-primary font-semibold'
                  : 'bg-surface-active text-fg-muted border-line hover:text-fg'
              }`}
            >
              {t('diagnostics.filterAll', { count: reports.length })}
            </button>
            {errorCount > 0 && (
              <button
                type="button"
                onClick={() => setFilterLevel('error')}
                className={`px-2.5 py-1 rounded-lg border transition-colors cursor-pointer text-xs ${
                  filterLevel === 'error'
                    ? 'bg-danger text-white border-danger font-semibold'
                    : 'bg-surface-active text-danger border-line hover:bg-danger/10'
                }`}
              >
                {t('diagnostics.filterErrors', { count: errorCount })}
              </button>
            )}
            {warningCount > 0 && (
              <button
                type="button"
                onClick={() => setFilterLevel('warning')}
                className={`px-2.5 py-1 rounded-lg border transition-colors cursor-pointer text-xs ${
                  filterLevel === 'warning'
                    ? 'bg-warning text-black border-warning font-semibold'
                    : 'bg-surface-active text-warning border-line hover:bg-warning/10'
                }`}
              >
                {t('diagnostics.filterWarnings', { count: warningCount })}
              </button>
            )}
          </div>
        )}

        {/* Список логов */}
        {reports.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-6 text-center space-y-2 rounded-xl bg-surface-active/30 border border-line/60">
            <CheckCircle2 className="w-8 h-8 text-success/80" />
            <p className="text-xs font-semibold text-fg">{t('diagnostics.logEmptyTitle')}</p>
            <p className="text-2xs text-fg-muted max-w-sm">
              {t('diagnostics.logEmptyDescription')}
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {filteredReports.map((report) => {
              const isExpanded = expandedId === report.id;
              const isError = report.level === 'error' || report.level === 'fatal';

              return (
                <div
                  key={report.id}
                  className={`rounded-xl border transition-all text-xs overflow-hidden ${
                    isExpanded
                      ? 'bg-surface-active border-primary/40 shadow-1'
                      : 'bg-surface-active/50 border-line/70 hover:border-line'
                  }`}
                >
                  {/* Заголовок строки лога */}
                  <div
                    onClick={() => toggleExpand(report.id)}
                    className="flex items-start justify-between p-3 gap-2 cursor-pointer select-none"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleExpand(report.id);
                      }
                    }}
                  >
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <div className="mt-0.5 shrink-0">
                        {isError ? (
                          <AlertCircle className="w-4 h-4 text-danger" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-warning" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`px-1.5 py-0.2 rounded text-2xs font-bold uppercase tracking-wider border ${
                              isError
                                ? 'bg-danger/15 text-danger border-danger/30'
                                : 'bg-warning/15 text-warning border-warning/30'
                            }`}
                          >
                            {report.level}
                          </span>

                          <span className="px-1.5 py-0.2 rounded text-2xs font-mono bg-surface border border-line text-fg-muted">
                            {report.context}
                          </span>

                          <span className="inline-flex items-center gap-1 text-2xs text-fg-dim font-mono">
                            <Clock className="w-3 h-3" />
                            {formatTime(report.timestamp)}
                          </span>
                        </div>

                        <p className="font-medium text-fg wrap-break-word text-xs leading-snug">
                          {report.message}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      <button
                        type="button"
                        onClick={(e) => void handleCopySingleEntry(report, e)}
                        className="p-1 rounded text-fg-muted hover:text-fg hover:bg-surface border border-transparent hover:border-line transition-colors"
                        title={t('diagnostics.copyEntry')}
                        aria-label={t('diagnostics.copyEntry')}
                      >
                        {copiedEntryId === report.id ? (
                          <Check className="w-3.5 h-3.5 text-success" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>

                      <div className="text-fg-muted p-1">
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Раскрытое тело с деталями */}
                  {isExpanded && (
                    <div className="px-3 pb-3 pt-1 border-t border-line/50 space-y-2.5 bg-canvas/30">
                      {/* Мета-параметры */}
                      {report.meta && Object.keys(report.meta).length > 0 && (
                        <div className="space-y-1">
                          <span className="text-2xs font-semibold uppercase tracking-wider text-fg-muted">
                            {t('diagnostics.metadata')}
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {Object.entries(report.meta).map(([k, v]) => (
                              <span
                                key={k}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface border border-line text-2xs font-mono text-fg-muted"
                              >
                                <span className="text-fg-dim">{k}:</span>
                                <span className="text-fg font-semibold">{String(v)}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Стек-трейс */}
                      {report.stack && (
                        <div className="space-y-1">
                          <span className="text-2xs font-semibold uppercase tracking-wider text-fg-muted">
                            {t('diagnostics.stack')}
                          </span>
                          <pre className="p-2.5 rounded-lg bg-canvas text-2xs font-mono text-fg-muted overflow-x-auto whitespace-pre-wrap break-all border border-line max-h-48 leading-relaxed">
                            {report.stack}
                          </pre>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-2xs text-fg-dim pt-1 border-t border-line/40">
                        <span>{t('diagnostics.version', { version: report.version })}</span>
                        <span>ID: {report.id}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Карточка 3: Feature Flags (Флаги функциональности) */}
      <div className="p-4 rounded-xl bg-surface border border-line space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-fg">
          <Sparkles className="w-4 h-4 text-primary" />
          <span>{t('diagnostics.flagsTitle')}</span>
        </div>
        <p className="text-xs text-fg-muted">
          {t('diagnostics.flagsDescription')}
        </p>

        <div className="space-y-3 pt-1">
          {FEATURE_FLAG_DEFINITIONS.map((def) => {
            const isChecked = flags[def.key];
            return (
              <div
                key={def.key}
                className="flex items-center justify-between p-2 rounded-lg bg-surface-active/40 border border-line/60"
              >
                <div className="space-y-0.5 pr-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-fg">{t(`featureFlags.${def.key}.title`)}</span>
                    {def.isExperimental && (
                      <span className="text-2xs px-1.5 py-0.5 rounded bg-warning/15 text-warning border border-warning/30">
                        {t('diagnostics.experimental')}
                      </span>
                    )}
                  </div>
                  <p className="text-2xs text-fg-muted leading-tight">{t(`featureFlags.${def.key}.description`)}</p>
                </div>
                <Switch
                  checked={isChecked}
                  onChange={(val) => setFlag(def.key as FeatureFlagKey, val)}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
