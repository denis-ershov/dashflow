import type { RssFeedConfig } from './types';

export interface RssPresetCategory {
  id: string;
  name: string;
  feeds: RssFeedConfig[];
}

export const RSS_PRESET_CATEGORIES: RssPresetCategory[] = [
  {
    id: 'it-dev',
    name: 'IT и Разработка',
    feeds: [
      {
        id: 'habr-best',
        name: 'Хабр: Лучшее за сутки',
        url: 'https://habr.com/ru/rss/best/daily/',
        folder: 'IT и Разработка',
        enabled: true,
        color: '#65a30d',
      },
      {
        id: 'habr-dev',
        name: 'Хабр: Разработка',
        url: 'https://habr.com/ru/rss/hub/develop/',
        folder: 'IT и Разработка',
        enabled: true,
        color: '#16a34a',
      },
      {
        id: 'tproger',
        name: 'Tproger: Новости IT',
        url: 'https://tproger.ru/feed/news',
        folder: 'IT и Разработка',
        enabled: true,
        color: '#0284c7',
      },
      {
        id: 'vc-ru',
        name: 'VC.ru: Главное',
        url: 'https://vc.ru/rss',
        folder: 'IT и Разработка',
        enabled: true,
        color: '#ea580c',
      },
      {
        id: 'hacker-news',
        name: 'Hacker News (Frontpage)',
        url: 'https://news.ycombinator.com/rss',
        folder: 'IT и Разработка',
        enabled: false,
        color: '#f97316',
      },
      {
        id: 'dev-to',
        name: 'Dev.to (Community)',
        url: 'https://dev.to/feed',
        folder: 'IT и Разработка',
        enabled: false,
        color: '#3b82f6',
      },
    ],
  },
  {
    id: 'gaming',
    name: 'Игры и Развлечения',
    feeds: [
      {
        id: 'dtf-main',
        name: 'DTF: Популярное',
        url: 'https://dtf.ru/rss',
        folder: 'Игры и Развлечения',
        enabled: true,
        color: '#6366f1',
      },
      {
        id: 'stopgame',
        name: 'StopGame: Новости',
        url: 'https://rss.stopgame.ru/rss_news.xml',
        folder: 'Игры и Развлечения',
        enabled: true,
        color: '#dc2626',
      },
      {
        id: 'igromania',
        name: 'Игромания',
        url: 'https://www.igromania.ru/rss/news.xml',
        folder: 'Игры и Развлечения',
        enabled: false,
        color: '#e11d48',
      },
      {
        id: 'pc-gamer',
        name: 'PC Gamer (EN)',
        url: 'https://www.pcgamer.com/rss/',
        folder: 'Игры и Развлечения',
        enabled: false,
        color: '#9333ea',
      },
    ],
  },
  {
    id: 'tech-news',
    name: 'Новости технологий',
    feeds: [
      {
        id: '3dnews',
        name: '3DNews: Daily Digital Digest',
        url: 'https://3dnews.ru/news/rss/',
        folder: 'Новости технологий',
        enabled: true,
        color: '#0ea5e9',
      },
      {
        id: 'ixbt',
        name: 'iXBT.com',
        url: 'https://www.ixbt.com/export/news.rss',
        folder: 'Новости технологий',
        enabled: true,
        color: '#f59e0b',
      },
      {
        id: 'the-verge',
        name: 'The Verge (EN)',
        url: 'https://www.theverge.com/rss/index.xml',
        folder: 'Новости технологий',
        enabled: false,
        color: '#ec4899',
      },
      {
        id: 'techcrunch',
        name: 'TechCrunch (EN)',
        url: 'https://techcrunch.com/feed/',
        folder: 'Новости технологий',
        enabled: false,
        color: '#10b981',
      },
    ],
  },
  {
    id: 'science-design',
    name: 'Дизайн и Наука',
    feeds: [
      {
        id: 'habr-design',
        name: 'Хабр: Дизайн',
        url: 'https://habr.com/ru/rss/hub/design/',
        folder: 'Дизайн и Наука',
        enabled: true,
        color: '#8b5cf6',
      },
      {
        id: 'smashing-mag',
        name: 'Smashing Magazine',
        url: 'https://www.smashingmagazine.com/feed/',
        folder: 'Дизайн и Наука',
        enabled: false,
        color: '#ef4444',
      },
      {
        id: 'popmech',
        name: 'TechInsider (Поп. Механика)',
        url: 'https://www.techinsider.ru/rss/all.xml',
        folder: 'Дизайн и Наука',
        enabled: false,
        color: '#14b8a6',
      },
    ],
  },
];

export const DEFAULT_FEEDS: RssFeedConfig[] = [
  {
    id: 'habr-best',
    name: 'Хабр: Лучшее',
    url: 'https://habr.com/ru/rss/best/daily/',
    folder: 'IT и Разработка',
    enabled: true,
    color: '#65a30d',
  },
  {
    id: 'dtf-main',
    name: 'DTF: Новости',
    url: 'https://dtf.ru/rss',
    folder: 'Игры и Развлечения',
    enabled: true,
    color: '#6366f1',
  },
  {
    id: '3dnews',
    name: '3DNews',
    url: 'https://3dnews.ru/news/rss/',
    folder: 'Новости технологий',
    enabled: true,
    color: '#0ea5e9',
  },
];
