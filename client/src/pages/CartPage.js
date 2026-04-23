import EmptyState from '../components/EmptyState';
import { applyImageFallback, DEFAULT_PRODUCT_IMAGE, getProductImageUrl } from '../lib';
import { money } from '../lib/format';
import { ShieldIcon, TruckIcon, RefreshIcon } from '../components/MarketplaceIcons';
import usePriceConverter from '../lib/usePriceConverter';

const CartPage = ({ session, cart, quote, onNavigate, updateCartQuantity, removeCartItem }) => {
  const { convert, currencyCode } = usePriceConverter();

  if (!session) {
    return (
      <EmptyState
        title="Sign in to view your cart"
        copy="Sign in with a customer account to manage your cart and proceed to checkout."
        action={<button className="accent-btn" type="button" onClick={() => onNavigate('login')}>Sign in</button>}
      />
    );
  }

  if (session && !session.customerId) {
    return (
      <EmptyState
        title="Cart is not available for staff accounts"
        copy="The shopping cart is only available for customer accounts."
        action={<button className="accent-btn" type="button" onClick={() => onNavigate('home')}>Back to Home</button>}
      />
    );
  }

  if (!cart?.items?.length) {
    return (
      <section className="section-shell">
        <div className="cart-empty-wrap">
          <div className="cart-empty-icon" aria-hidden="true">
            <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
              <circle cx="40" cy="40" r="40" fill="#f3f4f6"/>
              <path d="M20 22h4l6 28h26l4-18H30" stroke="#9ca3af" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              <circle cx="34" cy="56" r="3" fill="#9ca3af"/>
              <circle cx="52" cy="56" r="3" fill="#9ca3af"/>
            </svg>
          </div>
          <h1>Your cart is empty</h1>
          <p>Looks like you haven't added anything yet. Browse our catalog to find something you'll love.</p>
          <button className="accent-btn" type="button" onClick={() => onNavigate('catalog')} style={{ padding: '11px 36px' }}>
            Continue shopping
          </button>
        </div>
      </section>
    );
  }

  // Cart amounts come from server already in cart.currency_code.
  // We convert to the user's active display currency for consistency.
  const cartCurrency  = cart.currency_code || 'USD';
  const itemCount     = cart.itemCount || cart.items.length;
  const subtotal      = convert(cart.subtotal || 0, cartCurrency);
  const displayTotal  = quote?.totalAmount
    ? convert(quote.totalAmount, quote.orderCurrencyCode || cartCurrency)
    : subtotal;

  return (
    <section className="section-shell">
      <div className="cart-layout">
        {/* Left — items */}
        <div className="cart-main">
          <div className="cart-header-row">
            <h1>Shopping Cart</h1>
            <span className="muted-copy">Price</span>
          </div>

          <div className="cart-items-list">
            {cart.items.map((item, i) => {
              const itemCurrency = item.currency_code || cartCurrency;
              const lineTotal    = convert(item.line_total || 0, itemCurrency);
              const origTotal    = convert(item.original_line_total || 0, itemCurrency);
              const saving       = origTotal > lineTotal ? origTotal - lineTotal : 0;

              return (
                <article className="cart-item-row" key={item.id} style={{ animationDelay: `${i * 60}ms` }}>
                  <div
                    className="cart-item-img-wrap"
                    onClick={() => onNavigate('product', item.slug)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && onNavigate('product', item.slug)}
                  >
                    <img
                      src={getProductImageUrl(item, DEFAULT_PRODUCT_IMAGE)}
                      alt={item.name}
                      loading="lazy"
                      onError={(event) => applyImageFallback(event, DEFAULT_PRODUCT_IMAGE)}
                    />
                  </div>

                  <div className="cart-item-details">
                    <button className="cart-item-name" type="button" onClick={() => onNavigate('product', item.slug)}>
                      {item.name}
                    </button>
                    {item.short_description && (
                      <p className="cart-item-desc">{item.short_description}</p>
                    )}
                    <div className="cart-item-badges">
                      <span className="cart-badge-stock">In Stock</span>
                      <span className="cart-badge-ship">
                        <TruckIcon size={11} /> FREE delivery
                      </span>
                    </div>

                    <div className="cart-item-actions">
                      <div className="quantity-stepper">
                        <button type="button" onClick={() => updateCartQuantity(item.id, Math.max(1, item.quantity - 1))} aria-label="Decrease">−</button>
                        <span>{item.quantity}</span>
                        <button type="button" onClick={() => updateCartQuantity(item.id, item.quantity + 1)} aria-label="Increase">+</button>
                      </div>
                      <span className="cart-action-sep" aria-hidden="true">|</span>
                      <button className="cart-action-link" type="button" onClick={() => removeCartItem(item.id)}>Delete</button>
                      <span className="cart-action-sep" aria-hidden="true">|</span>
                      <button className="cart-action-link" type="button" onClick={() => onNavigate('product', item.slug)}>View item</button>
                    </div>
                  </div>

                  <div className="cart-item-price">
                    {saving > 0 && (
                      <div className="cart-item-saving">Save {money(saving, currencyCode)}</div>
                    )}
                    <strong>{money(lineTotal, currencyCode)}</strong>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="cart-subtotal-row">
            Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'items'}):&nbsp;
            <strong>{money(subtotal, currencyCode)}</strong>
          </div>
        </div>

        {/* Right — summary */}
        <aside className="cart-summary-panel" aria-label="Order summary">
          <div className="cart-summary-free-ship">
            <TruckIcon size={14} />
            Your order qualifies for <strong>FREE delivery</strong>
          </div>

          <div className="cart-summary-total">
            Subtotal ({itemCount} {itemCount === 1 ? 'item' : 'items'}):&nbsp;
            <strong>{money(displayTotal, currencyCode)}</strong>
          </div>

          <button className="cart-checkout-btn" type="button" onClick={() => onNavigate('checkout')}>
            Proceed to checkout
          </button>

          <button className="cart-continue-btn" type="button" onClick={() => onNavigate('catalog')}>
            Continue shopping
          </button>

          <div className="cart-summary-trust">
            <div><ShieldIcon size={12} /> Encrypted &amp; secure</div>
            <div><RefreshIcon size={12} /> 30-day returns</div>
          </div>

          <p className="cart-summary-legal">
            By proceeding, you agree to RealCommerce's conditions of use and privacy notice.
          </p>
        </aside>
      </div>
    </section>
  );
};

export default CartPage;
