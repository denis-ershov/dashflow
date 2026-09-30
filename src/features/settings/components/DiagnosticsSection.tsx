import React, { useState, useEffect } from 'react';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Trash2,
  Cpu,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Button, Switch } from '@/ui/primitives';
import { crashLogger, webVitals, type CrashReport, type WebVitalsMetrics } from '@/core/observability';
import { getAllCircuitBreakers } from '@/core/network';
import {
  useFeatureFlags,
  FEATURE_FLAG_DEFINITIONS,
  type FeatureFlagKey,
} from '@/core/featureFlags';

export const DiagnosticsSection: React.FC = () => {
  const [reports, setReports] = useState<CrashReport[]>([]);
  const [vitals, setVitals] = useState<WebVitalsMetrics>({
    lcp: null,
    cls: null,
    inp: null,
    domContentLoaded: null,
    loadTime: null,
  });
  const [copied, setCopied] = useState(false);
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
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClearReports = async () => {
    await crashLogger.clearCrashReports();
    setReports([]);
  };

  const circuitBreakers = getAllCircuitBreakers();

  const isHealthy = reports.length === 0;

  return (
    <div className="space-y-4">
      {/* Карточка 1: Статус здоровья и Web Vitals */}
      <div className="p-4 rounded-xl bg-surface border border-line space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-fg">
            <Activity className="w-4 h-4 text-primary" />
            <span>Техническое здоровье системы</span>
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
                <span>Система стабильна</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Ошибок в журнале: {reports.length}</span>
              </>
            )}
          </span>
        </div>

        {/* Метрики Web Vitals и Память */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          <div className="p-2 rounded-lg bg-surface-elevated/60 border border-line text-center">
            <span className="text-[10px] text-fg-muted uppercase tracking-wider block">LCP Скорость</span>
            <span className="text-xs font-bold text-fg font-mono">
              {vitals.lcp !== null ? `${vitals.lcp} мс` : '—'}
            </span>
          </div>

          <div className="p-2 rounded-lg bg-surface-elevated/60 border border-line text-center">
            <span className="text-[10px] text-fg-muted uppercase tracking-wider block">CLS Сдвиг</span>
            <span className="text-xs font-bold text-fg font-mono">
              {vitals.cls !== null ? vitals.cls : '0.00'}
            </span>
          </div>

          <div className="p-2 rounded-lg bg-surface-elevated/60 border border-line text-center">
            <span className="text-[10px] text-fg-muted uppercase tracking-wider block">DOM Готовность</span>
            <span className="text-xs font-bold text-fg font-mono">
              {vitals.domContentLoaded !== null ? `${vitals.domContentLoaded} мс` : '—'}
            </span>
          </div>

          <div className="p-2 rounded-lg bg-surface-elevated/60 border border-line text-center">
            <span className="text-[10px] text-fg-muted uppercase tracking-wider block">Память JS Heap</span>
            <span className="text-xs font-bold text-fg font-mono">
              {vitals.memory?.usedJSHeapSizeMb ? `${vitals.memory.usedJSHeapSizeMb} МБ` : '—'}
            </span>
          </div>
        </div>

        {/* Статус Circuit Breakers */}
        {circuitBreakers.length > 0 && (
          <div className="pt-2 border-t border-line text-xs flex flex-wrap items-center gap-3">
            <span className="text-fg-muted text-[11px] font-medium">Сетевые предохранители:</span>
            {circuitBreakers.map((cb) => (
              <span
                key={cb.name}
                className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-surface-elevated text-fg border border-line"
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    cb.getState() === 'CLOSED' ? 'bg-success' : 'bg-danger animate-pulse'
                  }`}
                />
                <span className="font-mono">{cb.name}</span>
              </span>
            ))}
          </div>
        )}

        {/* Действия с журналом */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-line">
          <Button
            size="sm"
            variant="secondary"
            icon={<Copy className="w-3.5 h-3.5" />}
            onClick={handleCopyReport}
          >
            {copied ? 'Отчёт скопирован!' : 'Скопировать отчёт для GitHub'}
          </Button>

          {reports.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              icon={<Trash2 className="w-3.5 h-3.5" />}
              onClick={handleClearReports}
            >
              Очистить журнал
            </Button>
          )}
        </div>
      </div>

      {/* Карточка 2: Feature Flags (Флаги функциональности) */}
      <div className="p-4 rounded-xl bg-surface border border-line space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-fg">
          <Sparkles className="w-4 h-4 text-primary" />
          <span>Флаги функциональности и эксперименты</span>
        </div>
        <p className="text-xs text-fg-muted">
          Управление экспериментальными и опциональными возможностями расширения
        </p>

        <div className="space-y-3 pt-1">
          {FEATURE_FLAG_DEFINITIONS.map((def) => {
            const isChecked = flags[def.key];
            return (
              <div
                key={def.key}
                className="flex items-center justify-between p-2 rounded-lg bg-surface-elevated/40 border border-line/60"
              >
                <div className="space-y-0.5 pr-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-fg">{def.title}</span>
                    {def.isExperimental && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                        Beta
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-fg-muted leading-tight">{def.description}</p>
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
