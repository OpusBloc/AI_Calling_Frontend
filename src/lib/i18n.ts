import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import translation files
import enCommon from '../locales/en/common.json';
import hiCommon from '../locales/hi/common.json';
import teCommon from '../locales/te/common.json';
import arCommon from '../locales/ar/common.json';
import thCommon from '../locales/th/common.json';
import mrCommon from '../locales/mr/common.json';
 // Added Thai

const resources = {
  en: { common: enCommon },
  hi: { common: hiCommon },
  te: { common: teCommon },
  ar: { common: arCommon },
  th: { common: thCommon }, 
  mr: { common: mrCommon },
  // Added Thai
};

// Always start with English on server side to avoid hydration mismatch
const defaultLanguage = 'en';

if (!i18n.isInitialized) {
  i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: defaultLanguage,
      fallbackLng: 'en',
      defaultNS: 'common',

      interpolation: {
        escapeValue: false, // React already escapes values
      },

      react: {
        useSuspense: false,
      },
    });
}

// Save language to localStorage when it changes
i18n.on('languageChanged', (lng) => {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('language', lng);
    } catch {}
    document.documentElement.setAttribute('lang', lng);
  }
});

export default i18n;
