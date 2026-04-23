import DashboardCard from '../components/DashboardCard';
import EmptyState from '../components/EmptyState';
import MetricPanel from '../components/MetricPanel';
import StatusPill from '../components/StatusPill';
import { TrackingSteps } from './ProductPage';
import { formatDate, money, statusLabel } from '../lib/format';

const downloadReceipt = (orderDetail) => {
  const lines = [];
  const pad   = (label, value, width = 40) => `${label.padEnd(width - String(value).length)}${value}`;
  const hr    = '─'.repeat(56);

  lines.push('REALCOMMERCE');
  lines.push('Official Order Receipt');
  lines.push(hr);
  lines.push(pad('Order Number:', orderDetail.order_number));
  lines.push(pad('Order Date:', formatDate(orderDetail.placed_at)));
  lines.push(pad('Order Status:', orderDetail.order_status));
  lines.push(pad('Payment Method:', orderDetail.payment_method || 'N/A'));
  lines.push(pad('Shipping Method:', orderDetail.shipping_method || 'Standard'));
  if (orderDetail.delivery_eta) lines.push(pad('Delivery ETA:', formatDate(orderDetail.delivery_eta)));
  lines.push(hr);

  if (orderDetail.shipping_address) {
    const addr = typeof orderDetail.shipping_address === 'string'
      ? JSON.parse(orderDetail.shipping_address)
      : orderDetail.shipping_address;
    lines.push('SHIP TO');
    if (addr.recipientName) lines.push(`  ${addr.recipientName}`);
    if (addr.line1)         lines.push(`  ${addr.line1}`);
    if (addr.line2)         lines.push(`  ${addr.line2}`);
    if (addr.city)          lines.push(`  ${addr.city}${addr.state_region ? ', ' + addr.state_region : ''}${addr.postal_code ? ' ' + addr.postal_code : ''}`);
    if (addr.country)       lines.push(`  ${addr.country}`);
    lines.push(hr);
  }

  lines.push('ITEMS');
  (orderDetail.items || []).forEach((item) => {
    lines.push(`  ${item.name}`);
    lines.push(`    Qty: ${item.quantity}  ×  ${money(item.unit_price, orderDetail.currency_code)}  =  ${money(item.line_total, orderDetail.currency_code)}`);
    if (item.discount_amount > 0) lines.push(`    Discount: -${money(item.discount_amount, orderDetail.currency_code)}`);
  });
  lines.push(hr);

  lines.push('SUMMARY');
  lines.push(pad('  Subtotal:', money(orderDetail.subtotal_amount || 0, orderDetail.currency_code)));
  if (Number(orderDetail.discount_amount || 0) > 0)
    lines.push(pad('  Discounts:', `-${money(orderDetail.discount_amount, orderDetail.currency_code)}`));
  lines.push(pad('  Shipping:', money(orderDetail.shipping_amount || 0, orderDetail.currency_code)));
  lines.push(pad('  Tax:', money(orderDetail.tax_amount || 0, orderDetail.currency_code)));
  lines.push(pad('  ORDER TOTAL:', money(orderDetail.total_amount || 0, orderDetail.currency_code)));

  if (orderDetail.base_currency_code && orderDetail.base_currency_code !== orderDetail.currency_code) {
    lines.push(pad('  Base Total:', money(orderDetail.base_total_amount || 0, orderDetail.base_currency_code)));
    lines.push(pad('  Exchange Rate:', Number(orderDetail.exchange_rate_to_base || 1).toFixed(6)));
  }

  lines.push(hr);
  if (orderDetail.shipment?.tracking_number) {
    lines.push(pad('Tracking Number:', orderDetail.shipment.tracking_number));
    lines.push(pad('Carrier:', orderDetail.shipment.carrier || 'N/A'));
  }
  lines.push(hr);
  lines.push('Thank you for shopping with RealCommerce.');
  lines.push('For support: support@realcommerce.com');
  lines.push(`Generated: ${new Date().toLocaleString()}`);

  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `receipt-${orderDetail.order_number}.txt`;
  a.click();
  URL.revokeObjectURL(url);
};

