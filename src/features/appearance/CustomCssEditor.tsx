import React, { useState } from 'react';
import { RotateCcw, Save, AlertTriangle, Check } from 'lucide-react';
import { useThemeStore } from '@/core/theme/themeStore';
import { MAX_CSS_LENGTH } from '@/core/theme/cssValidator';
import { Button } from '@/ui/primitives/Button';
import { Switch } from '@/ui/primitives/Switch';

export const CustomCssEditor: React.FC = () => {
  const customCss = useThemeStore((state) => state.customCss);
  const allowExternalCss = useThemeStore((state) => state.allowExternalCss);
  const setCustomCss = useThemeStore((state) => state.setCustomCss);
  const setAllowExternalCss = useThemeStore((state) => state.setAllowExternalCss);

  const [code, setCode] = useState(customCss);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    const result = setCustomCss(code);
    if (!result.ok) {
      setError(result.message);
      setSaved(false);
    } else {
      setError(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const handleReset = () => {
    setCode('');
    setCustomCss('');
    setError(null);
    setSaved(false);
  };

  const handleToggleExternal = (checked: boolean) => {
    setAllowExternalCss(checked);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="text-xs text-fg-muted">
          Пользовательский CSS позволяет переопределять стили интерфейса DashFlow. В целях безопасности директивы @import и невалидные селекторы блокируются.
        </p>
      </div>

      <div className="space-y-1">
        <textarea
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            if (error) setError(null);
          }}
          placeholder="/* Пример: .glass-panel { border-radius: 12px; } */"
          className="w-full h-56 bg-canvas text-fg font-mono text-xs border border-line rounded-md p-4 focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 resize-y"
        />

        <div className="flex items-center justify-between text-xs text-fg-muted px-1">
          <span>Символов: {code.length} / {MAX_CSS_LENGTH}</span>
        </div>
      </div>

      {error && (
        <div role="alert" className="p-3 rounded-md bg-danger/10 border border-danger/20 text-danger text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Переключатель внешних ресурсов */}
      <div className="p-3 rounded-md bg-surface border border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-fg">Разрешить внешние ресурсы (https)</p>
          <p className="text-xs text-fg-muted">
            Разрешает загрузку изображений и шрифтов с внешних защищённых источников по HTTPS.
          </p>
        </div>
        <Switch
          checked={allowExternalCss}
          onChange={handleToggleExternal}
          aria-label="Разрешить внешние ресурсы"
        />
      </div>

      {/* Кнопки действий */}
      <div className="flex items-center justify-between pt-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          icon={<RotateCcw className="w-4 h-4" />}
          onClick={handleReset}
        >
          Сбросить
        </Button>

        <Button
          type="button"
          variant="primary"
          size="sm"
          icon={saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          onClick={handleSave}
        >
          {saved ? 'Применено!' : 'Сохранить и применить'}
        </Button>
      </div>
    </div>
  );
};
