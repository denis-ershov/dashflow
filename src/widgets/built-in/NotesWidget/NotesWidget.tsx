import React, { useState, useEffect, useRef } from 'react';
import { Eye, Edit3, Check } from 'lucide-react';
import type { WidgetProps } from '@/core/widget';
import { StorageAdapter } from '@/core/storage/StorageAdapter';
import { STORAGE_KEYS } from '@/core/storage/keys';
import { cn } from '@/ui/lib/cn';
import type { NotesSettings } from './types';

const DEFAULT_NOTE = '# Заметки DashFlow\n- [x] Опробовать новую дизайн-систему\n- [ ] Настроить звуки природы\n\nСоздавайте быстрые списки и форматируйте текст с помощью **Markdown**!';

export const NotesWidget: React.FC<WidgetProps<NotesSettings>> = ({ settings, onUpdateSettings }) => {
  const [content, setContent] = useState('');
  const [mode, setMode] = useState<'edit' | 'preview'>(settings?.defaultMode || 'edit');
  const [isSaved, setIsSaved] = useState(true);
  const fontSize = settings?.fontSize || 13;
  const showWordCount = settings?.showWordCount !== false;
  const showSaveStatus = settings?.showSaveStatus !== false;

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (settings?.defaultMode) {
      setMode(settings.defaultMode);
    }
  }, [settings?.defaultMode]);

  useEffect(() => {
    StorageAdapter.get<string>(STORAGE_KEYS.NOTES_CONTENT, DEFAULT_NOTE).then(setContent);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);
    setIsSaved(false);

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(async () => {
      await StorageAdapter.set(STORAGE_KEYS.NOTES_CONTENT, val);
      setIsSaved(true);
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
    <div className="flex flex-col h-full w-full p-2 select-none">
      {/* Верхний тулбар: Переключатель режима и статус */}
      <div className="flex items-center justify-between pb-2 border-b border-line mb-2">
        <div className="flex items-center gap-1 bg-surface p-1 rounded-xl border border-line">
          <button
            type="button"
            onClick={() => {
              setMode('edit');
              onUpdateSettings?.({ defaultMode: 'edit' });
            }}
            aria-label="Режим редактирования"
            className={cn(
              'flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer',
              mode === 'edit'
                ? 'bg-surface-hover text-primary font-semibold'
                : 'text-fg-muted hover:text-fg',
            )}
          >
            <Edit3 className="w-4 h-4" />
            <span>Правка</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('preview');
              onUpdateSettings?.({ defaultMode: 'preview' });
            }}
            aria-label="Режим предпросмотра"
            className={cn(
              'flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer',
              mode === 'preview'
                ? 'bg-surface-hover text-primary font-semibold'
                : 'text-fg-muted hover:text-fg',
            )}
          >
            <Eye className="w-4 h-4" />
            <span>Просмотр</span>
          </button>
        </div>

        {showSaveStatus && (
          <div className="flex items-center gap-1 text-[10px] text-fg-dim font-medium">
            {isSaved ? (
              <span className="flex items-center gap-1 text-success">
                <Check className="w-4 h-4" /> Сохранено
              </span>
            ) : (
              <span>Сохранение...</span>
            )}
          </div>
        )}
      </div>

      {/* Контент: Редактор или Просмотр */}
      {mode === 'edit' ? (
        <textarea
          aria-label="Текст заметки"
          value={content}
          onChange={handleChange}
          style={{ fontSize: `${fontSize}px` }}
          placeholder={settings?.placeholder || 'Напишите здесь что-нибудь...'}
          className="w-full flex-1 min-h-0 bg-transparent text-fg placeholder:text-fg-muted resize-none focus-visible:outline-none leading-relaxed font-sans"
        />
      ) : (
        <div className="w-full flex-1 min-h-0 overflow-y-auto font-sans pr-1">
          {renderMarkdownPreview(content)}
        </div>
      )}

      {/* Футер: счетчики слов и символов */}
      {showWordCount && (
        <div className="flex items-center justify-between pt-2 border-t border-line text-[10px] text-fg-muted select-none mt-auto">
          <span>{wordCount} слов</span>
          <span>{charCount} символов</span>
        </div>
      )}
    </div>
  );
};
