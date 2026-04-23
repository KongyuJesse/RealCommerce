import { useState, useEffect } from 'react';
import { XIcon, CheckCircleIcon } from './MarketplaceIcons';
import { applyImageFallback, DEFAULT_PRODUCT_IMAGE, getProductImageUrl } from '../lib';
import { money } from '../lib/format';

const ProductComparison = ({ comparisonItems, onRemove, onClear, onNavigate, addToCart }) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setIsOpen(comparisonItems.length > 0);
  }, [comparisonItems.length]);

  if (comparisonItems.length === 0) return null;

  return (
    <>
      {/* Floating comparison bar */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'var(--primary)',
          color: 'white',
          padding: '1rem',
          boxShadow: '0 -2px 10px rgba(0,0,0,0.1)',
          zIndex: 900,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <span style={{ fontWeight: 600 }}>
            {comparisonItems.length} {comparisonItems.length === 1 ? 'product' : 'products'} to compare
          </span>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="btn-secondary"
            style={{ background: 'white', color: 'var(--primary)', padding: '0.5rem 1rem' }}
          >
            {isOpen ? 'Hide' : 'Compare'}
          </button>
        </div>
        <button
          onClick={onClear}
          style={{
            background: 'none',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            textDecoration: 'underline',
          }}
        >
          Clear all
        </button>
      </div>

      {/* Comparison modal */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.5)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem',
          }}
          onClick={() => setIsOpen(false)}
        >
          <div
            style={{
              background: 'var(--surface)',
              borderRadius: 8,
              maxWidth: 1200,
              width: '100%',
              maxHeight: '90vh',
              overflow: 'auto',
              padding: '2rem',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '2rem',
              }}
            >
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>
                Product Comparison
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '0.5rem',
                }}
              >
                <XIcon size={24} />
              </button>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid var(--border)' }}>
                      Feature
                    </th>
                    {comparisonItems.map((item) => (
                      <th
                        key={item.id}
                        style={{
                          padding: '1rem',
                          textAlign: 'center',
                          borderBottom: '2px solid var(--border)',
                          minWidth: 200,
                        }}
                      >
                        <div style={{ position: 'relative' }}>
                          <button
                            onClick={() => onRemove(item.id)}
                            style={{
                              position: 'absolute',
                              top: -10,
                              right: -10,
                              background: 'var(--danger)',
                              color: 'white',
                              border: 'none',
                              borderRadius: '50%',
                              width: 24,
                              height: 24,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <XIcon size={14} />
                          </button>
                          <img
                            src={getProductImageUrl(item, DEFAULT_PRODUCT_IMAGE)}
                            alt={item.name}
                            style={{
                              width: 100,
                              height: 100,
                              objectFit: 'cover',
                              borderRadius: 8,
                              marginBottom: '0.5rem',
                            }}
                            onError={(event) => applyImageFallback(event, DEFAULT_PRODUCT_IMAGE)}
                          />
                          <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{item.name}</div>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <ComparisonRow label="Price" items={comparisonItems} getValue={(item) => money(item.unit_price, item.currency_code)} />
                  <ComparisonRow label="SKU" items={comparisonItems} getValue={(item) => item.sku} />
                  <ComparisonRow label="Category" items={comparisonItems} getValue={(item) => item.category_name || 'N/A'} />
                  <ComparisonRow label="In Stock" items={comparisonItems} getValue={(item) => item.available_units > 0 ? <CheckCircleIcon size={20} style={{ color: 'var(--success)' }} /> : 'Out of stock'} />
                  <ComparisonRow label="Description" items={comparisonItems} getValue={(item) => item.short_description || 'N/A'} />
                  <tr>
                    <td style={{ padding: '1rem', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>
                      Actions
                    </td>
                    {comparisonItems.map((item) => (
                      <td
                        key={item.id}
                        style={{
                          padding: '1rem',
                          textAlign: 'center',
                          borderBottom: '1px solid var(--border)',
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <button
                            onClick={() => {
                              setIsOpen(false);
                              onNavigate('product', item.slug);
                            }}
                            className="btn-secondary"
                            style={{ width: '100%', padding: '0.5rem' }}
                          >
                            View Details
                          </button>
                          {item.available_units > 0 && (
                            <button
                              onClick={() => addToCart(item.id)}
                              className="btn-primary"
                              style={{ width: '100%', padding: '0.5rem' }}
                            >
                              Add to Cart
                            </button>
                          )}
                        </div>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const ComparisonRow = ({ label, items, getValue }) => (
  <tr>
    <td style={{ padding: '1rem', borderBottom: '1px solid var(--border)', fontWeight: 600 }}>
      {label}
    </td>
    {items.map((item) => (
      <td
        key={item.id}
        style={{
          padding: '1rem',
          textAlign: 'center',
          borderBottom: '1px solid var(--border)',
        }}
      >
        {getValue(item)}
      </td>
    ))}
  </tr>
);

export default ProductComparison;
