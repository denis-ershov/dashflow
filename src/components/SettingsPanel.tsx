import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  X, 
  Settings, 
  Palette, 
  Globe, 
  Layout, 
  Download, 
  Upload,
  RotateCcw,
  Sun,
  Moon,
  Monitor
} from 'lucide-react';
import { useThemeStore } from '../store/themeStore';
import { useDashboardStore } from '../store/dashboardStore';

interface SettingsPanelProps {
  isOpen?: boolean;
  onClose?: () => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ 
  isOpen = false, 
  onClose = () => {} 
}) => {
  const { t, i18n } = useTranslation(['common', 'settings']);
  const [activeTab, setActiveTab] = useState<'general' | 'appearance' | 'layout' | 'data'>('general');
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  
  const { theme, setTheme } = useThemeStore();
  const { 
    gridSize, 
    layoutLocked, 
    showGrid,
    backgroundImage,
    backgroundColor,
    customCSS,
    setGridSize,
    toggleLayoutLock,
    toggleGrid,
    setBackgroundImage,
    setBackgroundColor,
    setCustomCSS,
    resetLayout,
    exportConfig,
    importConfig
  } = useDashboardStore();

  if (!isOpen) return null;

  const handleLanguageChange = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  const handleExportConfig = () => {
    const config = exportConfig();
    const blob = new Blob([config], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard-config-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportConfig = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const config = e.target?.result as string;
        importConfig(config);
      } catch (error) {
        alert('Ошибка при импорте конфигурации');
      }
    };
    reader.readAsText(file);
  };

  const handleResetLayout = () => {
    resetLayout();
    setShowConfirmReset(false);
  };

  const tabs = [
    { key: 'general' as const, label: 'Основные', icon: <Settings size={16} /> },
    { key: 'appearance' as const, label: 'Внешний вид', icon: <Palette size={16} /> },
    { key: 'layout' as const, label: 'Макет', icon: <Layout size={16} /> },
    { key: 'data' as const, label: 'Данные', icon: <Download size={16} /> }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-dark-shadow rounded-2xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden animate-scale-in">
        {/* Заголовок */}
        <div className="flex items-center justify-between p-6 border-b border-light-shadow/20 dark:border-dark-accent/20">
          <h2 className="text-2xl font-bold text-light-text dark:text-dark-light flex items-center space-x-2">
            <div className="text-2xl">⚡</div>
            <span>DashFlow {t('settings')}</span>
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-light-shadow/20 dark:hover:bg-dark-accent/20 rounded-lg transition-colors"
          >
            <X size={24} className="text-light-shadow dark:text-dark-light" />
          </button>
        </div>

        <div className="flex">
          {/* Боковая панель с вкладками */}
          <div className="w-48 p-4 bg-light-bg dark:bg-dark-bg border-r border-light-shadow/20 dark:border-dark-accent/20">
            <div className="space-y-1">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    activeTab === tab.key
                      ? 'bg-light-accent dark:bg-dark-accent text-white'
                      : 'text-light-text dark:text-dark-light hover:bg-light-shadow/10 dark:hover:bg-dark-accent/10'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Контент */}
          <div className="flex-1 p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
            {/* Основные настройки */}
            {activeTab === 'general' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-light-text dark:text-dark-light mb-4">
                    {t('language')}
                  </h3>
                  <div className="space-y-3">
                    <label className="flex items-center space-x-3">
                      <input
                        type="radio"
                        name="language"
                        checked={i18n.language === 'ru'}
                        onChange={() => handleLanguageChange('ru')}
                        className="text-light-accent dark:text-dark-accent"
                      />
                      <span className="text-light-text dark:text-dark-light">🇷🇺 Русский</span>
                    </label>
                    <label className="flex items-center space-x-3">
                      <input
                        type="radio"
                        name="language"
                        checked={i18n.language === 'en'}
                        onChange={() => handleLanguageChange('en')}
                        className="text-light-accent dark:text-dark-accent"
                      />
                      <span className="text-light-text dark:text-dark-light">🇺🇸 English</span>
                    </label>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-light-text dark:text-dark-light mb-4">
                    {t('theme')}
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    <button
                      onClick={() => setTheme('light')}
                      className={`flex flex-col items-center p-4 rounded-lg border-2 transition-colors ${
                        theme === 'light'
                          ? 'border-light-accent bg-light-accent/10'
                          : 'border-light-shadow/20 hover:border-light-accent/50'
                      }`}
                    >
                      <Sun size={24} className="mb-2 text-yellow-500" />
                      <span className="text-sm text-light-text dark:text-dark-light">
                        {t('light')}
                      </span>
                    </button>
                    <button
                      onClick={() => setTheme('dark')}
                      className={`flex flex-col items-center p-4 rounded-lg border-2 transition-colors ${
                        theme === 'dark'
                          ? 'border-dark-accent bg-dark-accent/10'
                          : 'border-light-shadow/20 dark:border-dark-accent/20 hover:border-dark-accent/50'
                      }`}
                    >
                      <Moon size={24} className="mb-2 text-blue-400" />
                      <span className="text-sm text-light-text dark:text-dark-light">
                        {t('dark')}
                      </span>
                    </button>
                    <button
                      onClick={() => setTheme('auto')}
                      className={`flex flex-col items-center p-4 rounded-lg border-2 transition-colors ${
                        theme === 'auto'
                          ? 'border-light-accent dark:border-dark-accent bg-light-accent/10 dark:bg-dark-accent/10'
                          : 'border-light-shadow/20 dark:border-dark-accent/20 hover:border-light-accent/50 dark:hover:border-dark-accent/50'
                      }`}
                    >
                      <Monitor size={24} className="mb-2 text-gray-500" />
                      <span className="text-sm text-light-text dark:text-dark-light">
                        {t('auto')}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Внешний вид */}
            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-light-text dark:text-dark-light mb-4">
                    Фон страницы
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm text-light-shadow dark:text-dark-light/70 mb-2">
                        URL изображения:
                      </label>
                      <input
                        type="url"
                        value={backgroundImage || ''}
                        onChange={(e) => setBackgroundImage(e.target.value)}
                        placeholder="https://example.com/image.jpg"
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-light-shadow dark:text-dark-light/70 mb-2">
                        Цвет фона:
                      </label>
                      <input
                        type="color"
                        value={backgroundColor || '#F5FAFD'}
                        onChange={(e) => setBackgroundColor(e.target.value)}
                        className="w-16 h-10 border border-light-shadow/30 dark:border-dark-accent/30 rounded cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-light-text dark:text-dark-light mb-4">
                    Пользовательские стили (CSS)
                  </h3>
                  <textarea
                    value={customCSS}
                    onChange={(e) => setCustomCSS(e.target.value)}
                    placeholder="/* Введите ваши CSS стили */&#10;.widget-container {&#10;  border-radius: 20px;&#10;}"
                    className="input-field font-mono text-sm h-32 resize-none"
                  />
                  <p className="text-xs text-light-shadow dark:text-dark-light/70 mt-2">
                    Будьте осторожны с пользовательскими стилями. Неправильный CSS может нарушить внешний вид страницы.
                  </p>
                </div>
              </div>
            )}

            {/* Макет */}
            {activeTab === 'layout' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-light-text dark:text-dark-light mb-4">
                    Размер сетки
                  </h3>
                  <div className="flex space-x-3">
                    {[12, 16, 24].map(size => (
                      <button
                        key={size}
                        onClick={() => setGridSize(size as 12 | 16 | 24)}
                        className={`px-4 py-2 rounded-lg border transition-colors ${
                          gridSize === size
                            ? 'border-light-accent dark:border-dark-accent bg-light-accent/10 dark:bg-dark-accent/10 text-light-accent dark:text-dark-accent'
                            : 'border-light-shadow/20 dark:border-dark-accent/20 text-light-text dark:text-dark-light hover:border-light-accent/50 dark:hover:border-dark-accent/50'
                        }`}
                      >
                        {size} колонок
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={!layoutLocked}
                      onChange={toggleLayoutLock}
                      className="text-light-accent dark:text-dark-accent"
                    />
                    <span className="text-light-text dark:text-dark-light">
                      Разрешить перемещение виджетов
                    </span>
                  </label>

                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={showGrid}
                      onChange={toggleGrid}
                      className="text-light-accent dark:text-dark-accent"
                    />
                    <span className="text-light-text dark:text-dark-light">
                      Показывать сетку
                    </span>
                  </label>
                </div>
              </div>
            )}

            {/* Данные */}
            {activeTab === 'data' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-light-text dark:text-dark-light mb-4">
                    Резервное копирование
                  </h3>
                  <div className="space-y-3">
                    <button
                      onClick={handleExportConfig}
                      className="btn-primary inline-flex items-center space-x-2"
                    >
                      <Download size={16} />
                      <span>Экспортировать настройки</span>
                    </button>
                    
                    <div>
                      <input
                        type="file"
                        id="import-config"
                        accept=".json"
                        onChange={handleImportConfig}
                        className="hidden"
                      />
                      <label
                        htmlFor="import-config"
                        className="btn-secondary inline-flex items-center space-x-2 cursor-pointer"
                      >
                        <Upload size={16} />
                        <span>Импортировать настройки</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-light-text dark:text-dark-light mb-4">
                    Сброс настроек
                  </h3>
                  {!showConfirmReset ? (
                    <button
                      onClick={() => setShowConfirmReset(true)}
                      className="btn-secondary text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20 inline-flex items-center space-x-2"
                    >
                      <RotateCcw size={16} />
                      <span>Сбросить все настройки</span>
                    </button>
                  ) : (
                    <div className="space-y-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-lg">
                      <p className="text-red-700 dark:text-red-300 text-sm">
                        Это действие удалит все виджеты и сбросит настройки к значениям по умолчанию. Данное действие нельзя отменить.
                      </p>
                      <div className="flex space-x-2">
                        <button
                          onClick={handleResetLayout}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors"
                        >
                          Подтвердить сброс
                        </button>
                        <button
                          onClick={() => setShowConfirmReset(false)}
                          className="px-3 py-1 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-200 rounded text-sm transition-colors"
                        >
                          Отмена
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;