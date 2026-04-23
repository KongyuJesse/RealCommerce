/**
 * money(amount, currencyCode)
 *
 * Formats a monetary amount using the browser's Intl API.
 * The locale is derived from the currency so formatting conventions
 * (symbol position, decimal separator) match the currency's home region.
 */

const CURRENCY_LOCALE = {
  USD: 'en-US',
  EUR: 'de-DE',
  GBP: 'en-GB',
  NGN: 'en-NG',
  XAF: 'fr-CM',
  GHS: 'en-GH',
  KES: 'en-KE',
  ZAR: 'en-ZA',
  EGP: 'ar-EG',
  CAD: 'en-CA',
  AUD: 'en-AU',
  NZD: 'en-NZ',
  SGD: 'en-SG',
  HKD: 'zh-HK',
  JPY: 'ja-JP',
  CNY: 'zh-CN',
  INR: 'en-IN',
  KRW: 'ko-KR',
  BRL: 'pt-BR',
  MXN: 'es-MX',
  CHF: 'de-CH',
  SEK: 'sv-SE',
  NOK: 'nb-NO',
  DKK: 'da-DK',
  PLN: 'pl-PL',
  TRY: 'tr-TR',
  AED: 'ar-AE',
  SAR: 'ar-SA',
  THB: 'th-TH',
  IDR: 'id-ID',
  MYR: 'ms-MY',
  PHP: 'en-PH',
};

const formattersCache = new Map();

const getFormatter = (currencyCode) => {
  const code = String(currencyCode || 'USD').toUpperCase();
  if (formattersCache.has(code)) return formattersCache.get(code);

  const locale = CURRENCY_LOCALE[code] || 'en-US';
  let formatter;
  try {
    formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: code,
      maximumFractionDigits: ['JPY', 'KRW', 'IDR', 'VND', 'CLP', 'PYG'].includes(code) ? 0 : 2,
    });
  } catch {
    // Unsupported currency code — fall back to USD display
    formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2,
    });
  }

  formattersCache.set(code, formatter);
  return formatter;
};

export const money = (amount, currency = 'USD') =>
  getFormatter(currency).format(Number(amount || 0));

export const formatDate = (value) => {
  if (!value) return 'Pending';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
};

export const roleLabel  = (role = '')   => String(role  || '').replace(/_/g, ' ');
export const statusLabel = (value = '') => String(value || '').replace(/_/g, ' ');

export const createSlug = (value = '') =>
  String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
