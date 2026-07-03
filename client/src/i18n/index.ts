import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";
import en from "./en";
import ko from "./ko";
import th from "./th";
import zhTW from "./zh-TW";
import zhCN from "./zh-CN";

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "zh-CN", label: "简体中文", flag: "🇨🇳" },
  { code: "zh-TW", label: "繁體中文", flag: "🇹🇼" },
  { code: "ko", label: "한국어", flag: "🇰🇷" },
  { code: "th", label: "ภาษาไทย", flag: "🇹🇭" },
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]["code"];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      "zh-CN": { translation: zhCN },
      "zh-TW": { translation: zhTW },
      ko: { translation: ko },
      th: { translation: th },
    },
    fallbackLng: "en",
    supportedLngs: ["en", "zh-CN", "zh-TW", "ko", "th"],
    detection: {
      order: ["path", "localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "yah_mobile_lang",
    },
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
