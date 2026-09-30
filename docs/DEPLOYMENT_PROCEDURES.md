# Процедуры развёртывания DashFlow

**Дата создания:** 30 сентября 2026  
**Версия:** 1.0.0  
**Статус:** Production Ready

---

## Оглавление

1. [Обзор](#обзор)
2. [Окружения](#окружения)
3. [Pre-Deployment Checklist](#pre-deployment-checklist)
4. [Сборка релиза](#сборка-релиза)
5. [Chrome Web Store Deployment](#chrome-web-store-deployment)
6. [Firefox Add-ons Deployment](#firefox-add-ons-deployment)
7. [Rollback Strategy](#rollback-strategy)
8. [Post-Deployment Verification](#post-deployment-verification)
9. [Emergency Procedures](#emergency-procedures)

---

## Обзор

DashFlow — это браузерное расширение, которое распространяется через:
- **Chrome Web Store** (Chrome, Edge, Brave, Opera)
- **Firefox Add-ons** (Firefox, Firefox Android)

Процесс релиза включает:
1. Сборку production-артефактов
2. Ручную публикацию в магазины расширений
3. Автоматическую проверку модерацией магазинов
4. Постепенное распространение пользователям

---

## Окружения

### Development (dev)
- **Цель:** Локальная разработка
- **Запуск:** `npm run dev`
- **Hot Reload:** Да
- **Источник:** `src/`
- **Destination:** `.wxt/`
- **CSP:** Relaxed (позволяет `'wasm-unsafe-eval'`)

### Staging (build без публикации)
- **Цель:** Тестирование production сборки локально
- **Запуск:** `npm run build`
- **Источник:** `src/`
- **Destination:** `.output/chrome-mv3/`
- **CSP:** Production-level
- **Тестирование:** Загрузить unpacked в `chrome://extensions`

### Production (магазины)
- **Chrome Web Store:** Автообновление + ручная модерация
- **Firefox Add-ons:** Автообновление + автоматическая валидация
- **Destination:** Магазины расширений
- **Rollback:** Только через новую версию

---

## Pre-Deployment Checklist

### Перед каждым релизом проверить:

#### 1. Code Quality
\\\powershell
# TypeScript компиляция
npm run compile

# Linting
npm run lint

# Formatting
npm run format:check

# Тесты
npm run test
\\\

**Все проверки должны пройти успешно (exit code 0).**

#### 2. Version Bump
- [ ] Обновить версию в `package.json`
- [ ] Обновить версию в `wxt.config.ts` → `manifest.version`
- [ ] Следовать Semantic Versioning:
  - **Major (X.0.0):** Breaking changes, несовместимость с предыдущими версиями
  - **Minor (x.Y.0):** Новые функции, обратная совместимость
  - **Patch (x.y.Z):** Багфиксы, мелкие улучшения

#### 3. Documentation
- [ ] Обновить `docs/CHANGELOG.md` с описанием изменений
- [ ] Обновить `README.md`, если изменились функции
- [ ] Проверить актуальность `PRIVACY.md` и `TERMS_OF_SERVICE.md`
- [ ] Обновить архитектурные документы (`docs/*_ARCHITECTURE.md`), если затронута архитектура

#### 4. Security Review
- [ ] Проверить отсутствие захардкоженных секретов
- [ ] Проверить CSP в `wxt.config.ts`
- [ ] Проверить `permissions` и `host_permissions` в manifest
- [ ] Проверить отсутствие критических уязвимостей: `npm audit`
- [ ] Проверить, что все внешние API используют HTTPS

#### 5. Migration Strategy
Если изменилась схема данных (`StorageAdapter`):
- [ ] Написать миграцию в `src/core/storage/migrations/`
- [ ] Добавить тесты миграции
- [ ] Документировать breaking changes в CHANGELOG
- [ ] Определить rollback strategy

#### 6. Browser Compatibility
- [ ] Протестировать в Chrome (последняя версия)
- [ ] Протестировать в Firefox (109+)
- [ ] Проверить работу на мобильных (Android Firefox, если применимо)

#### 7. Visual QA
- [ ] Проверить все 12 виджетов
- [ ] Проверить темы и обои
- [ ] Проверить адаптивность (мобильные, планшеты, десктоп)
- [ ] Проверить accessibility (keyboard navigation, screen reader basics)

---

## Сборка релиза

### 1. Подготовка

\\\powershell
# Убедитесь, что ветка чистая
git status

# Переключитесь на main/master
git checkout main

# Получите последние изменения
git pull origin main

# Установите зависимости (на случай изменений)
npm install
\\\

### 2. Сборка Chrome Extension

\\\powershell
# Собрать Chrome MV3 версию
npm run build:chrome

# Создать .zip архив
npm run zip:chrome
\\\

**Результат:** `.output/dashflow-[version]-chrome.zip`

### 3. Сборка Firefox Extension

\\\powershell
# Собрать Firefox версию
npm run build:firefox

# Создать .zip архив
npm run zip:firefox
\\\

**Результат:** `.output/dashflow-[version]-firefox.zip`

### 4. Сборка обеих версий

\\\powershell
# Собрать и запаковать обе версии
npm run build:all
npm run zip:all
\\\

### 5. Проверка артефактов

\\\powershell
# Проверить размер bundle
ls .output/*.zip

# Размер должен быть ~600-800 KB для Chrome
# Размер должен быть ~600-800 KB для Firefox
\\\

**Важно:** Если размер > 1 MB — проверить, что не попали лишние файлы.

---

## Chrome Web Store Deployment

### Подготовка

1. **Аккаунт разработчика:**
   - URL: https://chrome.google.com/webstore/devconsole
   - Требуется: Google Account + одноразовый взнос \

2. **Первая публикация:**
   - Создать новое расширение
   - Загрузить `.output/dashflow-[version]-chrome.zip`
   - Заполнить Store Listing (описание, скриншоты, иконки)
   - Выбрать категорию: **Productivity**
   - Указать privacy policy: ссылка на `PRIVACY.md` в GitHub

### Обновление существующей версии

1. **Открыть Chrome Web Store Developer Dashboard**
2. Выбрать DashFlow
3. Нажать **"Package"** → **"Upload new package"**
4. Загрузить `.output/dashflow-[version]-chrome.zip`
5. Проверить изменения в preview
6. **Важно:** Обновить Store Listing, если:
   - Изменились разрешения (permissions)
   - Добавлены новые функции
   - Изменился Privacy Policy

7. Нажать **"Submit for review"**

### Модерация

- **Время:** 1-3 дня (обычно 24 часа)
- **Статусы:**
  - **"Pending review"** — ожидает модерации
  - **"In review"** — проверяется модератором
  - **"Approved"** — одобрено, публикуется
  - **"Rejected"** — отклонено (см. причину в email)

### Постепенный Rollout

Chrome Web Store поддерживает staged rollout:
1. После одобрения выбрать **"Rollout percentage"**
2. Начать с 10% пользователей
3. Мониторить метрики 24 часа
4. Увеличить до 50% → 100%

**Рекомендация:** Для major версий использовать staged rollout.

---

## Firefox Add-ons Deployment

### Подготовка

1. **Аккаунт разработчика:**
   - URL: https://addons.mozilla.org/developers/
   - Требуется: Firefox Account (бесплатно)

2. **Первая публикация:**
   - Создать новое дополнение
   - Загрузить `.output/dashflow-[version]-firefox.zip`
   - Заполнить listing (описание, категории, скриншоты)
   - Категория: **Productivity**
   - Указать privacy policy и homepage

### Обновление существующей версии

1. **Открыть Firefox Add-ons Developer Hub**
2. Выбрать DashFlow
3. Нажать **"Upload New Version"**
4. Загрузить `.output/dashflow-[version]-firefox.zip`
5. **Source code (если требуется):**
   - Загрузить `.output/dashflow-[version]-sources.zip`
   - Добавить `BUILD_INSTRUCTIONS.md` с командой сборки

6. Указать Release Notes
7. Нажать **"Submit Version"**

### Валидация

- **Автоматическая валидация:** 5-15 минут
- **Проверяется:**
  - Manifest V3 соответствие
  - Отсутствие вредоносного кода
  - Соответствие описанию

- **Статусы:**
  - **"Awaiting Review"** — автоматическая валидация
  - **"Approved"** — опубликовано (обычно в течение 1 часа)
  - **"Rejected"** — отклонено (см. причину)

### Особенности Firefox

- **Быстрее модерация:** Автоматическая валидация вместо ручной
- **Меньше ограничений:** Более лояльная политика permissions
- **Source code:** Может потребоваться при использовании минификации

---

## Rollback Strategy

### Важно: Rollback не мгновенный

Магазины расширений **не поддерживают откат** к предыдущей версии. Rollback = публикация новой версии.

### Сценарий 1: Critical Bug в новой версии

**Симптомы:**
- Расширение не загружается
- Критичные функции сломаны
- Утечка памяти
- Security vulnerability

**Действия:**

1. **Немедленно:**
   \\\powershell
   # Переключиться на стабильную ветку
   git checkout v3.7.0  # последняя стабильная версия
   
   # Увеличить версию до hotfix
   # package.json: 3.7.0 → 3.7.2
   
   # Собрать hotfix
   npm run build:all
   npm run zip:all
   
   # Опубликовать в магазины (приоритет)
   \\\

2. **Коммуникация:**
   - Опубликовать issue в GitHub с описанием проблемы
   - Обновить CHANGELOG с пометкой `[HOTFIX]`
   - Добавить release notes в магазинах: "Critical bugfix"

3. **Мониторинг:**
   - Проверить отсутствие проблемы в hotfix
   - Подождать одобрения модерации
   - Проверить, что пользователи получают обновление

**Время rollback:** 1-3 дня (зависит от модерации).

### Сценарий 2: Breaking Change в миграции данных

**Симптомы:**
- Пользователи теряют настройки
- Виджеты исчезают после обновления
- Storage corruption

**Действия:**

1. **Написать обратную миграцию:**
   \\\	ypescript
   // src/core/storage/migrations/rollbackV4ToV3.ts
   export function rollbackV4ToV3(data: any): any {
     // Восстановить структуру v3
     return transformedData;
   }
   \\\

2. **Hotfix релиз:**
   - Версия: 3.8.0 → 3.8.1
   - Включить обратную миграцию
   - Добавить защиту от повторной потери данных

3. **Коммуникация:**
   - GitHub Issue с инструкциями восстановления
   - Release notes: "Data migration fix"

### Сценарий 3: Отклонение модерацией

**Причины отклонения:**
- Нарушение политики магазина
- Новое разрешение без объяснения
- Изменение privacy policy
- Вредоносный код (false positive)

**Действия:**

1. **Прочитать причину отклонения** в email от магазина
2. **Исправить проблему:**
   - Удалить лишние permissions
   - Добавить объяснение в description
   - Обновить privacy policy
   - Связаться с поддержкой магазина

3. **Повторная публикация:**
   - Версия остаётся той же (3.8.0)
   - Загрузить исправленный .zip
   - Submit for review

---

## Post-Deployment Verification

### Сразу после публикации (Day 0)

**1. Проверка доступности:**
- [ ] Открыть страницу расширения в Chrome Web Store
- [ ] Открыть страницу расширения в Firefox Add-ons
- [ ] Проверить корректность description, скриншотов, версии

**2. Установка с нуля:**
- [ ] Установить из Chrome Web Store в чистом профиле
- [ ] Проверить, что новая вкладка открывается корректно
- [ ] Добавить 2-3 виджета
- [ ] Изменить тему
- [ ] Проверить сохранение настроек

**3. Обновление существующей установки:**
- [ ] Открыть `chrome://extensions`
- [ ] Нажать "Update" (или дождаться автообновления)
- [ ] Проверить, что настройки сохранились
- [ ] Проверить работу миграции (если применимо)

### Мониторинг первых 24 часов (Day 1)

**Метрики Chrome Web Store:**
- Количество установок
- Количество удалений (churn rate)
- Рейтинг (stars)
- Отзывы (reviews)

**Метрики Firefox Add-ons:**
- Количество загрузок
- Средний рейтинг
- Отзывы

**Критичные сигналы (требуют немедленного rollback):**
- ⚠️ Churn rate > 10% в первые 24 часа
- ⚠️ Рейтинг падает ниже 4.0
- ⚠️ 3+ отзыва с критичными багами
- ⚠️ GitHub Issues с `[CRITICAL]` метками

### Долгосрочный мониторинг (Week 1)

- [ ] Проверять отзывы в магазинах 2 раза в неделю
- [ ] Отвечать на негативные отзывы с предложением помощи
- [ ] Собирать feedback для следующей версии
- [ ] Обновлять roadmap в GitHub

---

## Emergency Procedures

### Процедура экстренного отключения функции

Если новая функция вызывает критичные проблемы, но расширение в целом работает:

1. **Feature Flag (будущее):**
   \\\	ypescript
   // Сейчас не реализовано, но должно быть добавлено
   const FEATURE_FLAGS = {
     weatherWidget: true,
     rssWidget: false, // аварийное отключение
   };
   \\\

2. **Без Feature Flags (текущий сценарий):**
   - Удалить проблемный виджет из `WIDGET_REGISTRY`
   - Hotfix релиз
   - Публикация в магазины

### Процедура экстренного удаления из магазина

**Когда применять:**
- Критичная security vulnerability
- Вредоносная activity (компрометация аккаунта)
- Нарушение законодательства

**Действия:**

1. **Chrome Web Store:**
   - Developer Dashboard → DashFlow → "Unpublish"
   - Причина: Security/Policy violation

2. **Firefox Add-ons:**
   - Developer Hub → DashFlow → "Disable Add-on"

3. **Коммуникация:**
   - GitHub Issue: публичное объяснение
   - Email уведомление пользователям (если есть список)
   - Security Advisory в `SECURITY.md`

4. **Исправление:**
   - Fix critical vulnerability
   - Security audit
   - Повторная публикация с подробным changelog

---

## Контрольный лист владельца релиза

Релиз считается успешным, если выполнены все пункты:

- [x] Pre-deployment checklist выполнен
- [x] Артефакты собраны и проверены
- [x] Chrome Web Store: опубликовано и одобрено
- [x] Firefox Add-ons: опубликовано и одобрено
- [x] Post-deployment verification пройдена
- [x] Нет критичных отзывов в первые 24 часа
- [x] Churn rate < 5%
- [x] Рейтинг сохранён или вырос
- [x] CHANGELOG обновлён
- [x] GitHub Release создан с release notes
- [x] Документация актуальна

---

## Контакты и эскалация

**Владелец процесса:** [Ваше имя]  
**Email:** [your-email@example.com]  
**GitHub:** https://github.com/yourusername/dashflow

**Эскалация при критичных проблемах:**
1. Создать GitHub Issue с меткой `[CRITICAL]`
2. Email владельцу процесса
3. Начать процедуру rollback немедленно

---

**Последнее обновление:** 30 сентября 2026  
**Следующий пересмотр:** При выходе v4.0.0 или изменении процессов магазинов
