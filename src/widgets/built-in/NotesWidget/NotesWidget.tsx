import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from '@/core/i18n';
import { Eye, Edit3, Check } from 'lucide-react';
import type { WidgetProps } from '@/core/widget';
import { StorageAdapter } from '@/core/storage/StorageAdapter';
import { STORAGE_KEYS } from '@/core/storage/keys';
import { cn } from '@/ui/lib/cn';
import type { NotesSettings } from './types';
import { runLogged } from '@/core/observability';

export const NotesWidget: React.FC<WidgetProps<NotesSettings>> = ({
  instanceId,
  settings,
  onUpdateSettings,
}) => {
  const { t, tp } = useTranslation();
  const [content, setContent] = useState('');
  const [mode, setMode] = useState<'edit' | 'preview'>(settings?.defaultMode || 'edit');
  const [isSaved, setIsSaved] = useState(true);
  const fontSize = settings?.fontSize || 13;
  const showWordCount = settings?.showWordCount !== false;
  const showSaveStatus = settings?.showSaveStatus !== false;
  const fontFamily = settings?.fontFamily || 'sans';
  const lineWrapping = settings?.lineWrapping !== false;
  const showCharCount = settings?.showCharCount !== false;

  const fontClass = {
    sans: 'font-sans',
    mono: 'font-mono text-13 leading-relaxed',
    serif: 'font-serif',
  }[fontFamily];

  const wrapClass = lineWrapping ? 'whitespace-pre-wrap' : 'whitespace-pre overflow-x-auto';

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const storageKey = instanceId ? `${STORAGE_KEYS.NOTES_CONTENT}_${instanceId}` : STORAGE_KEYS.NOTES_CONTENT;

  useEffect(() => {
    if (settings?.defaultMode) {
      setMode(settings.defaultMode);
    }
  }, [settings?.defaultMode]);

  // Стартовая заметка становится данными пользователя — на языке интерфейса в момент создания.
  // Язык читается один раз при загрузке, поэтому t намеренно не в зависимостях эффекта
  const seedNote = useRef(t('notes.seed'));

  useEffect(() => {
    let cancelled = false;
    const loadNote = async () => {
      const saved = await StorageAdapter.get<string>(storageKey, '');
      const value =
        saved || (await StorageAdapter.get<string>(STORAGE_KEYS.NOTES_CONTENT, seedNote.current));
      if (!cancelled) setContent(value);
    };
    runLogged(loadNote(), 'storage', { widget: 'notes' });
    return () => {
      cancelled = true;
    };
  }, [storageKey]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);
    setIsSaved(false);

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      const persist = async () => {
        await StorageAdapter.set(storageKey, val);
        // Для обратной совместимости с тестами и v1
        await StorageAdapter.set(STORAGE_KEYS.NOTES_CONTENT, val);
        setIsSaved(true);
      };
      runLogged(persist(), 'storage', { widget: 'notes' });
    }, 300);
  };

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, []);

  const charCount = content.length;
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;

  // Простой и безопасный Markdown парсер для предпросмотра
  const renderMarkdownPreview = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      if (line.startsWith('# ')) {
        return <h1 key={idx} className="text-base font-bold text-fg my-1">{line.slice(2)}</h1>;
      }
      if (line.startsWith('## ')) {
        return <h2 key={idx} className="text-sm font-semibold text-fg my-1">{line.slice(3)}</h2>;
      }
      if (line.startsWith('### ')) {
        return <h3 key={idx} className="text-xs font-semibold text-fg my-1">{line.slice(4)}</h3>;
      }
      if (line.startsWith('- [x] ') || line.startsWith('- [X] ')) {
        return (
          <div key={idx} className="flex items-center gap-2 text-xs text-fg-muted line-through my-1">
            <span className="text-success font-bold">✓</span>
            <span>{line.slice(6)}</span>
          </div>
        );
      }
      if (line.startsWith('- [ ] ')) {
        return (
          <div key={idx} className="flex items-center gap-2 text-xs text-fg my-1">
            <span className="text-fg-muted">◻</span>
            <span>{line.slice(6)}</span>
          </div>
        );
      }
      if (line.startsWith('- ')) {
        return (
          <div key={idx} className="flex items-center gap-2 text-xs text-fg my-1">
            <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
            <span>{line.slice(2)}</span>
          </div>
        );
      }
      if (!line.trim()) {
        return <div key={idx} className="h-2" />;
      }
      return (
        <p key={idx} className="text-xs text-fg leading-relaxed my-1">
          {line}
        </p>
      );
    });
  };

  return (
    <div className="flex flex-col h-full gap-2 p-3 select-none">
      {/* Шапка с переключателем режимов и статусом */}
      <div className="flex items-center justify-between pb-2 border-b border-line">
        <div className="flex items-center gap-1 bg-surface-active/60 p-0.5 rounded-xl border border-line">
          <button
            type="button"
            onClick={() => {
              setMode('edit');
              onUpdateSettings?.({ defaultMode: 'edit' });
            }}
            aria-label={t('notes.editMode')}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer',
              mode === 'edit'
                ? 'bg-surface text-primary font-semibold shadow-xs'
                : 'text-fg-muted hover:text-fg',
            )}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{t('notes.edit')}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('preview');
              onUpdateSettings?.({ defaultMode: 'preview' });
            }}
            aria-label={t('notes.previewMode')}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer',
              mode === 'preview'
                ? 'bg-surface text-primary font-semibold shadow-xs'
                : 'text-fg-muted hover:text-fg',
            )}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{t('notes.preview')}</span>
          </button>
        </div>

        {showSaveStatus && (
          <div className="flex items-center gap-1 text-2xs text-fg-dim font-medium">
            {isSaved ? (
              <span className="flex items-center gap-1 text-success">
                <Check className="w-3.5 h-3.5" /> {t('notes.saved')}
              </span>
            ) : (
              <span>{t('notes.saving')}</span>
            )}
          </div>
        )}
      </div>

      {/* Контент: Редактор или Просмотр */}
      {mode === 'edit' ? (
        <textarea
          aria-label={t('notes.text')}
          value={content}
          onChange={handleChange}
          style={{ fontSize: `${fontSize}px` }}
          placeholder={settings?.placeholder || t('notes.placeholder')}
          className={cn(
            'w-full flex-1 min-h-0 bg-transparent placeholder:text-fg-muted resize-none focus-visible:outline-none leading-relaxed',
            fontClass,
            wrapClass,
          )}
        />
      ) : (
        <div className={cn('w-full flex-1 min-h-0 overflow-y-auto pr-1', fontClass)}>
          {renderMarkdownPreview(content)}
        </div>
      )}

      {/* Футер: счетчики слов и символов */}
      {showWordCount && (
        <div className="flex items-center justify-between pt-2 border-t border-line text-2xs text-fg-muted select-none mt-auto">
          <span>{tp('notes.words', wordCount)}</span>
          {showCharCount && <span>{tp('notes.chars', charCount)}</span>}
        </div>
      )}
    </div>
  );
};
