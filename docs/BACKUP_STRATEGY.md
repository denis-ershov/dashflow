# Стратегия резервного копирования DashFlow

**Дата создания:** 30 сентября 2026  
**Версия:** 1.0.0

---

## Оглавление

1. [Обзор](#обзор)
2. [Что подлежит резервному копированию](#что-подлежит-резервному-копированию)
3. [Типы backup](#типы-backup)
4. [Ответственность за backup](#ответственность-за-backup)
5. [Процедуры восстановления](#процедуры-восстановления)
6. [Тестирование восстановления](#тестирование-восстановления)

---

## Обзор

DashFlow — это **клиентское браузерное расширение** без backend-инфраструктуры. Это означает фундаментальное отличие от традиционных веб-приложений:

### Архитектура хранения данных:

\\\
┌─────────────────────────────────────────┐
│         Пользовательское устройство       │
│  ┌───────────────────────────────────┐  │
│  │   Chrome Browser                   │  │
│  │  ┌─────────────────────────────┐  │  │
│  │  │  DashFlow Extension         │  │  │
│  │  │                             │  │  │
│  │  │  chrome.storage.local       │  │  │
│  │  │  ┌───────────────────────┐  │  │  │
│  │  │  │ settings              │  │  │  │
│  │  │  │ widgets               │  │  │  │
│  │  │  │ user content          │  │  │  │
│  │  │  └───────────────────────┘  │  │  │
│  │  └─────────────────────────────┘  │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
         ↑
         │ НЕТ синхронизации с облаком
         │ НЕТ централизованного backup
         │ НЕТ доступа разработчика
\\\

**Ключевые особенности:**
- ✅ Все данные хранятся локально у пользователя
- ✅ Privacy by Design — мы не имеем доступа к данным
- ❌ Мы не можем сделать backup за пользователя
- ❌ Пользователь сам отвечает за backup своих данных

---

## Что подлежит резервному копированию

### 1. Данные пользователя (ответственность: пользователь)

#### Настройки и конфигурация:
- Выбранная тема (dark/light)
- Обои (wallpaper ID)
- Язык интерфейса (ru/en)
- Режим отображения (Zen/Modular)
- Настройки часов, звуков, etc.

#### Пользовательский контент:
- Список задач (TODO Widget)
- Заметки (Notes Widget)
- Закладки быстрого доступа (Quick Links)
- RSS-подписки (RSS Widget)
- Iframe URL (Iframe Widget)
- Город для виджета погоды

#### Состояние виджетов:
- Расположение на сетке (grid layout)
- Размеры виджетов
- Видимость виджетов
- Настройки каждого виджета

**Размер данных:** ~10-50 KB на пользователя

**Формат backup:** JSON-файл, экспортируемый пользователем

---

### 2. Исходный код проекта (ответственность: разработчик)

#### Git Repository:
- Весь код в `src/`
- Конфигурация в корне проекта
- Документация в `docs/`
- CI/CD workflows в `.github/`

**Хранение:**
- **Primary:** GitHub (https://github.com/yourusername/dashflow)
- **Backup:** Личный Git server или GitLab (опционально)

**Частота backup:** Автоматически (каждый push)

---

### 3. Release Artifacts (ответственность: разработчик)

#### Собранные расширения:
- `.output/dashflow-[version]-chrome.zip`
- `.output/dashflow-[version]-firefox.zip`

**Хранение:**
- **Primary:** GitHub Releases
- **Backup:** Локальный архив (`releases/` директория)

**Частота backup:** При каждом релизе

---

### 4. Документация и Assets (ответственность: разработчик)

#### Документация:
- README.md
- CHANGELOG.md
- PRIVACY.md
- TERMS_OF_SERVICE.md
- docs/*_ARCHITECTURE.md

#### Assets:
- Иконки (`public/icon-*.png`)
- Обои (`public/wallpapers/`)
- Звуки (`public/sounds/`)

**Хранение:** Git repository (автоматический backup через GitHub)

---

## Типы backup

### A. User Data Backup (пользовательские данные)

#### Export функция (встроенная в расширение)

**Путь в UI:**
\\\
Settings → Data Management → Export Settings
\\\

**Формат экспорта:**
\\\json
{
  "version": "3.7.0",
  "exportedAt": "2026-09-30T12:34:56.789Z",
  "settings": {
    "theme": "dark",
    "language": "ru",
    "displayMode": "modular",
    ...
  },
  "widgets": [
    {
      "id": "clock-1",
      "type": "clock",
      "position": { "x": 0, "y": 0 },
      "size": { "w": 2, "h": 1 },
      "config": { ... }
    },
    ...
  ],
  "userContent": {
    "todos": [...],
    "notes": [...],
    "quickLinks": [...],
    "rssFeeds": [...]
  }
}
\\\

**Имя файла:** `dashflow-backup-2026-09-30.json`

**Процесс экспорта:**
1. Пользователь нажимает "Export Settings"
2. DashFlow читает все данные из `chrome.storage.local`
3. Сериализует в JSON
4. Скачивает файл через `chrome.downloads` API

**Важно:**
- ✅ Экспорт не содержит секретов или токенов (их нет)
- ✅ Можно безопасно хранить в Dropbox/Google Drive
- ⚠️ Содержит личные данные (заметки, задачи) — не делиться публично

---

#### Import функция (восстановление)

**Путь в UI:**
\\\
Settings → Data Management → Import Settings
\\\

**Процесс импорта:**
1. Пользователь выбирает JSON-файл
2. DashFlow валидирует структуру
3. Проверяет совместимость версий
4. Применяет миграцию, если требуется
5. Перезаписывает `chrome.storage.local`
6. Перезагружает расширение

**Обработка конфликтов:**
- **Полная перезапись:** Текущие данные заменяются импортированными
- **Предупреждение:** "This will overwrite your current settings. Continue?"

**Миграция данных:**
Если backup создан в версии 3.5.0, а текущая версия 3.7.0:
\\\	ypescript
import { migrateData } from '@/core/storage/migrations';

const importedData = JSON.parse(fileContent);
const migratedData = migrateData(importedData, '3.5.0', '3.7.0');
await chrome.storage.local.set(migratedData);
\\\

---

### B. Code Repository Backup

#### Primary: GitHub

**Автоматический backup:**
- Каждый `git push` создаёт backup на GitHub
- GitHub хранит бесконечную историю коммитов
- Защита от потери: даже если локальный репозиторий удалён, GitHub сохраняет код

**Branch strategy:**
\\\
main (production)
  ↓
develop (staging)
  ↓
feature/* (features)
\\\

**Защита веток:**
- `main` — защищена от force push
- `main` — требует Pull Request для merge
- `main` — требует code review

---

#### Secondary: Local Backup (опционально)

**Ежемесячный архив:**
\\\powershell
# backup-repo.ps1
\ = Get-Date -Format "yyyy-MM-dd"
\ = "E:\Backups\dashflow-\"

# Клонировать полный репозиторий
git clone --mirror https://github.com/yourusername/dashflow.git \

# Создать ZIP-архив
Compress-Archive -Path \ -DestinationPath "E:\Backups\dashflow-\.zip"

# Удалить временную директорию
Remove-Item -Recurse -Force \

Write-Host "✅ Backup created: dashflow-\.zip"
\\\

**Частота:** 1 раз в месяц (первый понедельник)

**Хранение:**
- Локальный диск: E:\Backups\
- Облако: Google Drive / Dropbox
- Retention: 12 месяцев

---

### C. Release Artifacts Backup

#### GitHub Releases (автоматически)

**Процесс:**
1. Разработчик создаёт Git tag: `v3.7.0`
2. GitHub Actions собирает релиз
3. Создаётся GitHub Release с артефактами:
   - `dashflow-3.7.0-chrome.zip`
   - `dashflow-3.7.0-firefox.zip`
   - `CHANGELOG.md`

**Retention:** Бессрочно (пока существует GitHub репозиторий)

---

#### Локальный архив релизов (опционально)

**Структура:**
\\\
E:\DEV\Project\dashflow\releases\
  ├── v3.5.0\
  │   ├── dashflow-3.5.0-chrome.zip
  │   ├── dashflow-3.5.0-firefox.zip
  │   └── CHANGELOG-3.5.0.md
  ├── v3.6.0\
  └── v3.7.0\
\\\

**Процесс:**
\\\powershell
# После сборки релиза
\ = "3.7.0"
\ = "releases\v\"

New-Item -ItemType Directory -Path \ -Force
Copy-Item ".output\dashflow-\-chrome.zip" \
Copy-Item ".output\dashflow-\-firefox.zip" \
Copy-Item "docs\CHANGELOG.md" "\\CHANGELOG-\.md"
\\\

**Частота:** При каждом релизе

**Retention:** Все версии (disk space обычно не проблема, ~1 MB на версию)

---

## Ответственность за backup

### Пользователь отвечает за:

- ✅ Экспорт своих настроек и данных через Settings → Export
- ✅ Хранение JSON-файлов backup в безопасном месте
- ✅ Регулярное создание backup (рекомендация: 1 раз в месяц)
- ✅ Восстановление данных при переустановке расширения

**Мы предоставляем инструменты, но не можем сделать backup за пользователя.**

---

### Разработчик отвечает за:

- ✅ Backup исходного кода (Git + GitHub)
- ✅ Backup релизов (GitHub Releases + локальный архив)
- ✅ Backup документации (Git + GitHub)
- ✅ Восстановление проекта при disaster

---

## Процедуры восстановления

### Сценарий 1: Пользователь потерял настройки

**Причины:**
- Удалил расширение
- Переустановил браузер
- Очистил данные браузера
- Сбросил расширение

**Восстановление:**

Если есть backup:
1. Settings → Data Management → Import Settings
2. Выбрать JSON-файл backup
3. Подтвердить импорт
4. Расширение перезагрузится с восстановленными данными

Если нет backup:
- ❌ Данные утеряны безвозвратно
- Пользователь начинает с чистой установки

**Рекомендация пользователям:**
\\\
Экспортируйте настройки 1 раз в месяц и храните JSON-файл в облаке.
\\\

---

### Сценарий 2: Разработчик потерял локальный репозиторий

**Причины:**
- Сбой жёсткого диска
- Удаление директории проекта
- Сбой ОС

**Восстановление:**

Из GitHub:
\\\powershell
# Склонировать репозиторий заново
git clone https://github.com/yourusername/dashflow.git
cd dashflow

# Установить зависимости
npm install

# Восстановить рабочее окружение
npm run dev
\\\

**Время восстановления:** 10-15 минут

**Потери:** Нет (вся история в GitHub)

---

### Сценарий 3: GitHub аккаунт скомпрометирован

**Причины:**
- Взлом аккаунта
- Удаление репозитория злоумышленником
- Ban аккаунта (нарушение ToS)

**Восстановление:**

Из локального backup:
\\\powershell
# Восстановить из ZIP-архива
Expand-Archive -Path "E:\Backups\dashflow-2026-09-01.zip" -DestinationPath "E:\DEV\Project\dashflow-restored"

# Создать новый GitHub репозиторий
# Залить код
cd dashflow-restored
git remote set-url origin https://github.com/yourusername/dashflow-new.git
git push -u origin main
\\\

**Время восстановления:** 1-2 часа

**Потери:** История коммитов с последнего monthly backup (макс. 30 дней)

---

### Сценарий 4: Случайная перезапись production данных

**Применимо к:** Пользователю (не разработчику)

**Причина:**
- Пользователь случайно импортировал старый backup
- Перезаписал текущие настройки

**Восстановление:**

К сожалению, **невозможно:**
- DashFlow не хранит историю изменений (нет версионирования)
- Нет функции "Undo"
- `chrome.storage.local` не поддерживает транзакции

**Mitigation (будущее улучшение):**
\\\	ypescript
// Перед импортом — создать автоматический backup
async function safeImport(importData: any) {
  // 1. Создать snapshot текущих данных
  const currentData = await chrome.storage.local.get(null);
  const timestamp = new Date().toISOString();
  
  // 2. Сохранить в "undo" слот
  await chrome.storage.local.set({
    '__undo_backup__': {
      data: currentData,
      timestamp,
    },
  });
  
  // 3. Применить импорт
  await chrome.storage.local.clear();
  await chrome.storage.local.set(importData);
}

// Функция отката
async function undoLastImport() {
  const undo = await chrome.storage.local.get('__undo_backup__');
  if (undo) {
    await chrome.storage.local.clear();
    await chrome.storage.local.set(undo.data);
  }
}
\\\

**Статус:** Не реализовано в v3.7.0, запланировано для v3.8.0

---

### Сценарий 5: Disaster Recovery (полная потеря всего)

**Катастрофический сценарий:**
- GitHub аккаунт удалён
- Локальный репозиторий утерян
- Локальный backup утерян
- Компьютер разработчика уничтожен

**Восстановление:**

Из опубликованных релизов:
1. Скачать последний релиз из Chrome Web Store (reverse engineering .zip)
2. Извлечь код из `.crx` файла
3. Использовать как основу для восстановления

**Проблемы:**
- Утеряна история коммитов
- Утеряна документация (если не в Git)
- Утеряны WIP-изменения

**Вероятность:** Крайне низкая (все 3 backup должны одновременно пропасть)

---

## Тестирование восстановления

### Тест 1: User Data Backup/Restore

**Частота:** Каждый release (перед публикацией)

**Процедура:**
1. Создать тестовую конфигурацию:
   - Добавить 5 задач
   - Добавить 2 заметки
   - Настроить 8 виджетов
   - Изменить тему и обои

2. Экспортировать настройки

3. Очистить все данные: Settings → Clear All Data

4. Импортировать из backup

5. **Проверить:**
   - ✅ Все задачи восстановлены
   - ✅ Все заметки восстановлены
   - ✅ Виджеты на тех же позициях
   - ✅ Тема и обои сохранились

**Критерий успеха:** 100% данных восстановлены без ошибок

---

### Тест 2: Code Repository Restore

**Частота:** 1 раз в квартал

**Процедура:**
1. Удалить локальный репозиторий
2. Клонировать из GitHub
3. `npm install`
4. `npm run dev`
5. Проверить, что расширение запускается

**Критерий успеха:** Полное восстановление за < 15 минут

---

### Тест 3: Release Artifacts Recovery

**Частота:** 1 раз в 6 месяцев

**Процедура:**
1. Скачать релиз из GitHub Releases (случайная версия)
2. Установить в чистом Chrome профиле
3. Проверить работоспособность

**Критерий успеха:** Расширение работает идентично текущей версии

---

## RTO и RPO

### Recovery Time Objective (RTO)

**User Data:**
- **RTO:** < 5 минут (время импорта backup)
- **Условие:** Пользователь имеет свежий backup

**Code Repository:**
- **RTO:** < 15 минут (clone + npm install)
- **Условие:** GitHub репозиторий доступен

**Release Artifacts:**
- **RTO:** Мгновенно (артефакты в GitHub Releases)

---

### Recovery Point Objective (RPO)

**User Data:**
- **RPO:** Зависит от пользователя (частота экспорта)
- **Рекомендация:** 30 дней (ежемесячный export)

**Code Repository:**
- **RPO:** 0 (каждый commit сразу в GitHub)

**Release Artifacts:**
- **RPO:** 0 (каждый release сразу в GitHub)

---

## Заключение

DashFlow следует **distributed backup strategy**:

\\\
┌─────────────────────────────────────────┐
│      Пользовательские данные             │
│   (ответственность пользователя)         │
│                                          │
│  Backup: Export JSON (вручную)          │
│  Хранение: Локально / облако            │
│  RPO: 30 дней                            │
│  RTO: < 5 минут                          │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│      Исходный код и документация         │
│   (ответственность разработчика)         │
│                                          │
│  Backup: Git + GitHub (автоматически)   │
│  Хранение: GitHub + локальный архив     │
│  RPO: 0 (мгновенно)                      │
│  RTO: < 15 минут                         │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│      Release Artifacts                   │
│   (ответственность разработчика)         │
│                                          │
│  Backup: GitHub Releases + локально     │
│  Хранение: GitHub + releases/           │
│  RPO: 0 (мгновенно)                      │
│  RTO: Мгновенно                          │
└─────────────────────────────────────────┘
\\\

**Ключевое правило:**
> Мы не можем сделать backup за пользователя, но обязаны предоставить удобные инструменты Export/Import.

---

**Владелец процесса:** [Ваше имя]  
**Последнее обновление:** 30 сентября 2026  
**Следующий пересмотр:** Март 2027
