import { createContext, useContext, useState, ReactNode } from 'react';

// Language codes mapping
const languageMap: Record<string, string> = {
  'English': 'en',
  'العربية': 'ar',
  'العربية (البحرين)': 'ar-BH',
  'Azərbaycan': 'az',
  'български': 'bg',
  'čeština': 'cs',
  'Dansk': 'da',
  'Deutsch': 'de',
  'Ελληνικά': 'el',
  'Español': 'es',
  'Français': 'fr',
  'हिन्दी': 'hi',
  'Magyar': 'hu',
  'Bahasa Indonesia': 'id',
  'Italiano': 'it',
  '日本語': 'ja',
  '한국어': 'ko',
  'Nederlands': 'nl',
  'Norsk': 'no',
  'Polski': 'pl',
  'Português': 'pt',
  'Română': 'ro',
  'Русский': 'ru',
  'Svenska': 'sv',
  'Türkçe': 'tr',
  'Українська': 'uk',
  'Tiếng Việt': 'vi',
  '中文': 'zh',
};

// Translations
const translations: Record<string, Record<string, string>> = {
  en: {
    'Dashboard': 'Dashboard',
    'Markets': 'Markets',
    'Journal': 'Journal',
    'Strategies': 'Strategies',
    'Reports': 'Reports',
    'Competition': 'Competition',
    'Study': 'Study',
    'Alpha Hub': 'Alpha Hub',
    'Settings': 'Settings',
    'Search trades, symbols...': 'Search trades, symbols...',
    'Language': 'Language',
    'Currency': 'Currency',
    'Search': 'Search',
  },
  de: {
    'Dashboard': 'Dashboard',
    'Markets': 'Märkte',
    'Journal': 'Journal',
    'Strategies': 'Strategien',
    'Reports': 'Berichte',
    'Competition': 'Wettbewerb',
    'Study': 'Lernen',
    'Alpha Hub': 'Alpha Hub',
    'Settings': 'Einstellungen',
    'Search trades, symbols...': 'Trades, Symbole suchen...',
    'Language': 'Sprache',
    'Currency': 'Währung',
    'Search': 'Suchen',
  },
  es: {
    'Dashboard': 'Panel',
    'Markets': 'Mercados',
    'Journal': 'Diario',
    'Strategies': 'Estrategias',
    'Reports': 'Informes',
    'Competition': 'Competencia',
    'Study': 'Estudiar',
    'Alpha Hub': 'Alpha Hub',
    'Settings': 'Configuración',
    'Search trades, symbols...': 'Buscar operaciones, símbolos...',
    'Language': 'Idioma',
    'Currency': 'Moneda',
    'Search': 'Buscar',
  },
  fr: {
    'Dashboard': 'Tableau de bord',
    'Markets': 'Marchés',
    'Journal': 'Journal',
    'Strategies': 'Stratégies',
    'Reports': 'Rapports',
    'Competition': 'Compétition',
    'Study': 'Étudier',
    'Alpha Hub': 'Alpha Hub',
    'Settings': 'Paramètres',
    'Search trades, symbols...': 'Rechercher des trades, symboles...',
    'Language': 'Langue',
    'Currency': 'Devise',
    'Search': 'Rechercher',
  },
  // Add more translations as needed - for now, default to English for others
};

// Currency exchange rates (this would typically come from an API)
// For now, using approximate rates - in production, fetch from an API
const getExchangeRate = async (from: string, to: string): Promise<number> => {
  // In production, fetch from an API like exchangerate-api.com or fixer.io
  // For now, return 1 for same currency or use hardcoded rates
  if (from === to) return 1;
  
  // Hardcoded rates (should be fetched from API in production)
  const rates: Record<string, number> = {
    'USD': 1,
    'EUR': 0.92,
    'GBP': 0.79,
    'JPY': 149.5,
    'CNY': 7.24,
    'INR': 83.1,
    'KRW': 1330,
    'AUD': 1.52,
    'CAD': 1.36,
    'CHF': 0.88,
    'NZD': 1.66,
    'SGD': 1.34,
    'HKD': 7.82,
    'SEK': 10.5,
    'NOK': 10.7,
    'DKK': 6.87,
    'PLN': 4.02,
    'TRY': 32.1,
    'RUB': 91.5,
    'ZAR': 18.7,
    'BRL': 4.95,
    'MXN': 17.1,
    'ARS': 350,
  };
  
  const fromRate = rates[from] || 1;
  const toRate = rates[to] || 1;
  
  return toRate / fromRate;
};

interface LanguageCurrencyContextType {
  language: string;
  setLanguage: (lang: string) => void;
  currency: string;
  setCurrency: (curr: string) => void;
  t: (key: string) => string;
  convertCurrency: (amount: number, fromCurrency?: string) => Promise<number>;
  formatCurrency: (amount: number, fromCurrency?: string) => Promise<string>;
}

const LanguageCurrencyContext = createContext<LanguageCurrencyContextType | undefined>(undefined);

export function LanguageCurrencyProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<string>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return localStorage.getItem('tradecircle-language') || 'English';
      }
    } catch (e) {
      console.warn('localStorage not available:', e);
    }
    return 'English';
  });
  const [currency, setCurrencyState] = useState<string>(() => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return localStorage.getItem('tradecircle-currency') || 'USD-$';
      }
    } catch (e) {
      console.warn('localStorage not available:', e);
    }
    return 'USD-$';
  });

  // Note: Exchange rates are calculated on-demand in getExchangeRate function

  const setLanguage = (lang: string) => {
    setLanguageState(lang);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('tradecircle-language', lang);
      }
    } catch (e) {
      console.warn('Failed to save language to localStorage:', e);
    }
  };

  const setCurrency = (curr: string) => {
    setCurrencyState(curr);
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('tradecircle-currency', curr);
      }
    } catch (e) {
      console.warn('Failed to save currency to localStorage:', e);
    }
  };

  const t = (key: string): string => {
    try {
      if (!language || !key) return key || '';
      const langCode = languageMap[language] || 'en';
      const langTranslations = translations[langCode] || translations['en'] || {};
      return langTranslations[key] || key;
    } catch (e) {
      console.warn('Translation error:', e);
      return key || '';
    }
  };

  const convertCurrency = async (amount: number, fromCurrency: string = 'USD'): Promise<number> => {
    const toCurrency = currency.split('-')[0];
    if (fromCurrency === toCurrency) return amount;
    
    const rate = await getExchangeRate(fromCurrency, toCurrency);
    return amount * rate;
  };

  const formatCurrency = async (amount: number, fromCurrency: string = 'USD'): Promise<string> => {
    const converted = await convertCurrency(amount, fromCurrency);
    const currencyCode = currency.split('-')[0];
    
    return new Intl.NumberFormat(languageMap[language] || 'en', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 8,
    }).format(converted);
  };

  return (
    <LanguageCurrencyContext.Provider
      value={{
        language,
        setLanguage,
        currency,
        setCurrency,
        t,
        convertCurrency,
        formatCurrency,
      }}
    >
      {children}
    </LanguageCurrencyContext.Provider>
  );
}

export function useLanguageCurrency() {
  const context = useContext(LanguageCurrencyContext);
  if (context === undefined) {
    throw new Error('useLanguageCurrency must be used within a LanguageCurrencyProvider');
  }
  return context;
}
