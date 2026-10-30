/**
 * Скриншоты для листингов Chrome Web Store и AMO (1280×800) из собранного расширения.
 * Запуск: npm run build:chrome && npm run screenshots
 * Результат: docs/store/<язык>-<номер>-<сцена>.png. Данные — стартовая раскладка без личного контента.
 */
import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const EXTENSION_PATH = path.resolve('.output/chrome-mv3');
const OUT_DIR = path.resolve('docs/store');
const VIEWPORT = { width: 1280, height: 800 };

/** Сцены: подготовка страницы перед снимком. Подписи кнопок берутся из ru/en словарей дока */
const SCENES = [
  { name: 'dashboard', prepare: async () => {} },
  {
    name: 'command-palette',
    prepare: async (page) => {
      await page.keyboard.press('Control+K');
    },
  },
  {
    name: 'appearance',
    prepare: async (page, labels) => {
      await page.getByRole('button', { name: labels.appearance }).first().click();
    },
  },
];

/**
 * Пример ответа Open-Meteo для съёмки: снимки не должны зависеть от сети и погоды за окном.
 * Интерфейс в кадре настоящий, условны только значения прогноза.
 */
function sampleForecast() {
  const now = new Date();
  now.setMinutes(0, 0, 0);
  const hours = Array.from({ length: 48 }, (_, i) => new Date(now.getTime() + i * 3_600_000));
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
  const wave = (i, base, amp) => Math.round((base + amp * Math.sin(i / 3.8)) * 10) / 10;
  return {
    current: {
      temperature_2m: 18.4,
      relative_humidity_2m: 62,
      apparent_temperature: 17.6,
      is_day: 1,
      weather_code: 2,
      cloud_cover: 40,
      surface_pressure: 1016,
      wind_speed_10m: 3.4,
      wind_direction_10m: 225,
      wind_gusts_10m: 6.1,
    },
    hourly: {
      time: hours.map((d) => d.toISOString().slice(0, 16)),
      temperature_2m: hours.map((_, i) => wave(i, 17, 4)),
      weather_code: hours.map((_, i) => [1, 2, 3, 2, 61, 2][i % 6]),
      precipitation_probability: hours.map((_, i) => (i % 6 === 4 ? 60 : 10)),
      is_day: hours.map((d) => (d.getHours() >= 7 && d.getHours() < 20 ? 1 : 0)),
      relative_humidity_2m: hours.map(() => 60),
      wind_speed_10m: hours.map(() => 3),
      uv_index: hours.map(() => 4),
      visibility: hours.map(() => 20_000),
    },
    daily: {
      time: days,
      weather_code: [2, 3, 61, 1, 0, 2, 3],
      temperature_2m_max: [21, 19, 16, 20, 23, 22, 18],
      temperature_2m_min: [12, 11, 9, 10, 13, 14, 11],
      sunrise: days.map((d) => `${d}T07:12`),
      sunset: days.map((d) => `${d}T18:41`),
      uv_index_max: [5, 3, 2, 5, 6, 5, 3],
      precipitation_probability_max: [10, 30, 80, 5, 0, 10, 40],
    },
  };
}

const LANGUAGES = [
  { code: 'en', locale: 'en-US', labels: { appearance: 'Themes and wallpapers' } },
  { code: 'ru', locale: 'ru-RU', labels: { appearance: 'Темы и обои' } },
];

async function shootLanguage({ code, locale, labels }) {
  const context = await chromium.launchPersistentContext('', {
    channel: 'chromium',
    viewport: VIEWPORT,
    locale,
    colorScheme: 'dark',
    args: [`--disable-extensions-except=${EXTENSION_PATH}`, `--load-extension=${EXTENSION_PATH}`],
  });
  try {
    await context.route('https://api.open-meteo.com/**', (route) =>
      route.fulfill({ json: sampleForecast() }),
    );
    const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent('serviceworker'));
    const url = `chrome-extension://${new URL(worker.url()).host}/newtab.html`;

    for (const [index, scene] of SCENES.entries()) {
      const page = await context.newPage();
      await page.goto(url);
      await page.getByTestId('grid-engine-container').waitFor();
      // Погода приходит из сети: ждём градусы, но не дольше 10 с (офлайн — снимок со скелетоном)
      await page
        .getByText(/-?\d+°/)
        .first()
        .waitFor({ timeout: 10_000 })
        .catch(() => console.warn('  погода не загрузилась'));
      await page.waitForTimeout(800); // анимации появления
      await scene.prepare(page, labels);
      await page.waitForTimeout(600);
      const file = path.join(OUT_DIR, `${code}-${index + 1}-${scene.name}.png`);
      await page.screenshot({ path: file });
      console.log(`✔ ${path.relative(process.cwd(), file)}`);
      await page.close();
    }
  } finally {
    await context.close();
  }
}

await mkdir(OUT_DIR, { recursive: true });
for (const language of LANGUAGES) {
  await shootLanguage(language);
}
