import i18next from 'i18next';
import en from './locales/en.json';
import zh from './locales/zh.json';
import fr from './locales/fr.json';
import ja from './locales/ja.json';
import ru from './locales/ru.json';
import vi from './locales/vi.json';

export const supportedLanguages = [
  { code: 'zh', label: '简体中文' },
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'ja', label: '日本語' },
  { code: 'ru', label: 'Русский' },
  { code: 'vi', label: 'Tiếng Việt' },
];

const i18n = i18next.createInstance();

export async function initI18n(lang = 'zh') {
  const language = supportedLanguages.some(item => item.code === lang) ? lang : 'zh';
  if (i18n.isInitialized) {
    await i18n.changeLanguage(language);
    return i18n;
  }
  await i18n.init({
    lng: language,
    fallbackLng: 'zh',
    supportedLngs: supportedLanguages.map(item => item.code),
    resources: { en, zh, fr, ja, ru, vi },
    keySeparator: false,
    nsSeparator: false,
    interpolation: { escapeValue: false },
    initAsync: false,
    initImmediate: false,
    returnNull: false,
  });
  return i18n;
}

export function t(key, options) {
  return i18n.t(key, options);
}

export async function setLanguage(lang) {
  const language = supportedLanguages.some(item => item.code === lang) ? lang : 'zh';
  if (!i18n.isInitialized) return initI18n(language);
  await i18n.changeLanguage(language);
  return i18n;
}
