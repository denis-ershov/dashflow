# Наблюдаемость DashFlow

**Обновлено:** 2026-10-30. Расширение не отправляет телеметрию: всё, что мы знаем о работе у
пользователя, — это локальная диагностика, которую он сам может выгрузить, и публичные сигналы
магазинов и GitHub. Прежняя версия документа описывала скрипты и таблицы, которых нет.

## 1. Локальная диагностика (в расширении)

```text
RootErrorBoundary / WidgetShell ──▶ CrashLogger ──▶ Sanitizer (пути, email, токены) ──▶ кольцевой буфер (20)
resilientFetch ──▶ CircuitBreaker (статусы внешних API)
PerformanceObserver ──▶ WebVitalsMonitor (LCP, CLS, загрузка, память)
            └──────────────▶ Настройки → «Диагностика и система» ──▶ отчёт JSON/Markdown (копирует пользователь)
```

| Компонент | Файл | Что делает |
|---|---|---|
| `CrashLogger` | `src/core/observability/crashLogger.ts`, `sanitizer.ts` | Хранит до 20 последних ошибок в `STORAGE_KEYS.CRASH_LOGS_V1`; перед записью маскирует пути, email и параметры с токенами |
| `WebVitalsMonitor` | `src/core/observability/webVitals.ts` | LCP, CLS, время загрузки, размер JS-кучи; включается флагом `webVitalsMonitoring` |
| `CircuitBreaker` | `src/core/network/circuitBreaker.ts`, `resilientFetch.ts` | Отключает запросы к недоступному сервису погоды/геокодинга и показывает статус |

Пользователь прикладывает отчёт к issue на GitHub; в нём нет личных данных благодаря санитайзеру
(покрыто `tests/unit/observability/`).

## 2. Внешние сигналы

| Сигнал | Где смотреть | Когда реагировать |
|---|---|---|
| Сборка, тесты, E2E | GitHub Actions (`ci.yml`, `release.yml`) | Любой красный запуск на `main` — исправить до следующего коммита |
| Уязвимости зависимостей | Dependabot, шаг `npm audit --omit=dev` в CI | high/critical в рабочих зависимостях блокирует CI |
| Отзывы, рейтинг, установки | Chrome Developer Dashboard, AMO Statistics | Новый отзыв с ошибкой — воспроизвести и завести issue |
| Ошибки от пользователей | GitHub Issues | Ответ в течение 48 часов |
| Доступность Open-Meteo / геокодинга | Статус в «Диагностике»; страницы статуса провайдеров | Массовый отказ — сценарий C в `INCIDENT_RESPONSE.md` |

## 3. Регулярные проверки

- **Еженедельно:** разобрать PR Dependabot, новые issues и отзывы.
- **Перед релизом:** чеклист `DEPLOYMENT_PROCEDURES.md`.
- Цели качества — `SLO.md`.
