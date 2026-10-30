# Архитектура Item: единая модель содержимого

**Статус:** шаг 1.1 плана ([`IMPLEMENTATION_PLAN.md`](IMPLEMENTATION_PLAN.md)) — хранилище готово, виджеты переводятся на него в шагах 1.3–1.4. Решение — [ADR-017](adr/ADR-017-items-indexeddb.md).

## 1. Зачем

Задачи, заметки, ссылки, напоминания, дайджесты, статьи и карточки досок — один тип `Item` с полем `kind`. Виджеты (Todo, Notes, Inbox, Kanban…) — представления над запросами к нему. Создают записи пользователь, импорт, а с этапов 3–5 — агенты и коннекторы через Hub; поле `source` говорит, кто именно.

## 2. Компоненты (`src/core/items/`)

| Файл | Ответственность |
|---|---|
| `types.ts` | `Item`, `ItemDraft`, `ItemPatch`, `Board`, `ItemChange`, `ItemQuery`, перечни kind/priority/source |
| `ids.ts` | `ulid()` — id, сортируемый по времени; `orderBetween` / `ordersBetween` — дробные ключи порядка (`fractional-indexing`); `isValidOrderKey` |
| `validation.ts` | `parseItemDraft`, `parseItemPatch`, `parseBoardDraft` — вход `unknown`, ошибка `ItemValidationError { code, field }`; лимиты `ITEM_LIMITS` |
| `db.ts` | IndexedDB `dashflow_items` v1: схема, индексы, `navigator.storage.persist()` |
| `repository.ts` | `createItemRepository({ dbName, now, notify })`: CRUD, мягкое удаление и корзина, запросы, журнал, доски; ошибки `ItemNotFoundError`, `ItemConflictError` |
| `events.ts` | `publishItemsChanged` / `subscribeItemsChanged` поверх `BroadcastChannel('dashflow-items')` |
| `useItems.ts` | `useItems(repository, query)` — записи по запросу с автообновлением |
| `index.ts` | Публичный API модуля и `itemRepository` приложения |

Модуль не зависит от React (кроме `useItems`) и от DOM, поэтому тот же код работает в сервис-воркере (напоминания, синхронизация).

## 3. Хранилище

```text
dashflow_items (IndexedDB, v1)
├── items    keyPath id     индексы: kind, status, boardId, updatedAt, remindAt, deletedAt
├── boards   keyPath id
└── changes  autoIncrement  индекс: itemId      { itemId, op, version, at, source }
```

- **Почему отдельная база, а не `StorageAdapter`:** нужны индексы, транзакции «запись + журнал» и объём больше квоты `chrome.storage.local` (10 МБ без `unlimitedStorage`).
- **Общая для всех контекстов:** страницы расширения и сервис-воркер — один origin.
- **`navigator.storage.persist()`** при первом открытии: браузер не вытесняет данные при нехватке места.

## 4. Поток данных

```text
UI / импорт / (Hub, агенты)                 другие вкладки, сервис-воркер
          │                                            ▲
          ▼                                            │ BroadcastChannel
  parseItemDraft / parseItemPatch                      │
          │                                   publishItemsChanged
          ▼                                            ▲
  repository ── транзакция(items + changes) ──────────┘
          │
          ▼
  useItems(query) → повторный запрос при событии
```

## 5. Ключевые решения

- **Мягкое удаление.** `remove` ставит `deletedAt`; `restore` снимает; `purgeDeleted` окончательно удаляет записи старше 30 дней и пишет в журнал `purge`.
- **Версия и конфликты.** `version` растёт на каждое изменение; `update(id, patch, source, expectedVersion)` бросает `ItemConflictError` с актуальной записью, если её изменили (вторая вкладка, агент). Основа синхронизации этапа 3.
- **Очистка полей.** В `ItemPatch` `null` очищает `body`, `url`, `boardId`, `priority`, `dueAt`, `remindAt`, `archivedAt`; отсутствующий ключ — не трогать.
- **Источник.** `source` записи — кто создал (не переписывается); кто изменял — в журнале `changes`.
- **Порядок.** Новая запись встаёт в конец своей группы (статус + доска). Ключи сравниваются строкой — так же сортирует IndexedDB.
- **Пустые изменения.** `update` без фактических правок не создаёт версию, запись журнала и событие.
- **Журнал.** Хранит последние `CHANGES_RETENTION` = 5 000 записей; обрезка — на каждой сотой записи.
- **Запросы.** Выбирается самый избирательный индекс (доска → вид → статус), остальное фильтруется в памяти; по умолчанию архивные и удалённые не возвращаются.

## 5.1. Командная шина (шаг 1.2, ADR-018)

Изменения из интерфейса идут не в репозиторий напрямую, а через команды `src/core/commands/`:

| Команда | Действие | Отмена |
|---|---|---|
| `item.create` | создать | в корзину |
| `item.update` | изменить поля (`null` очищает) | прежние значения полей |
| `item.move` | статус/доска + место между `afterId` и `beforeId` | прежние статус, доска, порядок |
| `item.complete` | `done: true` → `done`, `false` → `todo` | прежний статус |
| `item.snooze` | `remindAt = until` | прежнее напоминание |
| `item.archive` | `archivedAt = сейчас` | снять архив |
| `item.delete` / `item.restore` | в корзину / из корзины | обратное |
| `board.create` / `board.update` | доска | архив / прежние название и колонки |

Отмена сверяет поля с тем, что оставила команда, и не затирает чужие правки (`UndoConflictError`). `commandBus` — шина интерфейса; `useUndoHotkey` (Ctrl+Z / Cmd+Z вне полей ввода) подключён в `App.tsx`; `dispatchWithUndoToast` показывает тост «Отменить».

## 6. Лимиты (`ITEM_LIMITS`)

Заголовок ≤ 500, тело ≤ 100 000, URL ≤ 2 048 (только http/https), тегов ≤ 20 по ≤ 40 символов, id доски и статуса — `[A-Za-z0-9_-]{1,64}`, колонок ≤ 20, ключ порядка ≤ 64.

## 7. Риски и эксплуатация

| Риск | Мера |
|---|---|
| Квота IndexedDB | `persist()`; при `QuotaExceededError` операция отклоняется целиком (транзакция), ошибка доходит до вызывающего |
| Запрос по всей таблице на больших объёмах | Индексы; замер на 10 000 записей — шаг 1.6, при необходимости составные индексы (миграция базы v2) |
| Изменение схемы | Только через версию базы и `upgrade`; данные не удаляются без миграции и теста |
| `BroadcastChannel` недоступен | Подписчики в той же странице работают; другие вкладки обновятся при следующей загрузке |

## 8. Тесты

`tests/unit/items/`: ids, validation, repository (fake-indexeddb, отдельная база на тест, управляемые часы), useItems и события (включая сообщение из «другой вкладки»). Покрытие модуля — 93% операторов.
