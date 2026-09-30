# Service Level Objectives (SLO) DashFlow

**Дата создания:** 30 сентября 2026  
**Версия:** 1.0.0

---

## Оглавление

1. [Введение](#введение)
2. [Специфика браузерного расширения](#специфика-браузерного-расширения)
3. [SLI, SLO и Error Budget](#sli-slo-и-error-budget)
4. [User-Facing SLOs](#user-facing-slos)
5. [Technical SLOs](#technical-slos)
6. [Измерение и мониторинг](#измерение-и-мониторинг)
7. [Error Budget Policy](#error-budget-policy)
8. [Действия при нарушении SLO](#действия-при-нарушении-slo)

---

## Введение

Service Level Objectives (SLO) — это **целевые показатели надёжности** сервиса, которые определяют ожидаемое качество для пользователей.

Для DashFlow, браузерного расширения без backend-инфраструктуры, SLO имеют особую специфику.

---

## Специфика браузерного расширения

### Отличия от традиционных веб-сервисов:

| Аспект | Веб-сервис (SaaS) | Браузерное расширение (DashFlow) |
|--------|-------------------|----------------------------------|
| **Инфраструктура** | Централизованная (AWS, GCP) | Децентрализованная (устройства пользователей) |
| **Uptime** | Контролируем | Не контролируем (зависит от браузера) |
| **Latency** | Контролируем | Контролируем частично (зависит от устройства) |
| **Error Rate** | Мониторим в реальном времени | Не мониторим (нет телеметрии) |
| **Availability** | Измеряем через healthchecks | Измеряем косвенно (churn rate, reviews) |

### Что мы НЕ МОЖЕМ измерить напрямую:
- ❌ Время загрузки расширения у конкретного пользователя
- ❌ Количество ошибок JavaScript в runtime
- ❌ Успешность API-запросов к внешним сервисам
- ❌ Uptime расширения (расширение всегда "работает", если браузер запущен)

### Что мы МОЖЕМ измерить:
- ✅ Доступность внешних API (Open-Meteo, BigDataCloud)
- ✅ Churn Rate (удаления расширения)
- ✅ User Rating (удовлетворённость)
- ✅ Build Success Rate (качество релизов)
- ✅ Негативные отзывы (индикатор проблем)

---

## SLI, SLO и Error Budget

### Определения:

**SLI (Service Level Indicator):**
> Измеряемая метрика, которая описывает качество сервиса.

**SLO (Service Level Objective):**
> Целевое значение SLI за определённый период.

**Error Budget:**
> Допустимый объём нарушений SLO.

### Пример:

\\\
SLI: Churn Rate (процент удалений от установок)
SLO: Churn Rate < 10% за 30 дней
Error Budget: 10% (можем позволить 10% churn без действий)

Если Churn Rate = 12% → Error Budget исчерпан → нужны действия
\\\

---

## User-Facing SLOs

### SLO 1: Низкий Churn Rate (удержание пользователей)

**SLI:**
\\\
Churn Rate = (Weekly Uninstalls / Weekly Installs) * 100%
\\\

**SLO:**
- **Целевой показатель:** Churn Rate < 10% за 30 дней
- **Период измерения:** Rolling 30 days
- **Error Budget:** 10%

**Обоснование:**
- Churn Rate — лучший индикатор качества расширения
- < 10% считается здоровым для productivity tools
- > 15% указывает на серьёзные проблемы

**Источник данных:**
- Chrome Web Store Developer Dashboard (еженедельные отчёты)

**Действия при нарушении:**
- Churn Rate 10-15%: Анализ отзывов, hotfix для критичных багов
- Churn Rate > 15%: Немедленный rollback или emergency fix

---

### SLO 2: Высокий User Rating (удовлетворённость)

**SLI:**
\\\
User Rating = Средний рейтинг (1-5 звёзд) в Chrome Web Store
\\\

**SLO:**
- **Целевой показатель:** Rating ≥ 4.5 звёзд
- **Период измерения:** Continuous (текущее значение)
- **Threshold:** Rating не должен падать ниже 4.0

**Обоснование:**
- Rating < 4.0 считается "плохим" для расширений
- Rating 4.5+ считается "отличным"
- Rating влияет на ранжирование в Chrome Web Store

**Источник данных:**
- Chrome Web Store (публичный рейтинг)
- Firefox Add-ons (публичный рейтинг)

**Действия при нарушении:**
- Rating 4.0-4.5: Мониторинг, ответ на негативные отзывы
- Rating < 4.0: Анализ топ-проблем, hotfix релиз

---

### SLO 3: Быстрое время загрузки новой вкладки

**SLI:**
\\\
Time to Interactive (TTI) = Время от открытия вкладки до полной отрисовки UI
\\\

**SLO:**
- **Целевой показатель:** TTI < 500ms на современных устройствах
- **Период измерения:** Per-release (QA testing)
- **Test devices:**
  - MacBook Air M1 (target: < 300ms)
  - Windows Laptop i5 (target: < 500ms)
  - Old Android (Firefox, target: < 1000ms)

**Обоснование:**
- Новая вкладка открывается часто (10-50 раз в день)
- Задержка > 1s раздражает пользователей
- Быстрая загрузка = конкурентное преимущество

**Измерение:**
```typescript
// Реализовано в src/core/observability/webVitals.ts
// Автоматически инициализируется в src/entrypoints/newtab/main.tsx
import { webVitals } from '@/core/observability';

webVitals.init();
const metrics = webVitals.getMetrics();
// metrics.loadDuration (мс), metrics.lcp (мс), metrics.cls, metrics.jsHeapUsedSize
```

**Действия при нарушении:**
- TTI / Load Duration > 1s: Профилирование, оптимизация (lazy loading, code splitting)
- LCP > 1200ms или CLS > 0.05: Блокирует релиз, требует рефакторинга компонентов

---

### SLO 4: Доступность внешних API

**SLI:**
\\\
API Availability = (Successful Requests / Total Requests) * 100%
\\\

**SLO по API:**

| API | Target Availability | Error Budget | Критичность |
|-----|---------------------|--------------|-------------|
| Open-Meteo Weather | 99.5% (43 мин downtime/месяц) | 0.5% | High |
| BigDataCloud Geolocation | 99.0% (7 ч downtime/месяц) | 1.0% | Medium |
| Unsplash Images CDN | 99.9% (43 сек downtime/месяц) | 0.1% | Low |

**Обоснование:**
- Weather API — используется пользователями ежедневно
- Geolocation — используется только при первой настройке
- Unsplash — статичные изображения, кэшируются браузером

**Источник данных:**
- UptimeRobot / StatusCake (ping каждые 5-15 минут)

**Действия при нарушении:**
- Downtime < 1 час: Мониторинг, fallback на cached data
- Downtime > 24 часа: GitHub Issue, рассмотреть альтернативные API

---

## Technical SLOs

### SLO 5: Build Success Rate

**SLI:**
\\\
Build Success Rate = (Successful Builds / Total Builds) * 100%
\\\

**SLO:**
- **Целевой показатель:** ≥ 95% успешных builds за 30 дней
- **Период измерения:** Rolling 30 days
- **Scope:** main branch builds (GitHub Actions)

**Обоснование:**
- Нестабильные builds блокируют релизы
- < 90% указывает на проблемы с CI/CD или кодом

**Источник данных:**
- GitHub Actions (https://github.com/yourusername/dashflow/actions)

**Действия при нарушении:**
- Success Rate 90-95%: Проверить flaky tests, исправить
- Success Rate < 90%: Заморозить merge до стабилизации

---

### SLO 6: Dependency Security (отсутствие критичных CVE)

**SLI:**
\\\
Critical Vulnerabilities = Количество high/critical CVE в зависимостях
\\\

**SLO:**
- **Целевой показатель:** 0 high/critical vulnerabilities
- **Период измерения:** Continuous
- **Максимальный TTR (Time To Remediate):** 7 дней

**Обоснование:**
- Браузерные расширения имеют широкие permissions
- Уязвимость может скомпрометировать данные пользователя
- Магазины могут удалить расширение при обнаружении CVE

**Источник данных:**
\\\powershell
npm audit --audit-level=high
\\\

**Действия при обнаружении:**
- High/Critical CVE: Обновить зависимость в течение 7 дней
- CVE без патча: Рассмотреть замену библиотеки

---

### SLO 7: Release Frequency (регулярность обновлений)

**SLI:**
\\\
Release Cadence = Количество дней между релизами
\\\

**SLO:**
- **Целевой показатель:** Минимум 1 релиз в 30 дней
- **Максимальный интервал:** 60 дней без релиза

**Обоснование:**
- Регулярные релизы показывают активное развитие
- Долгие перерывы → пользователи думают, что проект заброшен
- Bugfixes должны доходить до пользователей быстро

**Источник данных:**
- GitHub Releases (https://github.com/yourusername/dashflow/releases)

**Действия при нарушении:**
- > 45 дней без релиза: Запланировать patch release с мелкими улучшениями
- > 90 дней: Проект считается stale, нужен postmortem

---

## Измерение и мониторинг

### Dashboard: Product Health Scorecard

**Еженедельное обновление (каждый понедельник):**

| SLO | Target | Current | Status | Error Budget |
|-----|--------|---------|--------|--------------|
| Churn Rate | < 10% | 8.2% | ✅ Green | 18% remaining |
| User Rating | ≥ 4.5 | 4.6 | ✅ Green | N/A |
| TTI (MacBook) | < 500ms | 320ms | ✅ Green | N/A |
| Weather API | 99.5% | 99.8% | ✅ Green | 60% remaining |
| Build Success | ≥ 95% | 97% | ✅ Green | 40% remaining |
| CVEs | 0 high | 0 | ✅ Green | N/A |
| Release Cadence | < 30d | 21 days | ✅ Green | N/A |

**Статусы:**
- 🟢 **Green:** SLO соблюдается, error budget > 25%
- 🟡 **Yellow:** SLO на грани нарушения, error budget 10-25%
- 🔴 **Red:** SLO нарушен, error budget исчерпан

---

### Автоматизация мониторинга

#### UptimeRobot для внешних API

**Конфигурация:**
\\\yaml
monitors:
  - name: "Open-Meteo Weather API"
    url: "https://api.open-meteo.com/v1/forecast?latitude=55.75&longitude=37.61&current=temperature_2m"
    interval: 5 minutes
    alert_contacts: [email, slack]
    
  - name: "BigDataCloud Geolocation"
    url: "https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=55.75&longitude=37.61"
    interval: 15 minutes
    alert_contacts: [email]
\\\

#### GitHub Actions для Build Success Rate

**Workflow:**
\\\yaml
# .github/workflows/slo-build-success.yml
name: Track Build Success Rate

on:
  schedule:
    - cron: '0 0 * * 1'  # Каждый понедельник в 00:00

jobs:
  track-builds:
    runs-on: ubuntu-latest
    steps:
      - name: Calculate Build Success Rate
        run: |
          # Получить последние 50 builds
          # Подсчитать % успешных
          # Сравнить с SLO (95%)
          # Если < 95% → создать GitHub Issue
\\\

---

## Error Budget Policy

### Что такое Error Budget?

**Error Budget** — это допустимый объём "плохого" поведения сервиса.

\\\
Error Budget = 100% - SLO

Если SLO = 99.5% availability
→ Error Budget = 0.5% (43 минуты downtime в месяц)
\\\

### Политика использования Error Budget

#### 🟢 Budget > 50% (всё отлично)
- **Действия:** Можно рисковать
  - Релизить новые функции быстрее
  - Экспериментировать с архитектурой
  - Рефакторинг большого масштаба

#### 🟡 Budget 25-50% (внимание)
- **Действия:** Осторожность
  - Замедлить релизы
  - Больше тестирования перед production
  - Staged rollout для новых версий

#### 🔴 Budget < 25% (исчерпан)
- **Действия:** Заморозить изменения
  - **Запрет на новые features** до восстановления budget
  - Фокус только на bugfixes и stability
  - Postmortem для выявления причин

---

### Пример: Churn Rate Error Budget

**Scenario:**

\\\
SLO: Churn Rate < 10%
Error Budget: 10%

Week 1: Churn = 8% (OK, budget не тратится)
Week 2: Churn = 12% (Превышение на 2%, тратим 20% budget)
Week 3: Churn = 15% (Превышение на 5%, тратим ещё 50% budget)
Week 4: Churn = 7% (OK, budget восстанавливается)

Итого: Error Budget = 30% потрачено за месяц
\\\

**Действия:**
- Провести retrospective
- Выявить причину spike в Week 2-3
- Если spike был из-за бага → hotfix
- Если из-за новой функции → откатить feature flag

---

## Действия при нарушении SLO

### Процедура реагирования

#### Шаг 1: Обнаружение нарушения

**Источники:**
- Еженедельный Product Health Dashboard (ручной)
- UptimeRobot alerts (автоматический)
- GitHub Actions failure (автоматический)
- Spike в негативных отзывах (ручной)

#### Шаг 2: Оценка серьёзности

| Severity | Определение | Пример |
|----------|-------------|--------|
| **P0 - Critical** | SLO нарушен > 2x | Churn Rate = 25% (при SLO 10%) |
| **P1 - High** | SLO нарушен 1.5-2x | Churn Rate = 15% |
| **P2 - Medium** | SLO нарушен < 1.5x | Churn Rate = 12% |
| **P3 - Low** | SLO на грани | Churn Rate = 10.5% |

#### Шаг 3: Действия по severity

**P0 - Critical:**
1. Немедленный rollback последнего релиза
2. GitHub Issue с меткой `[CRITICAL]`
3. Email всем contributors
4. Hotfix релиз в течение 24 часов
5. Postmortem после устранения

**P1 - High:**
1. GitHub Issue с меткой `[HIGH PRIORITY]`
2. Анализ root cause в течение 48 часов
3. Hotfix релиз в течение 7 дней
4. Ответ на негативные отзывы

**P2 - Medium:**
1. GitHub Issue с меткой `[BUG]`
2. Включить в следующий planned release
3. Мониторинг динамики

**P3 - Low:**
1. Мониторинг
2. Если тренд ухудшается → повысить до P2

#### Шаг 4: Postmortem (для P0-P1)

**Шаблон:**
\\\markdown
# Postmortem: Churn Rate spike в Week 42

## Incident Summary
- Дата: 2026-10-15
- Severity: P0
- SLO: Churn Rate < 10%
- Фактическое значение: 22%
- Duration: 7 дней
- Impact: 150 пользователей удалили расширение

## Root Cause
- Версия 3.7.0 содержала баг в Weather Widget
- При отсутствии интернета виджет зависал и блокировал весь UI
- Пользователи не могли открыть новую вкладку

## Timeline
- Oct 10: Релиз v3.7.0
- Oct 12: Первые негативные отзывы
- Oct 13: Spike в uninstalls замечен
- Oct 14: Root cause найден, hotfix v3.7.1 собран
- Oct 15: Hotfix опубликован
- Oct 17: Churn rate вернулся к норме

## Actions Taken
1. Rollback recommendation в Chrome Web Store reviews
2. Hotfix v3.7.1 с fallback для offline случая
3. Добавлен E2E тест для offline сценария

## Lessons Learned
- Нужны offline E2E тесты перед каждым релизом
- Staged rollout (10% → 50% → 100%) для major версий
- Мониторинг churn rate первые 48 часов после релиза

## Prevention
- Добавлен CI check: offline E2E test
- Обновлён Pre-Deployment Checklist
- Staged rollout policy для v3.8.0+
\\\

---

## Заключение

### Философия SLO для DashFlow:

1. **User-centric:** SLO фокусируются на пользовательском опыте (churn, rating, speed)
2. **Measurable:** Используем доступные метрики (Chrome Web Store, GitHub, UptimeRobot)
3. **Actionable:** Каждое нарушение SLO имеет чёткий action plan
4. **Balanced:** Error Budget позволяет балансировать velocity и stability

### Приоритет SLO:

\\\
1. Churn Rate < 10%           ← Самый важный (retention)
2. User Rating ≥ 4.5           ← Второй по важности (satisfaction)
3. Weather API 99.5%           ← Критичная зависимость
4. TTI < 500ms                 ← Performance
5. Build Success ≥ 95%         ← Operational excellence
6. 0 Critical CVEs             ← Security
7. Release Cadence < 30d       ← Development velocity
\\\

---

**Владелец процесса:** [Ваше имя]  
**Последнее обновление:** 30 сентября 2026  
**Следующий пересмотр:** Квартальный review
