import { WidgetRegistry } from '@/core/widget/registry';
import type { WidgetDefinition } from '@/core/widget/types';
import { clockManifest } from './ClockWidget/manifest';
import { searchManifest } from './SearchWidget/manifest';
import { weatherManifest } from './WeatherWidget/manifest';
import { todoManifest } from './TodoWidget/manifest';
import { notesManifest } from './NotesWidget/manifest';
import { quickLinksManifest } from './QuickLinksWidget/manifest';
import { bookmarksManifest } from './BookmarksWidget/manifest';
import { iframeManifest } from './IframeWidget/manifest';
import { pomodoroManifest } from './PomodoroWidget/manifest';
import { quotesManifest } from './QuotesWidget/manifest';
import { systemMonitorManifest } from './SystemMonitorWidget/manifest';
import { rssManifest } from './RssWidget/manifest';
import { greetingManifest } from './GreetingWidget/manifest';
import { yearProgressManifest } from './YearProgressWidget/manifest';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const BUILT_IN_MANIFESTS: Array<WidgetDefinition<any>> = [
  clockManifest,
  searchManifest,
  greetingManifest,
  yearProgressManifest,
  weatherManifest,
  todoManifest,
  notesManifest,
  quickLinksManifest,
  bookmarksManifest,
  iframeManifest,
  pomodoroManifest,
  quotesManifest,
  systemMonitorManifest,
  rssManifest,
];

/**
 * Регистрация всех встроенных манифестов виджетов в общем реестре DashFlow
 */
export function registerBuiltInWidgets(): void {
  for (const manifest of BUILT_IN_MANIFESTS) {
    WidgetRegistry.register(manifest);
  }
}

// Автоматическая регистрация при загрузке реестра
registerBuiltInWidgets();
