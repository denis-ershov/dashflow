import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useThemeStore } from '../stores/useThemeStore';
import { Button } from '@/components/ui/Button';
import { Code2, Check, RotateCcw } from 'lucide-react';

export interface CssEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CssEditorModal: React.FC<CssEditorModalProps> = ({ isOpen, onClose }) => {
  const { customCss, setCustomCss } = useThemeStore();
  const [cssCode, setCssCode] = useState(customCss);
  const [saved, setSaved] = useState(false);

  const handleApply = async () => {
    await setCustomCss(cssCode);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = async () => {
    setCssCode('');
    await setCustomCss('');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Редактор Пользовательского CSS" maxWidth="xl">
      <div className="space-y-4">
        <p className="text-xs text-[var(--color-text-muted)]">
          Введите собственные CSS правила для тонкой настройки визуальных стилей элементов DashFlow.
        </p>

        <textarea
          value={cssCode}
          onChange={(e) => setCssCode(e.target.value)}
          placeholder="/* Пример: .glass-panel { border-radius: 24px; } */"
          className="w-full h-64 bg-slate-950 font-mono text-xs text-emerald-400 border border-[var(--color-border)] rounded-xl p-4 focus:outline-none focus:border-[var(--color-primary)]"
        />

        <div className="flex items-center justify-between pt-2">
          <Button size="sm" variant="ghost" icon={<RotateCcw className="w-4 h-4" />} onClick={handleReset}>
            Сбросить стили
          </Button>

          <div className="flex space-x-2">
            <Button size="sm" variant="secondary" onClick={onClose}>
              Отмена
            </Button>
            <Button
              size="sm"
              variant="primary"
              icon={saved ? <Check className="w-4 h-4" /> : <Code2 className="w-4 h-4" />}
              onClick={handleApply}
            >
              {saved ? 'Применено!' : 'Сохранить и Применить'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
