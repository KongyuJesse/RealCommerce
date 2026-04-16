import EmptyState from '../components/EmptyState';
import { money } from '../lib/format';

const CartPage = ({ session, cart, quote, onNavigate, updateCartQuantity, removeCartItem }) => {
  if (!session?.customerId) {
    return (
      <EmptyState
        title="Sign in to view your cart"
        copy="Sign in with a customer account to manage your cart and proceed to checkout."
        action={
          <button className="accent-btn" type="button" onClick={() => onNavigate('login')}>
            Sign in
          </button>
        }
      />
    );
  }

  if (!cart?.items?.length) {
    return (
      <EmptyState
        title="Your cart is empty"
        copy="Browse our catalog and add items to get started."
        action={
          <button className="accent-btn" type="button" onClick={() => onNavigate('catalog')}>
            Continue shopping
          </button>
        }
      />
    );
  }

  const displayTotal = quote?.totalAmount ?? cart?.subtotal ?? 0;
  const currencyCode = cart.currency_code || 'USD';

  return (
    <section className="section-shell">
      <div className="checkout-shell">
        {/* Cart Items */}
        <div>
          <div className="panel-card">
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 400 }}>Shopping Cart</h1>
              <span className="muted-copy">Price</span>
            </div>

            <div className="cart-list">
              {cart.items.map((item) => (
                <article className="cart-item" key={item.id}>
                  <img
                    src={item.image_url || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect width="100" height="100" fill="%23f3f4f6"/%3E%3C/svg%3E'}
                    alt={item.name}
                  />
                  <div className="cart-item-copy">
                    <button
                      className="inline-link product-link"
                      type="button"
                      onClick={() => onNavigate('product', item.slug)}
                      style={{ fontSize: 15 }}
                    >
                      {item.name}
                    </button>
                    {item.short_description && <p>{item.short_description}</p>}
                    <span style={{ fontSize: 12, color: 'var(--success)', fontWeight: 600 }}>In Stock</span>
                    <p style={{ fontSize: 12, color: 'var(--success)' }}>FREE delivery on this order</p>

                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                      <div className="quantity-stepper">
                        <button
                          type="button"
                          onClick={() => updateCartQuantity(item.id, Math.max(1, item.quantity - 1))}
                          aria-label="Decrease quantity"
                        >−</button>
                        <span aria-label={`Quantity: ${item.quantity}`}>{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                          aria-label="Increase quantity"
                        >+</button>
                      </div>
                      <span style={{ color: 'var(--border-strong)' }}>|</span>
                      <button
                        className="inline-link"
                        type="button"
                        onClick={() => removeCartItem(item.id)}
                        style={{ fontSize: 13, color: 'var(--link)' }}
                      >
                        Delete
                      </button>
                      <span style={{ color: 'var(--border-strong)' }}>|</span>
                      <button
                        className="inline-link"
                        type="button"
                        onClick={() => onNavigate('product', item.slug)}
                        style={{ fontSize: 13 }}
                      >
                        View item
                      </button>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    {item.original_line_total > item.line_total && (
                      <div className="price-discount" style={{ fontSize: 12, marginBottom: 2 }}>
                        Save {money(item.original_line_total - item.line_total, item.currency_code)}
                      </div>
                    )}
                    <strong style={{ fontSize: 17, fontWeight: 700, color: 'var(--price-color)', whiteSpace: 'nowrap' }}>
                      {money(item.line_total, item.currency_code)}
                    </strong>
                  </div>
                </article>
              ))}
            </div>

            <div style={{ textAlign: 'right', fontSize: 17, paddingTop: '1rem' }}>
              {cart.sellerDiscountTotal > 0 && (
                <div className="price-discount" style={{ fontSize: 13, marginBottom: 4 }}>
                  Seller savings: -{money(cart.sellerDiscountTotal, currencyCode)}
                </div>
              )}
              Subtotal ({cart.itemCount} {cart.itemCount === 1 ? 'item' : 'items'}):&nbsp;
              <strong style={{ fontSize: 19 }}>{money(cart.subtotal, currencyCode)}</strong>
            </div>
          </div>
        </div>

        {/* Sidebar Summary */}
        <aside className="checkout-summary" aria-label="Order summary">
          <div style={{ marginBottom: '0.5rem', fontSize: 14, color: 'var(--success)', fontWeight: 600 }}>
            Your order qualifies for FREE delivery
          </div>
          <div style={{ marginBottom: '1rem', fontSize: 15 }}>
            Subtotal ({cart.itemCount} {cart.itemCount === 1 ? 'item' : 'items'}):&nbsp;
            <strong style={{ fontSize: 18 }}>{money(displayTotal, currencyCode)}</strong>
          </div>
          <button
            className="accent-btn"
            type="button"
            onClick={() => onNavigate('checkout')}
            style={{ width: '100%', marginBottom: '0.5rem', padding: '10px' }}
          >
            Proceed to checkout
          </button>
          <button
            className="ghost-btn"
            type="button"
            onClick={() => onNavigate('catalog')}
            style={{ width: '100%' }}
          >
            Continue shopping
          </button>

          <div className="divider" />

          <div style={{ fontSize: 12, color: 'var(--ink-soft)', lineHeight: 1.6 }}>
            By proceeding, you agree to RealCommerce's conditions of use and privacy notice.
          </div>
        </aside>
      </div>
    </section>
  );
};

export default CartPage;
