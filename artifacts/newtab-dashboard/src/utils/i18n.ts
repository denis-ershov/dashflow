import { useSettingsStore } from "../components/dashboard/store";
import { en } from "./locales/en";
import { ru } from "./locales/ru";
import type { Translations } from "./locales/en";

export type { Translations };
export type Lang = "en" | "ru";

const LOCALES: Record<Lang, Translations> = { en, ru };

export function getTranslations(lang: Lang): Translations {
  return LOCALES[lang] ?? LOCALES.en;
}

export function useTranslation(): Translations {
  const lang = useSettingsStore(s => s.language) as Lang;
  return getTranslations(lang);
}

export function detectLanguage(): Lang {
  const lang = (navigator.language ?? "").toLowerCase();
  if (lang.startsWith("ru")) return "ru";
  return "en";
}
