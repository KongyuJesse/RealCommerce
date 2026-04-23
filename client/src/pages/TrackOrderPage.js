import { useState } from 'react';
import { PackageIcon, TruckIcon, CheckCircleIcon, MapPinIcon } from '../components/MarketplaceIcons';
import { apiRequest } from '../lib';

const TrackOrderPage = ({ onNavigate }) => {
  const [trackingNumber, setTrackingNumber] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleTrack = async (e) => {
    e.preventDefault();
    if (!trackingNumber && !orderNumber) {
      setError('Please enter either a tracking number or order number');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // If order number provided, navigate to order page
      if (orderNumber) {
        onNavigate('order', orderNumber.trim().toUpperCase());
      } else {
        const data = await apiRequest(`/api/tracking/shipments/${encodeURIComponent(trackingNumber.trim())}`);
        if (data.order_number) {
          onNavigate('order', data.order_number);
        } else {
          throw new Error('Tracking information not found');
        }
      }
    } catch (err) {
      setError(err.message || 'Unable to track order. Please check your tracking number and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="section-shell" style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ maxWidth: 600, width: '100%', padding: '0 1rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 80, height: 80, background: 'linear-gradient(135deg, var(--nav-soft), var(--nav))', borderRadius: '50%', marginBottom: '1.5rem' }}>
            <PackageIcon size={40} style={{ color: 'var(--accent)' }} />
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>Track Your Order</h1>
          <p style={{ color: 'var(--ink-soft)', fontSize: '1rem' }}>Enter your tracking number or order number to see the latest updates</p>
        </div>

        <form onSubmit={handleTrack} style={{ background: 'var(--surface-strong)', padding: '2rem', borderRadius: 12, boxShadow: 'var(--shadow-card)', border: '1px solid var(--border)' }}>
          {error && (
            <div style={{ padding: '1rem', background: '#fee', color: '#c00', borderRadius: 8, marginBottom: '1.5rem', fontSize: '0.9rem', border: '1px solid #fcc' }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.9rem' }}>
              Order Number
            </label>
            <input
              type="text"
              value={orderNumber}
              onChange={(e) => {
                setOrderNumber(e.target.value);
                setError(null);
              }}
              placeholder="e.g., ORD-2024-001234"
              style={{ width: '100%', padding: '0.875rem', border: '2px solid var(--border)', borderRadius: 8, fontSize: '1rem', transition: 'border-color 0.2s' }}
              onFocus={(e) => e.target.style.borderColor = 'var(--accent-deep)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
            />
          </div>

          <div style={{ textAlign: 'center', margin: '1.5rem 0', color: 'var(--ink-muted)', fontSize: '0.875rem', fontWeight: 600 }}>
            OR
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.9rem' }}>
              Tracking Number
            </label>
            <input
              type="text"
              value={trackingNumber}
              onChange={(e) => {
                setTrackingNumber(e.target.value);
                setError(null);
              }}
              placeholder="e.g., TRK-2024-567890"
              style={{ width: '100%', padding: '0.875rem', border: '2px solid var(--border)', borderRadius: 8, fontSize: '1rem', transition: 'border-color 0.2s' }}
              onFocus={(e) => e.target.style.borderColor = 'var(--accent-deep)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
            />
          </div>

          <button
            type="submit"
            disabled={loading || (!trackingNumber && !orderNumber)}
            className="accent-btn"
            style={{ width: '100%', padding: '1rem', fontSize: '1rem', marginTop: '0.5rem' }}
          >
            {loading ? 'Tracking...' : 'Track Order'}
          </button>

          <div style={{ marginTop: '1.5rem', padding: '1rem', background: 'var(--canvas-soft)', borderRadius: 8, fontSize: '0.85rem', color: 'var(--ink-soft)' }}>
            <strong style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--ink)' }}>Where to find your tracking information:</strong>
            <ul style={{ margin: 0, paddingLeft: '1.25rem', lineHeight: 1.6 }}>
              <li>Check your order confirmation email</li>
              <li>Look for the shipping notification email</li>
              <li>Visit your account dashboard</li>
            </ul>
          </div>
        </form>

        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <button
            onClick={() => onNavigate('home')}
            style={{ background: 'none', border: 'none', color: 'var(--link)', fontSize: '0.9rem', cursor: 'pointer', textDecoration: 'underline' }}
          >
            ← Back to shopping
          </button>
        </div>

        {/* Trust indicators */}
        <div style={{ marginTop: '3rem', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', textAlign: 'center' }}>
          <div>
            <TruckIcon size={24} style={{ color: 'var(--nav-soft)', marginBottom: '0.5rem' }} />
            <div style={{ fontSize: '0.75rem', color: 'var(--ink-soft)' }}>Real-time Updates</div>
          </div>
          <div>
            <MapPinIcon size={24} style={{ color: 'var(--nav-soft)', marginBottom: '0.5rem' }} />
            <div style={{ fontSize: '0.75rem', color: 'var(--ink-soft)' }}>Live Location</div>
          </div>
          <div>
            <CheckCircleIcon size={24} style={{ color: 'var(--nav-soft)', marginBottom: '0.5rem' }} />
            <div style={{ fontSize: '0.75rem', color: 'var(--ink-soft)' }}>Delivery Proof</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TrackOrderPage;
