import { useCurrency } from './CurrencyContext';

const usePriceConverter = () => {
  const { currencyCode, rateMap } = useCurrency();

  const getRate = (from, to) => {
    if (from === to) return 1;
    const direct = rateMap.get(`${from}:${to}`);
    if (direct) return direct;
    const inverse = rateMap.get(`${to}:${from}`);
    if (inverse && inverse !== 0) return 1 / inverse;
    // Cross via USD
    const fromToUsd = rateMap.get(`${from}:USD`);
    const usdToTo   = rateMap.get(`USD:${to}`);
    if (fromToUsd && usdToTo) return fromToUsd * usdToTo;
    const usdToFrom = rateMap.get(`USD:${from}`);
    if (usdToFrom && usdToTo && usdToFrom !== 0) return usdToTo / usdToFrom;
    return 1;
  };

  const convert = (amount, fromCurrency = 'USD') => {
    const num = Number(amount || 0);
    if (!num) return 0;
    const rate = getRate(
      String(fromCurrency || 'USD').toUpperCase(),
      currencyCode
    );
    return Math.round(num * rate * 100) / 100;
  };

  return { convert, currencyCode };
};

export default usePriceConverter;
