// Formatting utilities for currency, dates, and Arabic-Indic vs Western digits

const DIGITS_KEY = 'autofix_digit_mode'; // 'arabic-indic' (default) or 'western'
const CURRENCY_LABEL_EN_KEY = 'autofix_currency_label_en';
const CURRENCY_LABEL_AR_KEY = 'autofix_currency_label_ar';
export const DEFAULT_CURRENCY_LABEL_EN = 'ج.م';
export const DEFAULT_CURRENCY_LABEL_AR = 'ج.م';

export const getDigitMode = (): 'western' | 'arabic-indic' => {
  if (typeof localStorage === 'undefined') return 'arabic-indic';
  return (localStorage.getItem(DIGITS_KEY) as any) || 'arabic-indic';
};

export const setDigitMode = (mode: 'western' | 'arabic-indic') => {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(DIGITS_KEY, mode);
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('autofix-digit-mode-changed'));
  }
};

export const getCurrencyLabel = (lang?: string): string => {
  const currentLang = lang || (typeof document !== 'undefined' && document.documentElement?.lang === 'en' ? 'en' : 'ar');
  if (typeof localStorage === 'undefined') {
    return currentLang === 'en' ? DEFAULT_CURRENCY_LABEL_EN : DEFAULT_CURRENCY_LABEL_AR;
  }
  if (currentLang === 'en') {
    return localStorage.getItem(CURRENCY_LABEL_EN_KEY) || DEFAULT_CURRENCY_LABEL_EN;
  }
  return localStorage.getItem(CURRENCY_LABEL_AR_KEY) || DEFAULT_CURRENCY_LABEL_AR;
};

export const setCurrencyLabel = (lang: 'en' | 'ar', label: string) => {
  if (typeof localStorage !== 'undefined') {
    if (lang === 'en') {
      localStorage.setItem(CURRENCY_LABEL_EN_KEY, label.trim() || DEFAULT_CURRENCY_LABEL_EN);
    } else {
      localStorage.setItem(CURRENCY_LABEL_AR_KEY, label.trim() || DEFAULT_CURRENCY_LABEL_AR);
    }
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('autofix-currency-settings-changed'));
  }
};

export const resetCurrencyLabels = () => {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(CURRENCY_LABEL_EN_KEY);
    localStorage.removeItem(CURRENCY_LABEL_AR_KEY);
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('autofix-currency-settings-changed'));
  }
};

const easternDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

export const toArabicIndicDigits = (val: string | number): string => {
  return String(val).replace(/[0-9]/g, (w) => easternDigits[+w]);
};

export const toWesternDigits = (val: string | number): string => {
  return String(val)
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776));
};

export const formatDisplayDigits = (val: string | number): string => {
  const mode = getDigitMode();
  if (mode === 'arabic-indic') {
    return toArabicIndicDigits(val);
  }
  return String(val);
};

export const formatCurrency = (amount: number | null | undefined, lang?: string): string => {
  const currentLang = lang || (typeof document !== 'undefined' && document.documentElement?.lang === 'en' ? 'en' : 'ar');
  const num = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
  const isNegative = num < 0;
  const absNum = Math.abs(num);

  const formattedAbs = absNum.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const displayNum = formatDisplayDigits(formattedAbs);
  const label = getCurrencyLabel(currentLang);
  const sign = isNegative ? '-' : '';

  // Label sits after the number in both English and Arabic: "5,472.00 L.E", "-200.00 L.E", "5,472.00 ج.م"
  return `${sign}${displayNum} ${label}`;
};

export const parsePriceInput = (val: string): number | null => {
  if (!val) return null;
  const western = toWesternDigits(val).replace(/,/g, '').trim();
  const parsed = parseFloat(western);
  return isNaN(parsed) ? null : parsed;
};

export const formatDate = (dateInput: string | Date | null | undefined): string => {
  if (!dateInput) return '—';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return '—';

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();

  return formatDisplayDigits(`${day}/${month}/${year}`);
};

