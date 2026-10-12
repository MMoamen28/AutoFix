import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import ar from './locales/ar.json';

const STORAGE_KEY = 'autofix_lang';
const savedLang = localStorage.getItem(STORAGE_KEY) || 'ar'; // Default Arabic

export const applyDirection = (lang: string) => {
  const isAr = lang === 'ar';
  document.documentElement.dir = isAr ? 'rtl' : 'ltr';
  document.documentElement.lang = isAr ? 'ar' : 'en';
};

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ar: { translation: ar },
    },
    lng: savedLang,
    fallbackLng: 'ar',
    interpolation: {
      escapeValue: false,
    },
  });

applyDirection(savedLang);

i18n.on('languageChanged', (lng) => {
  localStorage.setItem(STORAGE_KEY, lng);
  applyDirection(lng);
});

export const setLanguage = (lang: 'en' | 'ar') => {
  i18n.changeLanguage(lang);
};

export default i18n;
