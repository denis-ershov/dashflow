import React, { useState, useEffect } from 'react';
import { StorageAdapter } from '@/services/storage/StorageAdapter';

export const NotesWidget: React.FC = () => {
  const [content, setContent] = useState('');

  useEffect(() => {
    StorageAdapter.get<string>('widget_notes_text', 'Добро пожаловать в заметки DashFlow!').then(
      setContent
    );
  }, []);

  const handleChange = async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);
    await StorageAdapter.set('widget_notes_text', val);
  };

  return (
    <div className="flex flex-col h-full">
      <textarea
        value={content}
        onChange={handleChange}
        placeholder="Напишите здесь что-нибудь..."
        className="w-full h-full bg-transparent text-xs text-[var(--color-text)] placeholder-[var(--color-text-muted)] resize-none focus:outline-none leading-relaxed font-sans"
      />
    </div>
  );
};
