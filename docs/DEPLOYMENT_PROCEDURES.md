# Выпуск релиза DashFlow

**Обновлено:** 2026-10-30. Короткий и проверяемый порядок выпуска. Откат — `ROLLBACK_STRATEGY.md`,
инциденты — `INCIDENT_RESPONSE.md`, тексты и права для магазина — `CHROMEWEBSTORE.md`.

## 1. Окружения

| Окружение | Что это | Как запустить |
|---|---|---|
| dev | WXT dev-сервер с HMR, мягкий CSP для localhost | `npm run dev` / `npm run dev:firefox` |
| staging | Собранный пакет, загруженный «распакованным» в чистый профиль браузера | `npm run build:all`, `chrome://extensions` → «Загрузить распакованное» → `.output/chrome-mv3` |
| production | Chrome Web Store и Firefox Add-ons | zip из `.output/` |

Секретов и серверной части нет: окружения отличаются только сборкой и CSP.

## 2. Чеклист перед релизом

1. `main` чистая, все изменения в `docs/CHANGELOG.md` → раздел новой версии вместо `Unreleased`.
2. Версия в `package.json` поднята (semver: patch — исправления, minor — функции). Магазины отклоняют пакет с версией не выше опубликованной.
3. Локально или в CI зелёные: `npm run compile`, `npm run lint`, `npm run format:check`, `npm run test:coverage` (пороги в `vitest.config.ts`), `npm audit --omit=dev --audit-level=high`.
4. `npm run build:all`, затем `npm run test:e2e` — smoke на собранном расширении (рендер, перезагрузка, манифест).
5. Ручная проверка в staging: новая вкладка, добавление виджета, запрос прав в виджетах «Закладки» и RSS, экспорт → импорт, ru/en, светлая/тёмная тема, ширина 375 px и 1920 px.
6. Если менялись права или обработка данных — обновить `CHROMEWEBSTORE.md`, `PRIVACY.md`, `PRIVACY_EN.md`.
7. Размер: сейчас ≈1,7 МБ распакованный пакет и ≈1 МБ zip. Рост больше чем на 10% без причины — разобраться до релиза.

## 3. Выпуск

```bash
git tag v<версия>
git push origin main --tags
```

Тег запускает `.github/workflows/release.yml`: те же проверки, сборка, zip Chrome/Firefox и
архив исходников, GitHub Release с пакетами. Локально пакеты собираются `npm run zip:all`.

## 4. Chrome Web Store

1. Developer Dashboard → DashFlow → Package → Upload new package → `dashflow-<версия>-chrome.zip`.
2. Если менялись права — заполнить обоснования из раздела Permissions Justification в `CHROMEWEBSTORE.md`.
3. Submit for review. Для крупных версий — staged rollout (10% → 50% → 100%).
4. Записать статус в Version History файла `CHROMEWEBSTORE.md`.

## 5. Firefox Add-ons

1. Developer Hub → DashFlow → Upload New Version → `dashflow-<версия>-firefox.zip`.
2. Приложить `dashflow-<версия>-sources.zip`; инструкция сборки: `npm ci && npm run build:firefox` (Node 22).
3. Release notes — из CHANGELOG.

## 6. После релиза

- Проверить, что опубликованная версия ставится в чистый профиль и открывает новую вкладку.
- Следить за отзывами и issues первые 48 часов; при критичной ошибке — `ROLLBACK_STRATEGY.md`.
