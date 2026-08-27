import React, { useState, useMemo } from 'react';
import { Modal } from '@/ui/overlays';
import { useDashboardStore } from '@/stores/useDashboardStore';
import { usePluginStore } from '@/core/plugins/pluginStore';
import { WidgetRegistry } from '@/core/widget/registry';
import { useTranslation } from '@/core/i18n';
import { Button, Input, Badge } from '@/ui/primitives';
import { EmptyState } from '@/ui/feedback';
import { PermissionConsentModal } from '@/features/permissions/PermissionConsentModal';
import { PermissionManager } from '@/core/permissions/permissionManager';
import { validatePluginManifest } from '@/core/plugins/validator';
import type { WidgetCategory } from '@/core/widget/types';
import {
  Download,
  ShieldAlert,
  Search,
  Code2,
  Boxes,
  Plus,
  Trash2,
  Upload,
  CheckCircle,
  FileJson,
} from 'lucide-react';

export const MarketplaceModal: React.FC = () => {
  const { t } = useTranslation();
  const { activeModal, setActiveModal, widgets, addWidget, removeWidget } = useDashboardStore();
  const { plugins, installPlugin, uninstallPlugin } = usePluginStore();

  const [activeTab, setActiveTab] = useState<'all' | 'builtin' | 'custom' | 'import'>('all');
  const [selectedCategory, setSelectedCategory] = useState<WidgetCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Состояние диалога согласия на разрешения
  const [pendingConsent, setPendingConsent] = useState<{
    widgetId: string;
    title: string;
    author?: string;
    permissions: string[];
    w: number;
    h: number;
  } | null>(null);

  // Состояние вкладки импорта JSON
  const [importJson, setImportJson] = useState('');
  const [importStatus, setImportStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  const isOpen = activeModal === 'marketplace';

  const allBuiltin = useMemo(() => WidgetRegistry.getAll(), [isOpen]);

  const combinedItems = useMemo(() => {
    const builtinItems = allBuiltin.map((w) => ({
      id: w.id,
      // @ts-expect-error key lookup
      name: w.nameKey ? t(w.nameKey) : w.name || w.id,
      // @ts-expect-error key lookup
      description: w.descriptionKey ? t(w.descriptionKey) : w.description || '',
      author: w.author || 'DashFlow Core',
      version: w.version || '1.0.0',
      category: w.category || 'utilities',
      permissions: w.permissions || [],
      w: w.size.defaultW,
      h: w.size.defaultH,
      surface: w.surface || 'panel',
      isCustom: false,
    }));

    const customItems = plugins.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      author: p.author,
      version: p.version,
      category: 'utilities' as WidgetCategory,
      permissions: p.permissions,
      w: p.size.defaultW,
      h: p.size.defaultH,
      surface: p.surface || 'panel',
      isCustom: true,
    }));

    return [...builtinItems, ...customItems];
  }, [allBuiltin, plugins, t]);

  const filteredItems = useMemo(() => {
    return combinedItems.filter((item) => {
      const matchTab =
        activeTab === 'all' ||
        (activeTab === 'builtin' && !item.isCustom) ||
        (activeTab === 'custom' && item.isCustom);

      const matchCategory =
        selectedCategory === 'all' || item.category === selectedCategory;

      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q);

      return matchTab && matchCategory && matchSearch;
    });
  }, [combinedItems, activeTab, selectedCategory, searchQuery]);

  const isInstalled = (widgetId: string) => {
    return widgets.some((w) => w.widgetId === widgetId);
  };

  const handleAddClick = async (item: (typeof combinedItems)[0]) => {
    const needsConsent = await PermissionManager.isConsentRequired(item.id, item.permissions);
    if (needsConsent) {
      setPendingConsent({
        widgetId: item.id,
        title: item.name,
        author: item.author,
        permissions: item.permissions,
        w: item.w,
        h: item.h,
      });
      return;
    }

    addWidget(item.id, item.w, item.h);
  };

  const handleConsentAllow = async () => {
    if (!pendingConsent) return;
    await PermissionManager.grantPermissions(
      pendingConsent.widgetId,
      // @ts-expect-error typed array
      pendingConsent.permissions,
    );
    addWidget(pendingConsent.widgetId, pendingConsent.w, pendingConsent.h);
    setPendingConsent(null);
  };

  const handleConsentDeny = () => {
    setPendingConsent(null);
  };

  const handleImportJson = async () => {
    try {
      const parsed = JSON.parse(importJson);
      const res = await installPlugin(parsed);
      if (res.success) {
        setImportStatus({ success: true, message: 'Плагин успешно установлен и добавлен в реестр!' });
        setImportJson('');
        setActiveTab('custom');
      } else {
        setImportStatus({ success: false, message: res.errors?.join('; ') });
      }
    } catch {
      setImportStatus({ success: false, message: 'Синтаксическая ошибка: невалидный JSON' });
    }
  };

  const categories: { key: WidgetCategory | 'all'; label: string }[] = [
    { key: 'all', label: 'Все' },
    { key: 'utilities', label: 'Утилиты' },
    { key: 'productivity', label: 'Продуктивность' },
    { key: 'news', label: 'Новости' },
    { key: 'entertainment', label: 'Развлечения' },
    { key: 'developer', label: 'Разработчику' },
  ];

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={() => setActiveModal(null)}
        title="Каталог Виджетов & Плагинов DashFlow"
        maxWidth="2xl"
      >
        <div className="space-y-4 select-none">
          {/* Главные вкладки типов */}
          <div className="flex items-center gap-1.5 bg-surface/50 p-1 rounded-xl border border-line">
            <button
              onClick={() => setActiveTab('all')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-primary text-primary-fg shadow-sm'
                  : 'text-fg-muted hover:text-fg'
              }`}
            >
              Все ({combinedItems.length})
            </button>
            <button
              onClick={() => setActiveTab('builtin')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'builtin'
                  ? 'bg-primary text-primary-fg shadow-sm'
                  : 'text-fg-muted hover:text-fg'
              }`}
            >
              Встроенные ({allBuiltin.length})
            </button>
            <button
              onClick={() => setActiveTab('custom')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'custom'
                  ? 'bg-primary text-primary-fg shadow-sm'
                  : 'text-fg-muted hover:text-fg'
              }`}
            >
              Плагины ({plugins.length})
            </button>
            <button
              onClick={() => setActiveTab('import')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'import'
                  ? 'bg-secondary text-secondary-fg shadow-sm'
                  : 'text-fg-muted hover:text-fg'
              }`}
            >
              + Импорт JSON
            </button>
          </div>

          {activeTab === 'import' ? (
            /* Вкладка импорта декларативного JSON-плагина */
            <div className="space-y-4 p-2">
              <div className="flex items-start gap-3 p-3.5 rounded-xl bg-surface/60 border border-line">
                <FileJson className="w-6 h-6 text-primary shrink-0 mt-0.5" />
                <div className="text-xs text-fg-muted leading-relaxed">
                  <span className="font-semibold text-fg block mb-1">
                    Декларативные плагины DashFlow
                  </span>
                  Вставьте JSON-манифест плагина без исполняемого кода (типы: <code className="text-primary font-mono">rss</code>, <code className="text-primary font-mono">embed</code>, <code className="text-primary font-mono">links</code>, <code className="text-primary font-mono">api</code>). Манифест будет проверен строгим валидатором перед установкой.
                </div>
              </div>

              <textarea
                value={importJson}
                onChange={(e) => setImportJson(e.target.value)}
                placeholder={`{\n  "id": "my_feed",\n  "name": "Мой RSS",\n  "version": "1.0.0",\n  "author": "User",\n  "type": "rss",\n  "description": "Пользовательская лента новостей",\n  "permissions": ["network", "storage"],\n  "size": { "defaultW": 6, "defaultH": 4 },\n  "config": {\n    "feedUrl": "https://example.com/feed.xml"\n  }\n}`}
                className="w-full h-48 bg-canvas border border-line rounded-xl p-3 text-xs font-mono text-fg placeholder:text-fg-muted/60 focus:outline-none focus:ring-2 focus:ring-primary"
              />

              {importStatus && (
                <div
                  className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                    importStatus.success
                      ? 'bg-success/10 text-success border border-success/20'
                      : 'bg-danger/10 text-danger border border-danger/20'
                  }`}
                >
                  {importStatus.success ? <CheckCircle className="w-4 h-4 shrink-0" /> : <ShieldAlert className="w-4 h-4 shrink-0" />}
                  <span>{importStatus.message}</span>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="primary"
                  icon={<Upload className="w-4 h-4" />}
                  onClick={handleImportJson}
                  disabled={!importJson.trim()}
                  className="min-h-[44px]"
                >
                  Проверить и Установить
                </Button>
              </div>
            </div>
          ) : (
            /* Каталог виджетов и плагинов */
            <>
              {/* Поиск и категории */}
              <div className="space-y-3">
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Поиск по каталогу расширений..."
                  icon={<Search className="w-4 h-4 text-fg-muted" />}
                  aria-label="Поиск по каталогу"
                />

                <div className="flex space-x-1.5 overflow-x-auto pb-1 select-none">
                  {categories.map((cat) => (
                    <button
                      key={cat.key}
                      onClick={() => setSelectedCategory(cat.key)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer shrink-0 ${
                        selectedCategory === cat.key
                          ? 'bg-primary text-primary-fg shadow-sm'
                          : 'bg-surface text-fg-muted hover:text-fg hover:bg-surface-hover border border-line'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Список реальных виджетов */}
              {filteredItems.length === 0 ? (
                <div className="py-8">
                  <EmptyState
                    title="Ничего не найдено"
                    description="Попробуйте изменить категорию или поисковый запрос"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[55vh] overflow-y-auto pr-1">
                  {filteredItems.map((item) => {
                    const installed = isInstalled(item.id);

                    return (
                      <div
                        key={item.id}
                        className="flex flex-col justify-between p-4 rounded-xl bg-surface/60 border border-line hover:border-primary/50 transition-all duration-normal"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-3">
                              <div className="p-2.5 rounded-lg bg-surface border border-line shrink-0">
                                {item.isCustom ? (
                                  <Code2 className="w-5 h-5 text-secondary" />
                                ) : (
                                  <Boxes className="w-5 h-5 text-primary" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-xs font-semibold text-fg truncate">
                                  {item.name}
                                </h4>
                                <span className="text-[10px] text-fg-muted block">
                                  от {item.author} • v{item.version}
                                </span>
                              </div>
                            </div>

                            <Badge variant={item.isCustom ? 'secondary' : 'default'}>
                              {item.isCustom ? 'Плагин' : 'Встроенный'}
                            </Badge>
                          </div>

                          <p className="text-xs text-fg-muted mt-2.5 leading-relaxed line-clamp-2">
                            {item.description}
                          </p>

                          {/* Разрешения */}
                          <div className="flex items-center gap-1.5 mt-2.5">
                            <ShieldAlert className="w-3.5 h-3.5 text-warning shrink-0" />
                            <span className="text-[10px] text-fg-muted truncate">
                              Права: {item.permissions.length > 0 ? item.permissions.join(', ') : 'Не требуются'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-3 mt-3 border-t border-line/50">
                          <span className="text-[10px] text-fg-muted font-mono">
                            {item.w}×{item.h} ({item.surface})
                          </span>

                          <div className="flex items-center gap-2">
                            {item.isCustom && (
                              <Button
                                size="sm"
                                variant="danger"
                                icon={<Trash2 className="w-3.5 h-3.5" />}
                                onClick={() => uninstallPlugin(item.id)}
                                aria-label="Удалить плагин"
                              />
                            )}

                            {installed ? (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => {
                                  const inst = widgets.find((w) => w.widgetId === item.id);
                                  if (inst) removeWidget(inst.instanceId);
                                }}
                              >
                                Убрать с экрана
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="primary"
                                icon={<Plus className="w-3.5 h-3.5" />}
                                onClick={() => handleAddClick(item)}
                              >
                                Добавить на экран
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </Modal>

      {/* Диалог запроса согласия на права доступа */}
      {pendingConsent && (
        <PermissionConsentModal
          isOpen={!!pendingConsent}
          widgetId={pendingConsent.widgetId}
          widgetTitle={pendingConsent.title}
          author={pendingConsent.author}
          permissions={pendingConsent.permissions}
          onAllow={handleConsentAllow}
          onDeny={handleConsentDeny}
        />
      )}
    </>
  );
};
