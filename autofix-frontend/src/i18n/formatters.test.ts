import { describe, it, expect, beforeEach } from 'vitest';
import {
  formatCurrency,
  getCurrencyLabel,
  setCurrencyLabel,
  resetCurrencyLabels,
  setDigitMode,
  getDigitMode,
  toArabicIndicDigits,
  toWesternDigits,
  parsePriceInput,
  DEFAULT_CURRENCY_LABEL_EN,
  DEFAULT_CURRENCY_LABEL_AR
} from './formatters';

const storage: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => storage[key] ?? null,
  setItem: (key: string, val: string) => { storage[key] = String(val); },
  removeItem: (key: string) => { delete storage[key]; },
  clear: () => { Object.keys(storage).forEach(k => delete storage[k]); }
};
(globalThis as any).localStorage = localStorageMock;

describe('formatCurrency and Currency Settings', () => {
  beforeEach(() => {
    localStorage.clear();
    resetCurrencyLabels();
    setDigitMode('western');
  });

  it('formats zero correctly with 2 decimals in English and Arabic', () => {
    expect(formatCurrency(0, 'en')).toBe('0.00 L.E');
    expect(formatCurrency(0, 'ar')).toBe('0.00 ج.م');
    expect(formatCurrency(0.0, 'en')).toBe('0.00 L.E');
  });

  it('formats standard amounts with 2 decimals and thousands separators', () => {
    expect(formatCurrency(5472, 'en')).toBe('5,472.00 L.E');
    expect(formatCurrency(5472, 'ar')).toBe('5,472.00 ج.م');
    expect(formatCurrency(4800, 'en')).toBe('4,800.00 L.E');
    expect(formatCurrency(672, 'en')).toBe('672.00 L.E');
    expect(formatCurrency(19.9, 'en')).toBe('19.90 L.E');
    expect(formatCurrency(123.456, 'en')).toBe('123.46 L.E');
  });

  it('formats large numbers correctly with thousands separators', () => {
    expect(formatCurrency(1000000, 'en')).toBe('1,000,000.00 L.E');
    expect(formatCurrency(1000000, 'ar')).toBe('1,000,000.00 ج.م');
    expect(formatCurrency(12345678.9, 'en')).toBe('12,345,678.90 L.E');
  });

  it('formats negative amounts clearly with minus sign before number', () => {
    expect(formatCurrency(-200, 'en')).toBe('-200.00 L.E');
    expect(formatCurrency(-200, 'ar')).toBe('-200.00 ج.م');
    expect(formatCurrency(-5472.5, 'en')).toBe('-5,472.50 L.E');
  });

  it('gracefully handles null, undefined, and NaN as 0.00', () => {
    expect(formatCurrency(null, 'en')).toBe('0.00 L.E');
    expect(formatCurrency(undefined, 'en')).toBe('0.00 L.E');
    expect(formatCurrency(Number.NaN, 'en')).toBe('0.00 L.E');
  });

  it('allows owner to customize currency labels and reset them', () => {
    expect(getCurrencyLabel('en')).toBe(DEFAULT_CURRENCY_LABEL_EN);
    expect(getCurrencyLabel('ar')).toBe(DEFAULT_CURRENCY_LABEL_AR);

    setCurrencyLabel('en', 'EGP');
    setCurrencyLabel('ar', 'جنيه مصري');

    expect(getCurrencyLabel('en')).toBe('EGP');
    expect(getCurrencyLabel('ar')).toBe('جنيه مصري');
    expect(formatCurrency(500, 'en')).toBe('500.00 EGP');
    expect(formatCurrency(500, 'ar')).toBe('500.00 جنيه مصري');

    resetCurrencyLabels();
    expect(getCurrencyLabel('en')).toBe('L.E');
    expect(getCurrencyLabel('ar')).toBe('ج.م');
    expect(formatCurrency(500, 'en')).toBe('500.00 L.E');
  });

  it('respects Arabic-Indic digits mode when enabled', () => {
    setDigitMode('arabic-indic');
    expect(getDigitMode()).toBe('arabic-indic');

    const formattedAr = formatCurrency(5472, 'ar');
    expect(formattedAr).toBe('٥,٤٧٢.٠٠ ج.م');

    const formattedNeg = formatCurrency(-200, 'ar');
    expect(formattedNeg).toBe('-٢٠٠.٠٠ ج.م');
  });

  it('converts Arabic-Indic digits back to Western digits accurately', () => {
    expect(toWesternDigits('٠١٢٣٤٥٦٧٨٩')).toBe('0123456789');
    expect(toWesternDigits('٥٤٧٢.٠٠')).toBe('5472.00');
    expect(toWesternDigits('123')).toBe('123');
  });

  it('parses user typed price inputs with Western and Arabic-Indic digits', () => {
    expect(parsePriceInput('5472.00')).toBe(5472);
    expect(parsePriceInput('٥٤٧٢.٥٠')).toBe(5472.5);
    expect(parsePriceInput('5,472.00')).toBe(5472);
    expect(parsePriceInput('')).toBeNull();
    expect(parsePriceInput('abc')).toBeNull();
  });
});
