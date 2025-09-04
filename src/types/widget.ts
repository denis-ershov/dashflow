export interface WidgetPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WidgetConfig {
  id: string;
  type: WidgetType;
  title: string;
  position: WidgetPosition;
  settings: Record<string, any>;
  isVisible: boolean;
  isMinimized: boolean;
  lastUpdated: Date;
}

export type WidgetType = 
  | 'weather'
  | 'calendar'
  | 'todo'
  | 'bookmarks'
  | 'clock'
  | 'search'
  | 'notes'
  | 'rss'
  | 'currency'
  | 'crypto'
  | 'kanban'
  | 'iframe'
  | 'audio-player'
  | 'text-editor';

export interface WeatherData {
  location: string;
  temperature: number;
  condition: string;
  icon: string;
  humidity: number;
  windSpeed: number;
  feelsLike: number;
  pressure: number;
  visibility: number;
  uvIndex: number;
  sunrise: string;
  sunset: string;
  forecast: DailyForecast[];
  hourlyForecast: HourlyForecast[];
}

export interface DailyForecast {
  date: string;
  maxTemp: number;
  minTemp: number;
  condition: string;
  icon: string;
  precipitation: number;
}

export interface HourlyForecast {
  time: string;
  temperature: number;
  condition: string;
  icon: string;
  precipitation: number;
}

export interface TodoItem {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: 'high' | 'medium' | 'low';
  dueDate?: Date;
  category: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  allDay: boolean;
  recurring?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  reminder?: number; // минуты до события
  color?: string;
}

export interface BookmarkItem {
  id: string;
  title: string;
  url: string;
  favicon?: string;
  folder?: string;
  dateAdded: Date;
  visitCount?: number;
}

export interface RSSFeed {
  id: string;
  url: string;
  title: string;
  description?: string;
  items: RSSItem[];
  lastUpdated: Date;
  category?: string;
}

export interface RSSItem {
  id: string;
  title: string;
  description: string;
  link: string;
  pubDate: Date;
  isRead: boolean;
}

export interface CurrencyRate {
  from: string;
  to: string;
  rate: number;
  lastUpdated: Date;
}

export interface CryptoCurrency {
  id: string;
  name: string;
  symbol: string;
  price: number;
  change24h: number;
  marketCap: number;
  volume24h: number;
  rank: number;
  lastUpdated: Date;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  color: string;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
}

export interface KanbanColumn {
  id: string;
  title: string;
  cards: KanbanCard[];
  order: number;
  color?: string;
}

export interface KanbanCard {
  id: string;
  title: string;
  description?: string;
  assignee?: string;
  dueDate?: Date;
  labels: string[];
  order: number;
  createdAt: Date;
}

export interface WidgetSettings {
  weather: {
    apiKey?: string;
    location?: string;
    units: 'metric' | 'imperial';
    language: string;
    showForecast: boolean;
    forecastDays: number;
  };
  clock: {
    format: '12h' | '24h';
    showSeconds: boolean;
    showDate: boolean;
    timezone: string;
    clockType: 'digital' | 'analog';
  };
  search: {
    defaultEngine: 'google' | 'bing' | 'duckduckgo' | 'yandex';
    showSuggestions: boolean;
    openInNewTab: boolean;
  };
  currency: {
    baseCurrency: string;
    targetCurrencies: string[];
    refreshInterval: number; // в минутах
  };
  crypto: {
    favoriteCoins: string[];
    refreshInterval: number;
    showChange: boolean;
    currency: string;
  };
}