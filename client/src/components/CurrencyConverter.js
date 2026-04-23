import { useState, useEffect } from 'react';
import { GlobeIcon, RefreshIcon } from './MarketplaceIcons';

const CurrencyConverter = ({ currencies = [], exchangeRates = [] }) => {
  const [amount, setAmount] = useState('100');
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState('EUR');
  const [result, setResult] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const availableCurrencies = currencies.length > 0 
    ? currencies 
    : [
        { code: 'USD', name: 'US Dollar', symbol: '$' },
        { code: 'EUR', name: 'Euro', symbol: '€' },
        { code: 'GBP', name: 'British Pound', symbol: '£' },
        { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
        { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$' },
        { code: 'AUD', name: 'Australian Dollar', symbol: 'A$' },
      ];

  useEffect(() => {
    if (exchangeRates.length > 0) {
      const latest = exchangeRates.reduce((newest, rate) => {
        const rateDate = new Date(rate.effective_at);
        return !newest || rateDate > new Date(newest.effective_at) ? rate : newest;
      }, null);
      if (latest) {
        setLastUpdated(new Date(latest.effective_at));
      }
    }
  }, [exchangeRates]);

  useEffect(() => {
    if (!amount || Number.isNaN(Number(amount))) {
      setResult(null);
      return;
    }

    const numericAmount = Number(amount);

    if (fromCurrency === toCurrency) {
      setResult(numericAmount);
      return;
    }

    const directRate = exchangeRates.find(
      (rate) => rate.from_currency_code === fromCurrency && rate.to_currency_code === toCurrency
    );

    if (directRate) {
      setResult(numericAmount * Number(directRate.rate));
      return;
    }

    const reverseRate = exchangeRates.find(
      (rate) => rate.from_currency_code === toCurrency && rate.to_currency_code === fromCurrency
    );

    if (reverseRate) {
      setResult(numericAmount / Number(reverseRate.rate));
      return;
    }

    if (fromCurrency !== 'USD' && toCurrency !== 'USD') {
      const fromToUsd = exchangeRates.find(
        (rate) => rate.from_currency_code === fromCurrency && rate.to_currency_code === 'USD'
      );
      const usdToTarget = exchangeRates.find(
        (rate) => rate.from_currency_code === 'USD' && rate.to_currency_code === toCurrency
      );

      if (fromToUsd && usdToTarget) {
        const usdAmount = numericAmount * Number(fromToUsd.rate);
        setResult(usdAmount * Number(usdToTarget.rate));
        return;
      }
    }

    setResult(numericAmount);
  }, [amount, fromCurrency, toCurrency, exchangeRates]);

  const swapCurrencies = () => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  const getSymbol = (code) => {
    const curr = availableCurrencies.find(c => c.code === code);
    return curr?.symbol || code;
  };

  return (
    <div className="currency-converter">
      <div className="currency-converter-header">
        <div className="currency-converter-icon">
          <GlobeIcon size={24} />
        </div>
        <div>
          <h3>Currency Converter</h3>
          {lastUpdated && (
            <p className="currency-converter-updated">
              Last updated: {lastUpdated.toLocaleDateString()} {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
      </div>

      <div className="currency-converter-body">
        <div className="currency-converter-input-group">
          <label>Amount</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount"
            min="0"
            step="0.01"
          />
        </div>

        <div className="currency-converter-row">
          <div className="currency-converter-select-group">
            <label>From</label>
            <select value={fromCurrency} onChange={(e) => setFromCurrency(e.target.value)}>
              {availableCurrencies.map(curr => (
                <option key={curr.code} value={curr.code}>
                  {curr.code} - {curr.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            className="currency-converter-swap"
            onClick={swapCurrencies}
            aria-label="Swap currencies"
          >
            <RefreshIcon size={20} />
          </button>

          <div className="currency-converter-select-group">
            <label>To</label>
            <select value={toCurrency} onChange={(e) => setToCurrency(e.target.value)}>
              {availableCurrencies.map(curr => (
                <option key={curr.code} value={curr.code}>
                  {curr.code} - {curr.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {result !== null && (
          <div className="currency-converter-result">
            <div className="currency-converter-result-label">Converted Amount</div>
            <div className="currency-converter-result-value">
              {getSymbol(fromCurrency)}{Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              {' = '}
              <strong>
                {getSymbol(toCurrency)}{result.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </strong>
            </div>
          </div>
        )}

        {exchangeRates.length > 0 && (
          <div className="currency-converter-rates">
            <div className="currency-converter-rates-title">Available Exchange Rates</div>
            <div className="currency-converter-rates-list">
              {exchangeRates.slice(0, 6).map((rate, i) => (
                <div key={i} className="currency-converter-rate-item">
                  <span>{rate.from_currency_code} → {rate.to_currency_code}</span>
                  <strong>{Number(rate.rate).toFixed(4)}</strong>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CurrencyConverter;
