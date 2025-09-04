import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Edit3, Trash2, Save, X, Search } from 'lucide-react';
import { WidgetConfig, Note } from '../../types/widget';

interface NotesWidgetProps {
  config: WidgetConfig;
}

const noteColors = [
  '#fbbf24', // yellow
  '#60a5fa', // blue
  '#34d399', // green
  '#f87171', // red
  '#a78bfa', // purple
  '#fb7185', // pink
  '#fcd34d', // amber
  '#6ee7b7'  // emerald
];

const NotesWidget: React.FC<NotesWidgetProps> = ({ config }) => {
  const { t } = useTranslation(['common', 'widgets']);
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newNote, setNewNote] = useState({ title: '', content: '', color: noteColors[0] });

  // Инициализация с демо-данными
  useEffect(() => {
    const demoNotes: Note[] = [
      {
        id: '1',
        title: 'Идеи для проекта',
        content: 'Добавить темную тему\nУлучшить анимации\nДобавить больше виджетов',
        color: noteColors[0],
        createdAt: new Date(),
        updatedAt: new Date(),
        tags: ['работа', 'проект']
      },
      {
        id: '2',
        title: 'Список покупок',
        content: 'Молоко\nХлеб\nЯблоки\nСыр\nКофе',
        color: noteColors[2],
        createdAt: new Date(),
        updatedAt: new Date(),
        tags: ['покупки']
      },
      {
        id: '3',
        title: 'Важные контакты',
        content: 'Врач: +7 999 123-45-67\nСлесарь: +7 999 765-43-21\nПиццерия: +7 999 555-55-55',
        color: noteColors[3],
        createdAt: new Date(),
        updatedAt: new Date(),
        tags: ['контакты', 'важное']
      }
    ];
    setNotes(demoNotes);
  }, []);

  const addNote = () => {
    if (!newNote.title.trim()) return;

    const note: Note = {
      id: Date.now().toString(),
      title: newNote.title.trim(),
      content: newNote.content.trim(),
      color: newNote.color,
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: []
    };

    setNotes(prev => [note, ...prev]);
    setNewNote({ title: '', content: '', color: noteColors[0] });
    setShowAddForm(false);
  };

  const updateNote = (id: string, updates: Partial<Note>) => {
    setNotes(prev => prev.map(note => 
      note.id === id 
        ? { ...note, ...updates, updatedAt: new Date() }
        : note
    ));
  };

  const deleteNote = (id: string) => {
    setNotes(prev => prev.filter(note => note.id !== id));
  };

  const saveEditingNote = () => {
    if (editingNote) {
      updateNote(editingNote.id, {
        title: editingNote.title,
        content: editingNote.content,
        color: editingNote.color
      });
      setEditingNote(null);
    }
  };

  const filteredNotes = notes.filter(note =>
    note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    note.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    note.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-4">
      {/* Поиск и добавление */}
      <div className="flex items-center space-x-2">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-light-shadow dark:text-dark-light/50" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Поиск заметок..."
            className="input-field text-sm pl-10"
          />
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="btn-primary text-xs px-3 py-2"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Форма добавления */}
      {showAddForm && (
        <div className="space-y-3 p-3 bg-light-bg dark:bg-dark-bg rounded-lg border border-light-shadow/20 dark:border-dark-accent/20">
          <input
            type="text"
            value={newNote.title}
            onChange={(e) => setNewNote(prev => ({ ...prev, title: e.target.value }))}
            placeholder={t('widgets:notes.noteTitle')}
            className="input-field text-sm"
            autoFocus
          />
          
          <textarea
            value={newNote.content}
            onChange={(e) => setNewNote(prev => ({ ...prev, content: e.target.value }))}
            placeholder={t('widgets:notes.noteContent')}
            className="input-field text-sm resize-none"
            rows={3}
          />

          <div className="flex items-center space-x-2">
            <span className="text-sm text-light-shadow dark:text-dark-light/70">Цвет:</span>
            <div className="flex space-x-1">
              {noteColors.map(color => (
                <button
                  key={color}
                  onClick={() => setNewNote(prev => ({ ...prev, color }))}
                  className={`w-6 h-6 rounded-full border-2 ${
                    newNote.color === color 
                      ? 'border-light-text dark:border-dark-light' 
                      : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <button
              onClick={() => {
                setShowAddForm(false);
                setNewNote({ title: '', content: '', color: noteColors[0] });
              }}
              className="text-xs px-2 py-1 text-light-shadow dark:text-dark-light/70 hover:bg-light-shadow/20 dark:hover:bg-dark-accent/20 rounded"
            >
              {t('cancel')}
            </button>
            <button
              onClick={addNote}
              className="btn-primary text-xs px-2 py-1"
            >
              {t('widgets:notes.saveNote')}
            </button>
          </div>
        </div>
      )}

      {/* Заметки */}
      <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto">
        {filteredNotes.length === 0 ? (
          <div className="text-center py-4 text-light-shadow dark:text-dark-light/70 text-sm">
            {searchTerm ? 'Заметки не найдены' : 'Нет заметок'}
          </div>
        ) : (
          filteredNotes.map(note => (
            <div
              key={note.id}
              className="relative p-3 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 transition-all hover:shadow-md"
              style={{ 
                backgroundColor: note.color + '20',
                borderLeftColor: note.color,
                borderLeftWidth: '4px'
              }}
            >
              {editingNote?.id === note.id ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={editingNote.title}
                    onChange={(e) => setEditingNote(prev => prev ? { ...prev, title: e.target.value } : null)}
                    className="input-field text-sm font-medium"
                  />
                  <textarea
                    value={editingNote.content}
                    onChange={(e) => setEditingNote(prev => prev ? { ...prev, content: e.target.value } : null)}
                    className="input-field text-sm resize-none"
                    rows={4}
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex space-x-1">
                      {noteColors.map(color => (
                        <button
                          key={color}
                          onClick={() => setEditingNote(prev => prev ? { ...prev, color } : null)}
                          className={`w-5 h-5 rounded-full border-2 ${
                            editingNote.color === color 
                              ? 'border-light-text dark:border-dark-light' 
                              : 'border-transparent'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => setEditingNote(null)}
                        className="p-1 hover:bg-red-500/20 rounded transition-colors"
                      >
                        <X size={14} className="text-red-500" />
                      </button>
                      <button
                        onClick={saveEditingNote}
                        className="p-1 hover:bg-green-500/20 rounded transition-colors"
                      >
                        <Save size={14} className="text-green-500" />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-medium text-light-text dark:text-dark-light text-sm line-clamp-1">
                      {note.title}
                    </h3>
                    <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setEditingNote(note)}
                        className="p-1 hover:bg-light-accent/20 dark:hover:bg-dark-accent/20 rounded transition-colors"
                      >
                        <Edit3 size={12} className="text-light-accent dark:text-dark-accent" />
                      </button>
                      <button
                        onClick={() => deleteNote(note.id)}
                        className="p-1 hover:bg-red-500/20 rounded transition-colors"
                      >
                        <Trash2 size={12} className="text-red-500" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="text-sm text-light-text dark:text-dark-light whitespace-pre-wrap line-clamp-4 mb-2">
                    {note.content}
                  </div>

                  {note.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {note.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="text-xs px-2 py-1 bg-white/50 dark:bg-black/20 rounded-full text-light-shadow dark:text-dark-light/70"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="text-xs text-light-shadow dark:text-dark-light/50">
                    {note.updatedAt.toLocaleDateString()}
                  </div>
                </>
              )}

              {/* Кнопки при наведении */}
              <div className="absolute top-2 right-2 opacity-0 hover:opacity-100 transition-opacity">
                {editingNote?.id !== note.id && (
                  <div className="flex space-x-1">
                    <button
                      onClick={() => setEditingNote(note)}
                      className="p-1 hover:bg-light-accent/20 dark:hover:bg-dark-accent/20 rounded transition-colors"
                    >
                      <Edit3 size={12} className="text-light-accent dark:text-dark-accent" />
                    </button>
                    <button
                      onClick={() => deleteNote(note.id)}
                      className="p-1 hover:bg-red-500/20 rounded transition-colors"
                    >
                      <Trash2 size={12} className="text-red-500" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Статистика */}
      <div className="text-xs text-light-shadow dark:text-dark-light/70 text-center pt-2 border-t border-light-shadow/20 dark:border-dark-accent/20">
        Всего заметок: {notes.length}
        {searchTerm && ` | Найдено: ${filteredNotes.length}`}
      </div>
    </div>
  );
};

export default NotesWidget;