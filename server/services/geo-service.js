/**
 * geo-service.js
 *
 * Resolves the visitor's country and preferred currency from the request.
 *
 * Detection order (fastest → most reliable):
 *  1. Cloudflare CF-IPCountry header  (free, zero-latency on CF-proxied deploys)
 *  2. X-Vercel-IP-Country header      (Vercel edge)
 *  3. X-Country-Code custom header    (any reverse-proxy that sets it)
 *  4. ip-api.com free JSON endpoint   (fallback, ~150 ms, no key needed)
 *  5. Hard-coded default              (USD / US)
 *
 * The country→currency map covers every currency that is (or can be) seeded
 * in the currencies table.  Unknown countries fall back to USD.
 */

const { getClientIp } = require('../utils/request');
const { logger } = require('../utils/logger');

/* ── Country → ISO-4217 currency code ─────────────────────────────────── */
const COUNTRY_CURRENCY = {
  // Africa
  NG: 'NGN', GH: 'GHS', KE: 'KES', ZA: 'ZAR', EG: 'EGP', ET: 'ETB',
  TZ: 'TZS', UG: 'UGX', SN: 'XOF', CI: 'XOF', CM: 'XAF', MZ: 'MZN',
  ZM: 'ZMW', RW: 'RWF', MA: 'MAD', TN: 'TND', DZ: 'DZD', AO: 'AOA',
  // Europe
  GB: 'GBP', DE: 'EUR', FR: 'EUR', IT: 'EUR', ES: 'EUR', NL: 'EUR',
  BE: 'EUR', PT: 'EUR', AT: 'EUR', IE: 'EUR', FI: 'EUR', GR: 'EUR',
  PL: 'PLN', SE: 'SEK', NO: 'NOK', DK: 'DKK', CH: 'CHF', CZ: 'CZK',
  HU: 'HUF', RO: 'RON', BG: 'BGN', HR: 'EUR', SK: 'EUR', SI: 'EUR',
  LT: 'EUR', LV: 'EUR', EE: 'EUR', RU: 'RUB', UA: 'UAH', TR: 'TRY',
  // Americas
  US: 'USD', CA: 'CAD', MX: 'MXN', BR: 'BRL', AR: 'ARS', CL: 'CLP',
  CO: 'COP', PE: 'PEN', VE: 'VES', EC: 'USD', UY: 'UYU', PY: 'PYG',
  // Asia-Pacific
  CN: 'CNY', JP: 'JPY', IN: 'INR', AU: 'AUD', NZ: 'NZD', SG: 'SGD',
  HK: 'HKD', KR: 'KRW', TW: 'TWD', TH: 'THB', ID: 'IDR', MY: 'MYR',
  PH: 'PHP', VN: 'VND', PK: 'PKR', BD: 'BDT', LK: 'LKR', NP: 'NPR',
  // Middle East
  AE: 'AED', SA: 'SAR', QA: 'QAR', KW: 'KWD', BH: 'BHD', OM: 'OMR',
  IL: 'ILS', JO: 'JOD',
};

const DEFAULT_COUNTRY = 'US';
const DEFAULT_CURRENCY = 'USD';

/* ── Supported currencies (must exist in the DB currencies table) ──────── */
const SUPPORTED_CURRENCIES = new Set(['USD', 'EUR', 'GBP', 'NGN']);

/**
 * Map a raw country code to a currency that is actually in our DB.
 * Falls back to USD for any currency we don't support yet.
 */
const resolveCurrency = (countryCode) => {
  const raw = COUNTRY_CURRENCY[String(countryCode || '').toUpperCase()] || DEFAULT_CURRENCY;
  return SUPPORTED_CURRENCIES.has(raw) ? raw : DEFAULT_CURRENCY;
};

/* ── In-process IP→geo cache (TTL: 1 hour) ────────────────────────────── */
const geoCache = new Map();
const GEO_CACHE_TTL_MS = 60 * 60 * 1000;

const getCached = (ip) => {
  const entry = geoCache.get(ip);
  if (!entry) return null;
  if (Date.now() - entry.ts > GEO_CACHE_TTL_MS) {
    geoCache.delete(ip);
    return null;
  }
  return entry.data;
};

const setCache = (ip, data) => {
  // Evict oldest entries when cache grows large
  if (geoCache.size > 2000) {
    const oldest = [...geoCache.entries()]
      .sort((a, b) => a[1].ts - b[1].ts)
      .slice(0, 500)
      .map(([k]) => k);
    oldest.forEach((k) => geoCache.delete(k));
  }
  geoCache.set(ip, { data, ts: Date.now() });
};

/* ── ip-api.com lookup (free tier, no key, 45 req/min per IP) ─────────── */
const lookupViaIpApi = async (ip) => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,countryCode`,
      { signal: controller.signal }
    );
    clearTimeout(timeout);
    if (!res.ok) return null;
    const json = await res.json();
    if (json.status !== 'success' || !json.countryCode) return null;
    return json.countryCode;
  } catch {
    return null;
  }
};

/**
 * Resolve geo information for an incoming Express request.
 * Returns { countryCode, currencyCode, source }.
 */
const resolveGeo = async (req) => {
  // 1. CDN / proxy headers (zero-latency)
  const cfCountry = req.headers['cf-ipcountry'];
  if (cfCountry && cfCountry !== 'XX' && /^[A-Z]{2}$/.test(cfCountry)) {
    return {
      countryCode: cfCountry,
      currencyCode: resolveCurrency(cfCountry),
      source: 'cf-header',
    };
  }

  const vercelCountry = req.headers['x-vercel-ip-country'];
  if (vercelCountry && /^[A-Z]{2}$/.test(vercelCountry)) {
    return {
      countryCode: vercelCountry,
      currencyCode: resolveCurrency(vercelCountry),
      source: 'vercel-header',
    };
  }

  const customCountry = req.headers['x-country-code'];
  if (customCountry && /^[A-Z]{2}$/.test(customCountry)) {
    return {
      countryCode: customCountry,
      currencyCode: resolveCurrency(customCountry),
      source: 'custom-header',
    };
  }

  // 2. IP-based lookup
  const ip = getClientIp(req);
  const isPrivate = !ip || /^(127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|::1|localhost)/i.test(ip);

  if (!isPrivate) {
    const cached = getCached(ip);
    if (cached) return cached;

    const countryCode = await lookupViaIpApi(ip);
    if (countryCode) {
      const result = {
        countryCode,
        currencyCode: resolveCurrency(countryCode),
        source: 'ip-api',
      };
      setCache(ip, result);
      return result;
    }
  }

  // 3. Default
  return {
    countryCode: DEFAULT_COUNTRY,
    currencyCode: DEFAULT_CURRENCY,
    source: 'default',
  };
};

/**
 * Express middleware — attaches req.geo so downstream handlers can use it.
 */
const geoMiddleware = async (req, _res, next) => {
  try {
    req.geo = await resolveGeo(req);
  } catch (err) {
    logger.warn('geo-service: resolution failed', { error: err.message });
    req.geo = { countryCode: DEFAULT_COUNTRY, currencyCode: DEFAULT_CURRENCY, source: 'error' };
  }
  next();
};

module.exports = { resolveGeo, geoMiddleware, resolveCurrency, COUNTRY_CURRENCY, SUPPORTED_CURRENCIES };
