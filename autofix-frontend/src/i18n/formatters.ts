// Formatting utilities for currency, dates, and Arabic-Indic vs Western digits

const DIGITS_KEY = 'autofix_digit_mode'; // 'western' or 'arabic-indic', default 'western'

export const getDigitMode = (): 'western' | 'arabic-indic' => {
  return (localStorage.getItem(DIGITS_KEY) as any) || 'western';
};

export const setDigitMode = (mode: 'western' | 'arabic-indic') => {
  localStorage.setItem(DIGITS_KEY, mode);
  window.dispatchEvent(new Event('autofix-digit-mode-changed'));
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

export const formatCurrency = (amount: number, lang: string = 'ar'): string => {
  const formattedNum = (amount || 0).toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

  const displayNum = formatDisplayDigits(formattedNum);
  return lang === 'ar' ? `${displayNum} ج.م` : `${displayNum} EGP`;
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
