import { useState } from 'react';
import { StarIcon, ShieldIcon, TruckIcon, MapPinIcon, CreditCardIcon } from '../components/MarketplaceIcons';
import DashboardCard from '../components/DashboardCard';
import EmptyState from '../components/EmptyState';
import { money } from '../lib/format';

const ProductPage = ({ productState, productDetail, addToCart, onNavigate, session, saveToWishlist }) => {
  const [activeImage, setActiveImage] = useState(0);
  const [qty, setQty]                 = useState(1);

  if (productState.status === 'loading') {
    return (
      <section className="section-shell">
        <div style={{ display: 'flex', gap: '1.5rem' }}>
          <div className="skeleton skeleton-img" style={{ width: 360, height: 360, flexShrink: 0 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="skeleton skeleton-text wide" style={{ height: 28 }} />
            <div className="skeleton skeleton-text" style={{ width: '60%', height: 18 }} />
            <div className="skeleton skeleton-text price" style={{ height: 40, width: '30%' }} />
            <div className="skeleton skeleton-text wide" />
            <div className="skeleton skeleton-text wide" />
          </div>
        </div>
      </section>
    );
  }

  if (productState.status === 'error' || !productDetail) {
    return (
      <EmptyState
        title="Product not found"
        copy="This product could not be loaded. Try browsing the catalog."
        action={
          <button className="accent-btn" type="button" onClick={() => onNavigate('catalog')}>
            Return to catalog
          </button>
        }
      />
    );
  }

  const images        = productDetail.images || [];
  const mainImage     = images[activeImage]?.url || productDetail.image_url;
  const rating        = productDetail.average_rating || 0;
  const reviews       = productDetail.reviews || [];
  const filledStars   = Math.round(rating);
  const deliveryLoc   = session?.city || 'your location';
  const isDiscounted  = Number(productDetail.original_unit_price || 0) > Number(productDetail.unit_price || 0);
  const isInStock     = Number(productDetail.available_units || 0) > 0;
  const wholePart     = Math.floor(productDetail.unit_price);
  const decimalPart   = (productDetail.unit_price % 1).toFixed(2).slice(1);

  return (
    <section className="section-shell">
      <div className="three-column-layout">
        {/* Image Gallery */}
        <div className="product-detail-media sticky-sidebar">
          <div className="main-image-container">
            <img
              src={mainImage || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect width="200" height="200" fill="%23f3f4f6"/%3E%3C/svg%3E'}
              alt={productDetail.name}
            />
          </div>
          {images.length > 1 && (
            <div className="product-detail-thumbs">
              {images.slice(0, 6).map((img, i) => (
                <img
                  key={img.id || img.url}
                  src={img.url}
                  alt={img.alt_text || productDetail.name}
                  className={i === activeImage ? 'is-active' : ''}
                  onClick={() => setActiveImage(i)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="product-detail-info">
          <nav className="breadcrumb" aria-label="Breadcrumb">
            <button type="button" onClick={() => onNavigate('catalog')}>Catalog</button>
            <span aria-hidden="true">/</span>
            {productDetail.category_name && (
              <>
                <button type="button" onClick={() => onNavigate('catalog', productDetail.category_slug)}>
                  {productDetail.category_name}
                </button>
                <span aria-hidden="true">/</span>
              </>
            )}
            <span style={{ color: 'var(--ink-soft)', fontSize: 12 }}>{productDetail.name}</span>
          </nav>

          <h1 style={{ marginTop: '0.5rem' }}>{productDetail.name}</h1>
          {productDetail.store_name && (
            <p className="muted-copy">Sold by <strong>{productDetail.store_name}</strong></p>
          )}

          {/* Rating */}
          {rating > 0 && (
            <div className="product-meta-row" style={{ margin: '0.5rem 0' }}>
              <span style={{ display: 'flex', gap: 2 }} aria-label={`${rating} out of 5 stars`}>
                {Array.from({ length: 5 }, (_, i) => (
                  <StarIcon key={i} size={18} filled={i < filledStars} />
                ))}
              </span>
              <span style={{ fontSize: '0.9rem', color: 'var(--link)' }}>
                {reviews.length} {reviews.length === 1 ? 'rating' : 'ratings'}
              </span>
            </div>
          )}

          <div className="divider" />

          {/* Price */}
          <div className="price-stack">
            <div className="price-main" aria-label={`Price: ${money(productDetail.unit_price, productDetail.currency_code)}`}>
              <span className="price-symbol">$</span>
              <span className="price-whole">{wholePart}</span>
              <span className="price-decimal">{decimalPart}</span>
            </div>
            {isDiscounted && (
              <p style={{ fontSize: '0.9rem', color: 'var(--ink-soft)' }}>
                Was{' '}
                <span style={{ textDecoration: 'line-through' }}>
                  {money(productDetail.original_unit_price, productDetail.currency_code)}
                </span>{' '}
                <span className="price-discount">
                  Save {money(
                    productDetail.discount_amount || (productDetail.original_unit_price - productDetail.unit_price),
                    productDetail.currency_code
                  )}
                </span>
              </p>
            )}
            {productDetail.discount_label && (
              <span style={{ color: 'var(--accent-deep)', fontSize: '0.88rem', fontWeight: 700 }}>
                {productDetail.discount_label}
              </span>
            )}
            <p className="muted-copy" style={{ fontSize: 13 }}>Free returns on eligible orders.</p>
          </div>

          <div className="divider" />

          {/* About */}
          <div>
            <h4 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>About this item</h4>
            <ul style={{ paddingLeft: '1.25rem', fontSize: '0.9rem', lineHeight: 1.7, color: 'var(--ink-soft)' }}>
              {productDetail.short_description && <li>{productDetail.short_description}</li>}
              {productDetail.long_description && <li>{productDetail.long_description}</li>}
            </ul>
          </div>

          {/* Specs table */}
          {((productDetail.attributes || []).length > 0 || productDetail.category_name) && (
            <table className="specs-table">
              <tbody>
                {productDetail.category_name && (
                  <tr><td>Category</td><td>{productDetail.category_name}</td></tr>
                )}
                <tr>
                  <td>Availability</td>
                  <td style={{ color: isInStock ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                    {isInStock ? `${productDetail.available_units} in stock` : 'Out of stock'}
                  </td>
                </tr>
                {productDetail.sku && <tr><td>SKU</td><td>{productDetail.sku}</td></tr>}
                {(productDetail.attributes || []).map((attr) => (
                  <tr key={attr.name}>
                    <td>{attr.display_name}</td>
                    <td>{attr.value_text}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Reviews */}
          {reviews.length > 0 && (
            <div style={{ marginTop: '2rem' }}>
              <DashboardCard title={`Customer Reviews (${reviews.length})`} copy="">
                <div className="review-stack">
                  {reviews.map((review) => (
                    <article className="review-card" key={review.id}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: '50%',
                          background: 'linear-gradient(135deg, var(--nav-soft), var(--nav))',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', fontSize: 13, fontWeight: 700, flexShrink: 0,
                        }}>
                          {review.customer_name?.[0]}
                        </div>
                        <strong style={{ fontSize: '0.9rem' }}>{review.customer_name}</strong>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                        {Array.from({ length: 5 }, (_, i) => (
                          <StarIcon key={i} size={13} filled={i < (review.rating || 5)} />
                        ))}
                        {review.title && <strong style={{ fontSize: '0.88rem', marginLeft: 4 }}>{review.title}</strong>}
                      </div>
                      {review.is_verified_purchase && (
                        <span style={{ color: 'var(--success)', fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: 4 }}>
                          Verified Purchase
                        </span>
                      )}
                      <p style={{ fontSize: '0.88rem', color: 'var(--ink-soft)', margin: 0 }}>{review.body}</p>
                    </article>
                  ))}
                </div>
              </DashboardCard>
            </div>
          )}
        </div>

        {/* Buy Box */}
        <aside>
          <div className="panel-card buy-box">
            {/* Price */}
            <div className="price-main" style={{ marginBottom: '0.25rem' }}>
              <span className="price-symbol" style={{ fontSize: '1rem' }}>$</span>
              <span style={{ fontSize: '1.9rem', fontWeight: 500, color: 'var(--price-color)' }}>{wholePart}</span>
              <span style={{ fontSize: '0.9rem', color: 'var(--price-color)', alignSelf: 'flex-start', marginTop: 4 }}>{decimalPart}</span>
            </div>

            <p className="muted-copy" style={{ fontSize: 13, marginBottom: '0.5rem' }}>
              <span style={{ color: 'var(--success)', fontWeight: 600 }}>FREE delivery</span> on eligible orders
            </p>

            <p style={{ fontSize: 13, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: 4 }}>
              <TruckIcon size={13} /> Delivery estimate at checkout
            </p>

            <p style={{ fontSize: 13, color: 'var(--link)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 4 }}>
              <MapPinIcon size={13} /> Deliver to {deliveryLoc}
            </p>

            <div style={{
              fontSize: '1.1rem',
              fontWeight: 700,
              color: isInStock ? 'var(--success)' : 'var(--danger)',
              marginBottom: '1rem',
            }}>
              {isInStock ? 'In Stock' : 'Out of Stock'}
            </div>

            <div className="stack-form" style={{ gap: '0.5rem' }}>
              <select
                value={qty}
                onChange={(e) => setQty(Number(e.target.value))}
                aria-label="Select quantity"
                style={{ borderRadius: 'var(--radius-sm)', fontSize: 13 }}
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>Qty: {n}</option>
                ))}
              </select>

              <button
                className="btn-cart"
                type="button"
                onClick={() => addToCart(productDetail.id)}
                disabled={!isInStock}
              >
                Add to Cart
              </button>

              <button
                className="btn-buy"
                type="button"
                onClick={() => onNavigate('checkout')}
                disabled={!isInStock}
              >
                Buy Now
              </button>

              {saveToWishlist && (
                <button
                  className="btn-wishlist"
                  type="button"
                  onClick={() => saveToWishlist(productDetail.id)}
                >
                  Add to Wishlist
                </button>
              )}
            </div>

            <div className="trust-badge-row" style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
              <div className="trust-item"><ShieldIcon size={13} /> Ships from RealCommerce</div>
              <div className="trust-item"><CreditCardIcon size={13} /> Secure transaction</div>
              <div className="trust-item"><TruckIcon size={13} /> Eligible for return</div>
            </div>
          </div>

          <div className="panel-card" style={{ marginTop: '0.75rem' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--link)', margin: 0 }}>
                <strong>Platform-managed fulfilment</strong> — Inventory, shipping, returns, and discounts handled by RealCommerce.
              </p>
          </div>
        </aside>
      </div>
    </section>
  );
};

export default ProductPage;
