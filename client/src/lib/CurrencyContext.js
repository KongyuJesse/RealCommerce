import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'rc_preferred_currency';
const DEFAULT_CURRENCY = 'XAF';
const DEFAULT_COUNTRY  = 'CM';
const EMPTY_LIST = [];

const CurrencyContext = createContext({
  currencyCode:         DEFAULT_CURRENCY,
  countryCode:          DEFAULT_COUNTRY,
  geoSource:            'default',
  isUserOverride:       false,
  setPreferredCurrency: () => {},
  resetToGeo:           () => {},
  supportedCurrencies:  [],
  rateMap:              new Map(),
});

export const CurrencyProvider = ({ children, bootstrapData }) => {
  const geo                 = bootstrapData?.geo   || {};
  const geoCurrency         = geo.currencyCode     || DEFAULT_CURRENCY;
  const geoCountry          = geo.countryCode      || DEFAULT_COUNTRY;
  const geoSource           = geo.source           || 'default';
  const supportedCurrencies = Array.isArray(bootstrapData?.lookups?.currencies)
    ? bootstrapData.lookups.currencies
    : EMPTY_LIST;
  const exchangeRates = Array.isArray(bootstrapData?.lookups?.exchangeRates)
    ? bootstrapData.lookups.exchangeRates
    : EMPTY_LIST;

  // Build rate map: "FROM:TO" -> rate
  const rateMap = useMemo(() => {
    const map = new Map();
    for (const r of exchangeRates) {
      map.set(`${r.base_currency_code}:${r.target_currency_code}`, Number(r.rate));
    }
    return map;
  }, [exchangeRates]);

  // Initialise from localStorage (user override) or geo
  const [currencyCode, setCurrencyCode] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && stored.length === 3) return stored;
    } catch { /* ignore */ }
    return geoCurrency;
  });

  const [isUserOverride, setIsUserOverride] = useState(() => {
    try { return Boolean(localStorage.getItem(STORAGE_KEY)); }
    catch { return false; }
  });

  // When geo resolves (bootstrap loads), update if no user override
  useEffect(() => {
    if (!isUserOverride && geoCurrency && geoCurrency !== currencyCode) {
      setCurrencyCode(geoCurrency);
    }
  }, [geoCurrency]); // eslint-disable-line react-hooks/exhaustive-deps

  const setPreferredCurrency = useCallback((code) => {
    const upper = String(code || '').toUpperCase();
    if (!upper) return;
    try { localStorage.setItem(STORAGE_KEY, upper); } catch { /* ignore */ }
    setCurrencyCode(upper);
    setIsUserOverride(true);
  }, []);

  const resetToGeo = useCallback(() => {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    setCurrencyCode(geoCurrency);
    setIsUserOverride(false);
  }, [geoCurrency]);

  return (
    <CurrencyContext.Provider value={{
      currencyCode,
      countryCode: geoCountry,
      geoSource,
      isUserOverride,
      setPreferredCurrency,
      resetToGeo,
      supportedCurrencies,
      rateMap,
    }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => useContext(CurrencyContext);

export default CurrencyContext;
