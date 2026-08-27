import React, { useState, useEffect, useRef } from 'react';
import type { WidgetProps } from '@/core/widget';
import { StorageAdapter } from '@/core/storage/StorageAdapter';
import { STORAGE_KEYS } from '@/core/storage/keys';
import type { NotesSettings } from './types';

const DEFAULT_NOTE = 'Добро пожаловать в заметки DashFlow!';

export const NotesWidget: React.FC<WidgetProps<NotesSettings>> = ({ settings }) => {
  const [content, setContent] = useState('');
  const fontSize = settings?.fontSize || 13;
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    StorageAdapter.get<string>(STORAGE_KEYS.NOTES_CONTENT, DEFAULT_NOTE).then(setContent);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(async () => {
      await StorageAdapter.set(STORAGE_KEYS.NOTES_CONTENT, val);
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

  return (
    <div className="flex flex-col h-full p-3 select-text">
      <textarea
        aria-label="Текст заметки"
        value={content}
        onChange={handleChange}
        style={{ fontSize: `${fontSize}px` }}
        placeholder={settings?.placeholder || 'Напишите здесь что-нибудь...'}
        className="w-full flex-1 bg-transparent text-fg placeholder:text-fg-muted resize-none focus-visible:outline-none leading-relaxed font-sans"
      />
      <div className="flex items-center justify-between pt-2 border-t border-line/30 text-[10px] text-fg-muted select-none">
        <span>{wordCount} слов</span>
        <span>{charCount} символов</span>
      </div>
    </div>
  );
};
