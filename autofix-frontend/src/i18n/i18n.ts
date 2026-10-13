import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import ar from './locales/ar.json';

const STORAGE_KEY = 'autofix_lang';
const savedLang = localStorage.getItem(STORAGE_KEY) || 'ar'; // Default Arabic

export const applyDirection = () => {
  document.documentElement.dir = 'rtl';
  document.documentElement.lang = 'ar';
};

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ar: { translation: ar },
    },
    lng: 'ar',
    fallbackLng: 'ar',
    interpolation: {
      escapeValue: false,
    },
  });

applyDirection();

export const setLanguage = (_lang?: 'en' | 'ar') => {
  i18n.changeLanguage('ar');
  applyDirection();
};

export default i18n;
