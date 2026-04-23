import { CheckCircleIcon, TruckIcon } from '../components/MarketplaceIcons';
import { money, formatDate } from '../lib/format';

const OrderConfirmedPage = ({ orderNumber, trackingNumber, totalAmount, currencyCode, deliveryEta, onNavigate }) => (
  <section className="section-shell">
    <div style={{ maxWidth: 600, margin: '2rem auto', textAlign: 'center' }}>
      <div style={{ color: 'var(--success)', marginBottom: '1rem' }}>
        <CheckCircleIcon size={64} />
      </div>
      <h1 style={{ color: 'var(--success)' }}>Order Confirmed!</h1>
      <p className="muted-copy" style={{ fontSize: 15, marginTop: '0.5rem' }}>
        Thank you for your order. A confirmation email has been sent to your inbox.
      </p>

      <div className="panel-card" style={{ marginTop: '1.5rem', textAlign: 'left' }}>
        <div className="summary-rows">
          <div><span>Order number</span><strong style={{ fontFamily: 'monospace' }}>{orderNumber}</strong></div>
          {trackingNumber && <div><span>Tracking number</span><strong style={{ fontFamily: 'monospace' }}>{trackingNumber}</strong></div>}
          {totalAmount > 0 && <div><span>Order total</span><strong>{money(totalAmount, currencyCode)}</strong></div>}
          {deliveryEta && <div><span>Estimated delivery</span><strong>{formatDate(deliveryEta)}</strong></div>}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', marginTop: '1.5rem', flexWrap: 'wrap' }}>
        <button
          className="accent-btn"
          type="button"
          onClick={() => onNavigate('order', orderNumber)}
        >
          <TruckIcon size={14} /> Track Order
        </button>
        <button className="ghost-btn" type="button" onClick={() => onNavigate('catalog')}>
          Continue Shopping
        </button>
        <button className="ghost-btn" type="button" onClick={() => onNavigate('dashboard')}>
          Go to Dashboard
        </button>
      </div>
    </div>
  </section>
);

export default OrderConfirmedPage;
