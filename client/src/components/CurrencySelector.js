import { useEffect, useRef, useState } from 'react';
import { useCurrency } from '../lib/CurrencyContext';
import { GlobeIcon } from './MarketplaceIcons';

const FLAG = {
  XAF: 'CM',
  USD: '🇺🇸', EUR: '🇪🇺', GBP: '🇬🇧', NGN: '🇳🇬',
  GHS: '🇬🇭', KES: '🇰🇪', ZAR: '🇿🇦', EGP: '🇪🇬',
  CAD: '🇨🇦', AUD: '🇦🇺', NZD: '🇳🇿', SGD: '🇸🇬',
  HKD: '🇭🇰', JPY: '🇯🇵', CNY: '🇨🇳', INR: '🇮🇳',
  KRW: '🇰🇷', BRL: '🇧🇷', MXN: '🇲🇽', CHF: '🇨🇭',
  SEK: '🇸🇪', NOK: '🇳🇴', DKK: '🇩🇰', PLN: '🇵🇱',
  TRY: '🇹🇷', AED: '🇦🇪', SAR: '🇸🇦', THB: '🇹🇭',
  IDR: '🇮🇩', MYR: '🇲🇾', PHP: '🇵🇭',
};

const CurrencySelector = () => {
  const { currencyCode, isUserOverride, setPreferredCurrency, resetToGeo, supportedCurrencies } = useCurrency();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const currencies = supportedCurrencies.length
    ? supportedCurrencies
    : [
        { code: 'XAF', name: 'Central African CFA Franc', symbol: 'FCFA' },
        { code: 'USD', name: 'US Dollar', symbol: '$' },
      ];

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Change currency"
        aria-expanded={open}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.35rem',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'inherit',
          fontSize: '0.8rem',
          fontWeight: 600,
          padding: '0.4rem 0.5rem',
          borderRadius: 4,
          whiteSpace: 'nowrap',
        }}
      >
        <GlobeIcon size={14} />
        <span>{FLAG[currencyCode] || '🌐'}</span>
        <span>{currencyCode}</span>
        <span style={{ fontSize: '0.65rem', opacity: 0.7 }}>▾</span>
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Select currency"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            boxShadow: '0 6px 20px rgba(0,0,0,0.15)',
            zIndex: 2000,
            minWidth: 220,
            maxHeight: 340,
            overflowY: 'auto',
          }}
        >
          {/* Auto-detect option */}
          <button
            type="button"
            role="option"
            aria-selected={!isUserOverride}
            onClick={() => { resetToGeo(); setOpen(false); }}
            style={{
              width: '100%',
              padding: '0.65rem 1rem',
              background: !isUserOverride ? 'var(--primary)' : 'transparent',
              color: !isUserOverride ? 'white' : 'var(--ink)',
              border: 'none',
              borderBottom: '1px solid var(--border)',
              cursor: 'pointer',
              textAlign: 'left',
              fontSize: '0.8rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <GlobeIcon size={14} />
            Auto-detect (recommended)
          </button>

          {currencies.map((c) => {
            const isActive = isUserOverride && currencyCode === c.code;
            return (
              <button
                key={c.code}
                type="button"
                role="option"
                aria-selected={isActive}
                onClick={() => { setPreferredCurrency(c.code); setOpen(false); }}
                style={{
                  width: '100%',
                  padding: '0.6rem 1rem',
                  background: isActive ? '#f0f7ff' : 'transparent',
                  color: isActive ? 'var(--primary)' : 'var(--ink)',
                  border: 'none',
                  borderBottom: '1px solid var(--border)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  fontWeight: isActive ? 700 : 400,
                }}
              >
                <span style={{ fontSize: '1.1rem' }}>{FLAG[c.code] || '🌐'}</span>
                <span style={{ flex: 1 }}>{c.name}</span>
                <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', opacity: 0.7 }}>{c.code}</span>
                {isActive && <span style={{ color: 'var(--primary)', fontSize: '0.75rem' }}>✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CurrencySelector;
