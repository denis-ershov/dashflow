import { WidgetRegistry } from '../core/WidgetRegistry';
import { ClockWidget } from './ClockWidget/ClockWidget';
import { WeatherWidget } from './WeatherWidget/WeatherWidget';
import { SearchWidget } from './SearchWidget/SearchWidget';
import { TodoWidget } from './TodoWidget/TodoWidget';
import { NotesWidget } from './NotesWidget/NotesWidget';
import { QuickLinksWidget } from './QuickLinksWidget/QuickLinksWidget';
import { BookmarksWidget } from './BookmarksWidget/BookmarksWidget';
import { IframeWidget } from './IframeWidget/IframeWidget';
import { PomodoroWidget } from './PomodoroWidget/PomodoroWidget';
import { QuotesWidget } from './QuotesWidget/QuotesWidget';
import { SystemMonitorWidget } from './SystemMonitorWidget/SystemMonitorWidget';
import { RssWidget } from '@/plugins/rss-reader/RssWidget';

export function registerBuiltInWidgets(): void {
  WidgetRegistry.register({
    id: 'clock',
    name: 'Часы и Дата',
    description: 'Цифровые часы с выбором формата 12/24ч и секундами',
    version: '1.1.0',
    iconName: 'Clock',
    category: 'utilities',
    defaultSize: { w: 4, h: 2 },
    minSize: { w: 3, h: 2 },
    settingsSchema: [
      { id: 'is24Hour', label: '24-часовой формат', type: 'boolean', defaultValue: true },
      { id: 'showSeconds', label: 'Отображать секунды', type: 'boolean', defaultValue: true },
    ],
    component: ClockWidget,
  });

  WidgetRegistry.register({
    id: 'weather',
    name: 'Погода',
    description: 'Прогноз погоды и температура от Open-Meteo',
    version: '1.1.0',
    iconName: 'CloudSun',
    category: 'utilities',
    defaultSize: { w: 4, h: 2 },
    minSize: { w: 3, h: 2 },
    settingsSchema: [
      { id: 'city', label: 'Город по умолчанию', type: 'text', defaultValue: 'Москва' },
    ],
    component: WeatherWidget,
  });

  WidgetRegistry.register({
    id: 'search',
    name: 'Поисковая Строка',
    description: 'Поиск через Google, Bing, DuckDuckGo или Yandex',
    version: '1.1.0',
    iconName: 'Search',
    category: 'utilities',
    defaultSize: { w: 4, h: 2 },
    minSize: { w: 3, h: 2 },
    settingsSchema: [
      {
        id: 'engine',
        label: 'Поисковик по умолчанию',
        type: 'select',
        defaultValue: 'google',
        options: [
          { label: 'Google', value: 'google' },
          { label: 'Yandex', value: 'yandex' },
          { label: 'DuckDuckGo', value: 'duckduckgo' },
          { label: 'Bing', value: 'bing' },
        ],
      },
    ],
    component: SearchWidget,
  });

  WidgetRegistry.register({
    id: 'todo',
    name: 'Менеджер Задач',
    description: 'Список дел с приоритетами и фильтрацией',
    version: '1.1.0',
    iconName: 'CheckSquare',
    category: 'productivity',
    defaultSize: { w: 6, h: 4 },
    minSize: { w: 4, h: 3 },
    settingsSchema: [
      {
        id: 'filter',
        label: 'Фильтр задач по умолчанию',
        type: 'select',
        defaultValue: 'all',
        options: [
          { label: 'Все задачи', value: 'all' },
          { label: 'Только активные', value: 'active' },
          { label: 'Только завершенные', value: 'completed' },
        ],
      },
    ],
    component: TodoWidget,
  });

  WidgetRegistry.register({
    id: 'notes',
    name: 'Заметки',
    description: 'Быстрые заметки с автосохранением',
    version: '1.1.0',
    iconName: 'FileText',
    category: 'productivity',
    defaultSize: { w: 6, h: 4 },
    minSize: { w: 4, h: 3 },
    component: NotesWidget,
  });

  WidgetRegistry.register({
    id: 'quickLinks',
    name: 'Быстрые Ссылки',
    description: 'Плитка любимых сайтов с фавиконками',
    version: '1.1.0',
    iconName: 'Link',
    category: 'productivity',
    defaultSize: { w: 6, h: 3 },
    minSize: { w: 4, h: 2 },
    component: QuickLinksWidget,
  });

  WidgetRegistry.register({
    id: 'bookmarks',
    name: 'Закладки Chrome',
    description: 'Гибкие закладки браузера: одиночная плитка 1x1, папки, импорт и стили (Плитки/Таблица/Список)',
    version: '2.0.0',
    iconName: 'Bookmark',
    category: 'productivity',
    defaultSize: { w: 6, h: 4 },
    minSize: { w: 1, h: 1 },
    permissions: ['bookmarks'],
    settingsSchema: [
      {
        id: 'mode',
        label: 'Режим закладок',
        type: 'select',
        defaultValue: 'folder',
        options: [
          { label: 'Папка закладок браузера', value: 'folder' },
          { label: 'Одиночная закладка (Плитка 1x1)', value: 'single' },
        ],
      },
      {
        id: 'viewMode',
        label: 'Стиль отображения группы',
        type: 'select',
        defaultValue: 'tiles',
        options: [
          { label: 'Плиточная сетка', value: 'tiles' },
          { label: 'Компактный список', value: 'list' },
          { label: 'Таблица', value: 'table' },
        ],
      },
      { id: 'singleTitle', label: 'Заголовок одиночной закладки', type: 'text', defaultValue: 'Мой сайт' },
      { id: 'singleUrl', label: 'URL одиночной закладки', type: 'text', defaultValue: 'https://google.com' },
    ],
    component: BookmarksWidget,
  });

  WidgetRegistry.register({
    id: 'iframe',
    name: 'Встроить Сайт (Iframe)',
    description: 'Отображение любой веб-страницы прямо на рабочем столе',
    version: '1.0.0',
    iconName: 'Globe',
    category: 'utilities',
    defaultSize: { w: 6, h: 4 },
    minSize: { w: 4, h: 3 },
    settingsSchema: [
      { id: 'url', label: 'URL сайта (напр. https://wxt.dev)', type: 'text', defaultValue: 'https://wxt.dev' },
      { id: 'zoom', label: 'Масштаб страницы (%)', type: 'number', defaultValue: 100 },
    ],
    component: IframeWidget,
  });

  WidgetRegistry.register({
    id: 'pomodoro',
    name: 'Pomodoro & Звуки Фокуса',
    description: 'Таймер продуктивности 25/5 мин и фоновый шум фокуса',
    version: '1.0.0',
    iconName: 'Flame',
    category: 'productivity',
    defaultSize: { w: 4, h: 3 },
    minSize: { w: 3, h: 2 },
    settingsSchema: [
      { id: 'workTime', label: 'Время фокуса (минуты)', type: 'number', defaultValue: 25 },
      { id: 'breakTime', label: 'Время отдыха (минуты)', type: 'number', defaultValue: 5 },
    ],
    component: PomodoroWidget,
  });

  WidgetRegistry.register({
    id: 'quotes',
    name: 'Цитата Дня',
    description: 'Вдохновляющие афоризмы и цитаты великих людей',
    version: '1.0.0',
    iconName: 'Quote',
    category: 'entertainment',
    defaultSize: { w: 6, h: 2 },
    minSize: { w: 4, h: 2 },
    component: QuotesWidget,
  });

  WidgetRegistry.register({
    id: 'systemMonitor',
    name: 'Монитор Системы',
    description: 'Отслеживание сети, заряда батареи и ресурсов браузера',
    version: '1.0.0',
    iconName: 'Cpu',
    category: 'developer',
    defaultSize: { w: 6, h: 2 },
    minSize: { w: 4, h: 2 },
    component: SystemMonitorWidget,
  });

  WidgetRegistry.register({
    id: 'rssReader',
    name: 'RSS Новостной Ридер',
    description: 'Чтение свежих новостей IT и разработок через RSS-ленты',
    version: '1.0.0',
    iconName: 'Rss',
    category: 'news',
    defaultSize: { w: 6, h: 4 },
    minSize: { w: 4, h: 3 },
    settingsSchema: [
      { id: 'feedUrl', label: 'URL ленты RSS', type: 'text', defaultValue: 'https://habr.com/ru/rss/best/daily/' },
    ],
    component: RssWidget,
  });
}
