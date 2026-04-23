import { useState, useEffect, useCallback } from 'react';
import { StarIcon, ShieldIcon, TruckIcon, MapPinIcon, CreditCardIcon, CheckCircleIcon } from '../components/MarketplaceIcons';
import DashboardCard from '../components/DashboardCard';
import EmptyState from '../components/EmptyState';
import { applyImageFallback, DEFAULT_PRODUCT_IMAGE, getGalleryImageUrl, getProductImageUrl } from '../lib';
import { money } from '../lib/format';

// ── Lightbox ──────────────────────────────────────────────────────────────
const Lightbox = ({ images, activeIndex, onClose, onPrev, onNext }) => {
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onPrev();
      if (e.key === 'ArrowRight') onNext();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, onPrev, onNext]);

  return (
    <div
      className="lightbox-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Image viewer"
    >
      <button className="lightbox-close" onClick={onClose} aria-label="Close image viewer">✕</button>
      <button className="lightbox-prev" onClick={(e) => { e.stopPropagation(); onPrev(); }} aria-label="Previous image">‹</button>
      <img
        src={images[activeIndex]?.resolvedUrl || DEFAULT_PRODUCT_IMAGE}
        alt={images[activeIndex]?.alt_text || 'Product image'}
        className="lightbox-img"
        onClick={(e) => e.stopPropagation()}
        onError={(event) => applyImageFallback(event, DEFAULT_PRODUCT_IMAGE)}
      />
      <button className="lightbox-next" onClick={(e) => { e.stopPropagation(); onNext(); }} aria-label="Next image">›</button>
      <div className="lightbox-counter">{activeIndex + 1} / {images.length}</div>
    </div>
  );
};

// ── Tracking Steps ─────────────────────────────────────────────────────────
const SHIPMENT_STEPS = [
  { key: 'PENDING',    label: 'Order Placed' },
  { key: 'PICKING',   label: 'Processing' },
  { key: 'PACKED',    label: 'Packed' },
  { key: 'IN_TRANSIT',label: 'In Transit' },
  { key: 'DELIVERED', label: 'Delivered' },
];
const STEP_ORDER = SHIPMENT_STEPS.map((s) => s.key);

const TrackingSteps = ({ status }) => {
  const currentIdx = STEP_ORDER.indexOf(status);
  return (
    <div className="tracking-steps" aria-label="Shipment progress">
      {SHIPMENT_STEPS.map((step, i) => {
        const done    = i < currentIdx;
        const active  = i === currentIdx;
        return (
          <div key={step.key} className={`tracking-step ${done ? 'done' : active ? 'active' : 'pending'}`}>
            <div className="tracking-step-dot" aria-hidden="true">
              {done ? <CheckCircleIcon size={16} /> : <span>{i + 1}</span>}
            </div>
            <span className="tracking-step-label">{step.label}</span>
            {i < SHIPMENT_STEPS.length - 1 && (
              <div className={`tracking-step-line ${done ? 'done' : ''}`} aria-hidden="true" />
            )}
          </div>
        );
      })}
    </div>
  );
};

// ── Recently Viewed (localStorage) ────────────────────────────────────────
const RECENTLY_VIEWED_KEY = 'rc_recently_viewed';
const MAX_RECENTLY_VIEWED = 8;

const saveRecentlyViewed = (product) => {
  try {
    const existing = JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY) || '[]');
    const filtered = existing.filter((p) => p.id !== product.id);
    const updated  = [{ id: product.id, slug: product.slug, name: product.name, unit_price: product.unit_price, currency_code: product.currency_code, image_url: product.image_url || product.images?.[0]?.url }, ...filtered].slice(0, MAX_RECENTLY_VIEWED);
    localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(updated));
  } catch { /* ignore */ }
};

const getRecentlyViewed = (excludeId) => {
  try {
    return JSON.parse(localStorage.getItem(RECENTLY_VIEWED_KEY) || '[]').filter((p) => p.id !== excludeId);
  } catch { return []; }
};

