import { ShieldIcon, CreditCardIcon } from '../components/MarketplaceIcons';
import DashboardCard from '../components/DashboardCard';
import EmptyState from '../components/EmptyState';
import { money } from '../lib/format';

const CheckoutPage = ({
  session,
  quote,
  customerDashboard,
  cart,
  checkoutForm,
  setCheckoutForm,
  data,
  refreshQuote,
  submitCheckout,
  applyAddressToCheckout,
  onNavigate,
}) => {
  if (!session?.customerId) {
    return (
      <EmptyState
        title="Customer checkout only"
        copy="Sign in with a customer account to quote shipping, apply promos, and place orders."
        action={
          <button className="accent-btn" type="button" onClick={() => onNavigate('login')}>
            Sign In to Checkout
          </button>
        }
      />
    );
  }

  const orderCurrencyCode = quote?.orderCurrencyCode || checkoutForm.currencyCode || cart?.currency_code || 'USD';
  const baseCurrencyCode  = quote?.baseCurrencyCode || 'USD';
  const savedAddresses    = quote?.addresses || customerDashboard?.addresses || [];

  return (
    <section className="section-shell">
      <div className="two-column-layout" style={{ gridTemplateColumns: '1fr 360px' }}>
        {/* Main Form */}
        <div className="checkout-main">
          {/* Step indicator */}
          <div className="checkout-step-indicator" aria-label="Checkout steps">
            <div className="step-item is-active">1. Shipping</div>
            <div className="step-divider" aria-hidden="true" />
            <div className="step-item">2. Payment</div>
            <div className="step-divider" aria-hidden="true" />
            <div className="step-item">3. Review</div>
          </div>

          <form className="panel-card" onSubmit={(e) => { e.preventDefault(); submitCheckout(); }} style={{ marginTop: '1.5rem' }}>
            <h2 style={{ marginBottom: '1.25rem' }}>Shipping Address</h2>

            {/* Saved address quick-select */}
            {savedAddresses.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <p className="muted-copy" style={{ marginBottom: '0.5rem', fontSize: 13 }}>Select a saved address:</p>
                <div className="quick-select-grid">
                  {savedAddresses.map((address) => (
                    <button
                      key={address.id}
                      className={`quick-select-card ${address.id === checkoutForm.shippingAddress.id ? 'is-selected' : ''}`}
                      type="button"
                      onClick={() =>
                        setCheckoutForm((c) => ({
                          ...c,
                          shippingAddress: applyAddressToCheckout(address),
                        }))
                      }
                    >
                      <strong>{address.label}</strong>
                      <span>{address.line1}, {address.city}, {address.country}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Address form */}
            <div className="form-grid">
              <input
                value={checkoutForm.shippingAddress.label}
                onChange={(e) => setCheckoutForm((c) => ({ ...c, shippingAddress: { ...c.shippingAddress, label: e.target.value } }))}
                placeholder="Address label (e.g. Home, Office)"
              />
              <input
                value={checkoutForm.shippingAddress.recipientName}
                onChange={(e) => setCheckoutForm((c) => ({ ...c, shippingAddress: { ...c.shippingAddress, recipientName: e.target.value } }))}
                placeholder="Recipient name"
              />
              <input
                className="field-span-2"
                value={checkoutForm.shippingAddress.line1}
                onChange={(e) => setCheckoutForm((c) => ({ ...c, shippingAddress: { ...c.shippingAddress, line1: e.target.value } }))}
                placeholder="Address line 1"
              />
              <input
                value={checkoutForm.shippingAddress.line2}
                onChange={(e) => setCheckoutForm((c) => ({ ...c, shippingAddress: { ...c.shippingAddress, line2: e.target.value } }))}
                placeholder="Apt, Suite (optional)"
              />
              <input
                value={checkoutForm.shippingAddress.city}
                onChange={(e) => setCheckoutForm((c) => ({ ...c, shippingAddress: { ...c.shippingAddress, city: e.target.value } }))}
                placeholder="City"
              />
              <input
                value={checkoutForm.shippingAddress.stateRegion}
                onChange={(e) => setCheckoutForm((c) => ({ ...c, shippingAddress: { ...c.shippingAddress, stateRegion: e.target.value } }))}
                placeholder="State / Province"
              />
              <input
                value={checkoutForm.shippingAddress.postalCode}
                onChange={(e) => setCheckoutForm((c) => ({ ...c, shippingAddress: { ...c.shippingAddress, postalCode: e.target.value } }))}
                placeholder="Zip / Postal Code"
              />
              <input
                value={checkoutForm.shippingAddress.country}
                onChange={(e) => setCheckoutForm((c) => ({ ...c, shippingAddress: { ...c.shippingAddress, country: e.target.value } }))}
                placeholder="Country"
              />
              <input
                value={checkoutForm.shippingAddress.phone}
                onChange={(e) => setCheckoutForm((c) => ({ ...c, shippingAddress: { ...c.shippingAddress, phone: e.target.value } }))}
                placeholder="Phone number"
              />
            </div>

            <div className="divider" />

            <h2 style={{ marginBottom: '1.25rem' }}>Shipping &amp; Payment</h2>
            <div className="form-grid">
              <div>
                <label className="muted-copy" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Currency</label>
                <select value={checkoutForm.currencyCode} onChange={(e) => setCheckoutForm((c) => ({ ...c, currencyCode: e.target.value }))}>
                  {(data.lookups?.currencies || []).map((opt) => (
                    <option key={opt.code} value={opt.code}>{opt.code} — {opt.name || opt.code}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="muted-copy" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Shipping method</label>
                <select value={checkoutForm.shippingMethod} onChange={(e) => setCheckoutForm((c) => ({ ...c, shippingMethod: e.target.value }))}>
                  {(data.lookups?.shippingMethods || []).map((opt) => (
                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="muted-copy" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Payment method</label>
                <select value={checkoutForm.paymentMethod} onChange={(e) => setCheckoutForm((c) => ({ ...c, paymentMethod: e.target.value }))}>
                  {(data.lookups?.paymentMethods || []).map((opt) => (
                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="muted-copy" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Promo code</label>
                <input
                  value={checkoutForm.promoCode}
                  onChange={(e) => setCheckoutForm((c) => ({ ...c, promoCode: e.target.value.toUpperCase() }))}
                  placeholder="PROMO123"
                />
              </div>
            </div>

            <button
              className="ghost-btn"
              type="button"
              onClick={refreshQuote}
              style={{ marginTop: '1.25rem', width: '100%' }}
            >
              Estimate Shipping &amp; Tax
            </button>
          </form>
        </div>

        {/* Order Summary Sidebar */}
        <aside className="checkout-summary sticky-sidebar" aria-label="Order summary">
          <button
            className="accent-btn"
            type="button"
            onClick={submitCheckout}
            style={{ width: '100%', marginBottom: '1rem', padding: '13px' }}
          >
            Place Your Order
          </button>
          <p className="helper-copy" style={{ textAlign: 'center', marginBottom: '1rem' }}>
            By placing your order, you agree to RealCommerce's privacy notice and conditions of use.
          </p>

          <div className="divider" />

          <h3 style={{ marginBottom: '0.75rem' }}>Order Summary</h3>
          <div className="summary-rows">
            <div>
              <span>Items ({(cart?.items || []).length}):</span>
              <strong>{money(quote?.originalSubtotalAmount ?? cart?.originalSubtotal ?? cart?.subtotal, orderCurrencyCode)}</strong>
            </div>
            {(quote?.sellerDiscountAmount || cart?.sellerDiscountTotal) > 0 && (
              <div style={{ color: 'var(--success)' }}>
                <span>Seller savings:</span>
                <strong>-{money(quote?.sellerDiscountAmount || cart?.sellerDiscountTotal || 0, orderCurrencyCode)}</strong>
              </div>
            )}
            {((quote?.tierDiscountAmount || 0) + (quote?.promoDiscountAmount || 0)) > 0 && (
              <div style={{ color: 'var(--success)' }}>
                <span>Loyalty &amp; promo:</span>
                <strong>-{money((quote?.tierDiscountAmount || 0) + (quote?.promoDiscountAmount || 0), orderCurrencyCode)}</strong>
              </div>
            )}
            <div>
              <span>Shipping:</span>
              <strong>{quote?.shippingAmount > 0 ? money(quote.shippingAmount, orderCurrencyCode) : 'FREE'}</strong>
            </div>
            <div>
              <span>Before tax:</span>
              <strong>{money((quote?.totalAmount || 0) - (quote?.taxAmount || 0), orderCurrencyCode)}</strong>
            </div>
            <div>
              <span>Estimated tax:</span>
              <strong>{money(quote?.taxAmount || 0, orderCurrencyCode)}</strong>
            </div>
            <div className="summary-total">
              <span>Order total:</span>
              <strong>{money(quote?.totalAmount || 0, orderCurrencyCode)}</strong>
            </div>
          </div>

          {quote?.baseTotalAmount && orderCurrencyCode !== baseCurrencyCode && (
            <div className="note-banner" style={{ marginTop: '0.75rem' }}>
              Base total: {money(quote.baseTotalAmount, baseCurrencyCode)} at {Number(quote.exchangeRateToBase || 1).toFixed(6)} {baseCurrencyCode}/{orderCurrencyCode}
            </div>
          )}

          <div className="trust-badge-row" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
            <div className="trust-item"><ShieldIcon size={13} /> Encrypted checkout</div>
            <div className="trust-item"><CreditCardIcon size={13} /> Secure payment</div>
          </div>

          <DashboardCard title="Your items" copy="">
            <div>
              {(cart?.items || []).map((item) => (
                <div key={item.id} className="list-row" style={{ padding: '0.4rem 0', alignItems: 'center' }}>
                  <img
                    src={item.image_url}
                    alt={item.name}
                    style={{ width: 40, height: 40, borderRadius: 'var(--radius-xs)', objectFit: 'contain', flexShrink: 0, background: 'var(--canvas-soft)' }}
                  />
                  <span>
                    <strong style={{ fontSize: 12 }}>{item.name}</strong>
                    <small>Qty: {item.quantity}</small>
                  </span>
                </div>
              ))}
            </div>
          </DashboardCard>
        </aside>
      </div>
    </section>
  );
};

export default CheckoutPage;