const OrderPage = ({ session, orderState, orderDetail, onNavigate, cancelOrder }) => {
  if (!session) {
    return (
      <EmptyState
        title="Sign in to view order details"
        copy="You need to be signed in to access order tracking information."
        action={
          <button className="accent-btn" type="button" onClick={() => onNavigate('login')}>
            Sign in
          </button>
        }
      />
    );
  }

  if (orderState.status === 'loading') {
    return (
      <section className="section-shell">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="skeleton skeleton-text" style={{ height: 36, width: '30%' }} />
          <div className="skeleton skeleton-text wide" style={{ height: 20 }} />
          <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton-card" style={{ flex: 1 }}>
                <div className="skeleton skeleton-text wide" />
                <div className="skeleton skeleton-text short" style={{ height: 28 }} />
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (orderState.status === 'error' || !orderDetail) {
    return (
      <EmptyState
        title="Order not found"
        copy="This order doesn't exist or isn't visible to your account."
        action={
          <button className="ghost-btn" type="button" onClick={() => onNavigate('dashboard')}>
            Back to dashboard
          </button>
        }
      />
    );
  }

  const trackingSummary = orderDetail.trackingSummary || null;
  const shipment        = orderDetail.shipment || null;
  const shipmentEvents  = orderDetail.shipmentEvents || [];
  const progressPct     = Math.min(100, Math.max(0, trackingSummary?.percentComplete || 0));
  const hasBaseCurrency = orderDetail.base_currency_code
    && orderDetail.base_currency_code !== orderDetail.currency_code
    && Number(orderDetail.base_total_amount || 0) > 0;

  return (
    <section className="section-shell">
      {/* Breadcrumb */}
      <nav className="breadcrumb" style={{ marginBottom: '1rem' }}>
        <button type="button" onClick={() => onNavigate('dashboard')}>Dashboard</button>
        <span>/</span>
        <span style={{ color: 'var(--ink-soft)', fontSize: 12 }}>Order {orderDetail.order_number}</span>
      </nav>

      {/* Hero Card */}
      <div className="panel-card order-shell-hero">
        <div className="order-hero">
          <div>
            <span className="section-eyebrow">Order Detail</span>
            <h1 style={{ marginTop: '0.25rem' }}>{orderDetail.order_number}</h1>
            <p className="muted-copy" style={{ marginTop: '0.25rem' }}>
              <StatusPill value={orderDetail.order_status} />
              {' '}&nbsp;Placed {formatDate(orderDetail.placed_at)}
            </p>
            {shipment && (
              <div className="order-hero-meta">
                <StatusPill value={shipment.shipment_status} />
                {shipment.carrier && <span className="muted-copy">{shipment.carrier}</span>}
                {shipment.tracking_number && (
                  <span className="muted-copy" style={{ fontFamily: 'monospace', fontSize: 13 }}>
                    {shipment.tracking_number}
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="hero-metrics">
            <MetricPanel
              title="Total"
              value={money(orderDetail.total_amount || orderDetail.seller_total_amount || 0, orderDetail.currency_code)}
              detail={orderDetail.payment_method || 'Payment tracked'}
            />
            <MetricPanel
              title="Delivery ETA"
              value={formatDate(trackingSummary?.estimatedDeliveryAt || orderDetail.delivery_eta)}
              detail={orderDetail.shipping_method || 'Standard shipping'}
            />
            <MetricPanel
              title="Progress"
              value={`${progressPct}%`}
              detail={trackingSummary?.latestLocation || 'Awaiting update'}
            />
          </div>
        </div>

        {/* Progress Bar */}
        <div className="order-progress-wrap" aria-label={`Order progress: ${progressPct}%`}>
          <div className="order-progress-bar" role="progressbar" aria-valuenow={progressPct} aria-valuemin={0} aria-valuemax={100}>
            <div className="order-progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
          <p className="order-progress-label">
            {progressPct === 100 ? 'Delivered' : `${progressPct}% complete — ${trackingSummary?.latestLocation || 'In transit'}`}
          </p>
        </div>

        {shipment?.tracking_url && (
          <div className="hero-actions">
            <a className="accent-btn" href={shipment.tracking_url} target="_blank" rel="noreferrer">
              Open carrier tracking →
            </a>
            <button
              className="ghost-btn"
              type="button"
              onClick={() => downloadReceipt(orderDetail)}
            >
              Download Receipt
            </button>
            {['PENDING', 'PROCESSING'].includes(orderDetail.order_status) && cancelOrder && (
              <button
                className="ghost-btn"
                type="button"
                style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
                onClick={() => {
                  if (window.confirm('Cancel this order? This cannot be undone.')) cancelOrder(orderDetail.order_number);
                }}
              >
                Cancel Order
              </button>
            )}
          </div>
        )}

        {!shipment?.tracking_url && (
          <div className="hero-actions">
            <button
              className="ghost-btn"
              type="button"
              onClick={() => downloadReceipt(orderDetail)}
            >
              Download Receipt
            </button>
            {['PENDING', 'PROCESSING'].includes(orderDetail.order_status) && cancelOrder && (
              <button
                className="ghost-btn"
                type="button"
                style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}
                onClick={() => {
                  if (window.confirm('Cancel this order? This cannot be undone.')) cancelOrder(orderDetail.order_number);
                }}
              >
                Cancel Order
              </button>
            )}
          </div>
        )}

      {/* Tracking Steps */}
      {shipment?.shipment_status && (
        <div style={{ marginTop: '1rem' }}>
          <TrackingSteps status={shipment.shipment_status} />
        </div>
      )}
      </div>

      {/* Tracking + Timeline */}
      <div className="feature-grid order-grid">
        <DashboardCard title="Tracking overview" copy="Delivery progress and fulfilment updates.">
          <div className="stats-inline order-tracking-stats">
            <MetricPanel
              title="Shipment status"
              value={statusLabel(shipment?.shipment_status || orderDetail.order_status)}
              detail={trackingSummary?.isDelayed ? 'ETA slipped' : 'Within expected flow'}
            />
            <MetricPanel
              title="Latest scan"
              value={formatDate(trackingSummary?.latestEventAt)}
              detail={trackingSummary?.latestLocation || 'No scan yet'}
            />
          </div>
          <div className="summary-rows">
            <div><span>Tracking #</span><strong>{shipment?.tracking_number || 'Pending'}</strong></div>
            <div><span>Warehouse</span><strong>{shipment?.warehouse_name || 'Auto-assigned'}</strong></div>
            <div><span>Service level</span><strong>{shipment?.service_level || orderDetail.shipping_method || 'Standard'}</strong></div>
          </div>
        </DashboardCard>

        <DashboardCard title="Shipment timeline" copy="Every visible update recorded against this order.">
          <div className="timeline" aria-label="Shipment events">
            {shipmentEvents.length > 0 ? shipmentEvents.map((event, i) => (
              <div className="timeline-item" key={`${event.event_time || 'e'}-${i}`}>
                <span className="timeline-dot" aria-hidden="true" />
                <div>
                  <strong>{statusLabel(event.status)}</strong>
                  <small>{event.location || 'Transit update'} &nbsp;·&nbsp; {formatDate(event.event_time)}</small>
                  {event.note && <p>{event.note}</p>}
                </div>
              </div>
            )) : (
              <p className="muted-copy">No shipment events yet.</p>
            )}
          </div>
        </DashboardCard>
      </div>

      {/* Items + Summary */}
      <div className="feature-grid order-grid">
        <DashboardCard title="Order items" copy="Line items captured with order pricing.">
          <div className="card-list">
            {(orderDetail.items || []).map((item, i) => (
              <div className="list-row" key={`${item.slug}-${i}`}>
                <span>
                  <strong>{item.name}</strong>
                  <small>Line {item.line_number} · {item.quantity} × {money(item.unit_price, orderDetail.currency_code)}</small>
                </span>
                <strong style={{ fontSize: 14, whiteSpace: 'nowrap' }}>{money(item.line_total, orderDetail.currency_code)}</strong>
              </div>
            ))}
          </div>
        </DashboardCard>

        <DashboardCard title="Order summary" copy="Financial breakdown captured at checkout.">
          <div className="summary-rows">
            <div><span>Subtotal</span><strong>{money(orderDetail.subtotal_amount || 0, orderDetail.currency_code)}</strong></div>
            <div><span>Discounts</span><strong style={{ color: 'var(--success)' }}>-{money(orderDetail.discount_amount || 0, orderDetail.currency_code)}</strong></div>
            <div><span>Shipping</span><strong>{money(orderDetail.shipping_amount || 0, orderDetail.currency_code)}</strong></div>
            <div><span>Tax</span><strong>{money(orderDetail.tax_amount || 0, orderDetail.currency_code)}</strong></div>
            <div className="summary-total">
              <span>Order Total</span>
              <strong>{money(orderDetail.total_amount || 0, orderDetail.currency_code)}</strong>
            </div>
          </div>
          {hasBaseCurrency && (
            <div className="note-banner" style={{ marginTop: '1rem' }}>
              Base total: {money(orderDetail.base_total_amount, orderDetail.base_currency_code)} at rate {Number(orderDetail.exchange_rate_to_base || 1).toFixed(6)}
            </div>
          )}
        </DashboardCard>
      </div>
    </section>
  );
};

export default OrderPage;