const ProductPage = ({ productState, productDetail, addToCart, onNavigate, session, saveToWishlist, apiRequest }) => {
  const [activeImage, setActiveImage] = useState(0);
  const [qty, setQty]                 = useState(1);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [reviewForm, setReviewForm]   = useState({ rating: '5', title: '', body: '' });
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const [recentlyViewed, setRecentlyViewed]   = useState([]);
  const [isHovering, setIsHovering]           = useState(false);

  useEffect(() => {
    if (productDetail) {
      saveRecentlyViewed(productDetail);
      setRecentlyViewed(getRecentlyViewed(productDetail.id));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productDetail?.id]);

  useEffect(() => {
    if (!productDetail?.images || productDetail.images.length <= 1 || isHovering || lightboxOpen) return;
    
    const interval = setInterval(() => {
      setActiveImage((i) => (i + 1) % productDetail.images.length);
    }, 3500);
    
    return () => clearInterval(interval);
  }, [productDetail?.images, isHovering, lightboxOpen]);

  const openLightbox = useCallback(() => setLightboxOpen(true), []);
  const closeLightbox = useCallback(() => setLightboxOpen(false), []);
  const prevImage = useCallback(() => setActiveImage((i) => (i - 1 + (productDetail?.images?.length || 1)) % (productDetail?.images?.length || 1)), [productDetail]);
  const nextImage = useCallback(() => setActiveImage((i) => (i + 1) % (productDetail?.images?.length || 1)), [productDetail]);

  const submitReview = async (e) => {
    e.preventDefault();
    if (!apiRequest) return;
    try {
      await apiRequest('/api/reviews', {
        method: 'POST',
        body: JSON.stringify({ productId: productDetail.id, rating: Number(reviewForm.rating), title: reviewForm.title, body: reviewForm.body }),
      });
      setReviewSubmitted(true);
    } catch (err) {
      alert(err.message || 'Could not submit review.');
    }
  };

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

  const images        = (productDetail.images || []).map((image) => ({
    ...image,
    resolvedUrl: getGalleryImageUrl(image, DEFAULT_PRODUCT_IMAGE),
  }));
  const mainImage     = images[activeImage]?.resolvedUrl || getProductImageUrl(productDetail, DEFAULT_PRODUCT_IMAGE);
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
      {lightboxOpen && images.length > 0 && (
        <Lightbox
          images={images}
          activeIndex={activeImage}
          onClose={closeLightbox}
          onPrev={prevImage}
          onNext={nextImage}
        />
      )}
      <div className="three-column-layout">
        {/* Image Gallery */}
        <div className="product-detail-media sticky-sidebar">
          <div 
            className="main-image-container tilt-3d"
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
          >
            <img
              key={activeImage}
              className="anim-3d-fade"
              src={mainImage || DEFAULT_PRODUCT_IMAGE}
              alt={productDetail.name}
              onClick={images.length > 0 ? openLightbox : undefined}
              style={{ cursor: images.length > 0 ? 'zoom-in' : 'default' }}
              onError={(event) => applyImageFallback(event, DEFAULT_PRODUCT_IMAGE)}
            />
          </div>
          {images.length > 1 && (
            <div className="product-detail-thumbs">
              {images.slice(0, 6).map((img, i) => (
                <img
                  key={img.id || img.url}
                  src={img.resolvedUrl}
                  alt={img.alt_text || productDetail.name}
                  className={i === activeImage ? 'is-active' : ''}
                  onClick={() => setActiveImage(i)}
                  onKeyDown={(e) => e.key === 'Enter' && setActiveImage(i)}
                  tabIndex={0}
                  role="button"
                  aria-label={`View image ${i + 1}`}
                  onError={(event) => applyImageFallback(event, DEFAULT_PRODUCT_IMAGE)}
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
          <p className="muted-copy" style={{ fontSize: 13 }}>Sold by <strong>RealCommerce</strong></p>

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

          {/* Write a Review */}
          {session?.customerId && (
            <div style={{ marginTop: '1.5rem' }}>
              <DashboardCard title="Write a Review" copy="Share your experience with this product.">
                {reviewSubmitted ? (
                  <p style={{ color: 'var(--success)', fontWeight: 600 }}>Thank you! Your review has been submitted.</p>
                ) : (
                  <form className="stack-form" onSubmit={submitReview}>
                    <div className="form-group">
                      <label>Rating</label>
                      <select value={reviewForm.rating} onChange={(e) => setReviewForm((r) => ({ ...r, rating: e.target.value }))}>
                        {[5,4,3,2,1].map((n) => <option key={n} value={n}>{n} star{n !== 1 ? 's' : ''}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Review title</label>
                      <input value={reviewForm.title} onChange={(e) => setReviewForm((r) => ({ ...r, title: e.target.value }))} placeholder="Summarise your experience" required />
                    </div>
                    <div className="form-group">
                      <label>Review</label>
                      <textarea value={reviewForm.body} onChange={(e) => setReviewForm((r) => ({ ...r, body: e.target.value }))} placeholder="Tell others what you think" required />
                    </div>
                    <button className="accent-btn" type="submit">Submit review</button>
                  </form>
                )}
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
                onClick={() => addToCart(productDetail.id, qty)}
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

      {/* Recently Viewed */}
      {recentlyViewed.length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <div className="section-header"><h2>Recently Viewed</h2></div>
          <div className="product-grid">
            {recentlyViewed.slice(0, 5).map((p) => (
              <article key={p.id} className="product-card" onClick={() => onNavigate('product', p.slug)} style={{ cursor: 'pointer' }}>
                <div className="product-card-media">
                  <img
                    src={getProductImageUrl(p, DEFAULT_PRODUCT_IMAGE)}
                    alt={p.name}
                    loading="lazy"
                    onError={(event) => applyImageFallback(event, DEFAULT_PRODUCT_IMAGE)}
                  />
                </div>
                <div className="product-card-body"><h3>{p.name}</h3></div>
                <div className="product-card-footer">
                  <div className="price-tag">{money(p.unit_price, p.currency_code)}</div>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

export { TrackingSteps };
export default ProductPage;
