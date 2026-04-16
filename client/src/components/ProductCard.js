import { StarIcon } from './MarketplaceIcons';
import { money } from '../lib/format';

const PLACEHOLDER = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"%3E%3Crect width="200" height="200" fill="%23f3f4f6"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-size="14" fill="%23adb5bd"%3ENo image%3C/text%3E%3C/svg%3E';

const ProductCard = ({ product, onOpen, onAdd, freeShippingThreshold = 1200 }) => {
  const hasDiscount = product.original_unit_price && product.original_unit_price > product.unit_price;
  const rating      = product.average_rating || 0;
  const reviewCount = product.review_count || 0;
  const filledStars = Math.round(rating);
  const isFree      = Number(product.unit_price || 0) === 0;
  const price       = Number(product.unit_price || 0);
  const qualifiesForFreeShipping = price >= freeShippingThreshold;

  return (
    <article className="product-card">
      <div
        className="product-card-media"
        onClick={() => onOpen && onOpen(product.slug)}
        role="link"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onOpen && onOpen(product.slug)}
        aria-label={`View ${product.name}`}
      >
        <img
          src={product.image_url || PLACEHOLDER}
          alt={product.name}
          loading="lazy"
          onError={(e) => { e.currentTarget.src = PLACEHOLDER; }}
        />
      </div>

      <div className="product-card-body">
        <h3 onClick={() => onOpen && onOpen(product.slug)}>{product.name}</h3>

        {rating > 0 && (
          <div className="product-card-rating" aria-label={`${rating} out of 5 stars`}>
            {Array.from({ length: 5 }, (_, i) => (
              <StarIcon key={i} size={13} filled={i < filledStars} />
            ))}
            <span>{reviewCount.toLocaleString()}</span>
          </div>
        )}

        {product.store_name && (
          <div className="product-card-seller">by {product.store_name}</div>
        )}
      </div>

      <div className="product-card-footer">
        {hasDiscount && (
          <div>
            <span className="price-original">{money(product.original_unit_price, product.currency_code)}</span>
            {' '}
            <span className="price-discount">
              {product.discount_label || `Save ${money(product.original_unit_price - product.unit_price, product.currency_code)}`}
            </span>
          </div>
        )}
        <div className="price-tag">{isFree ? 'Free' : money(product.unit_price, product.currency_code)}</div>
        {qualifiesForFreeShipping && (
          <span className="price-free-badge">FREE delivery</span>
        )}
        {!qualifiesForFreeShipping && price > 0 && (
          <span className="price-delivery-note">Delivery from $16</span>
        )}

        {onAdd && (
          <button
            className="product-card-add"
            type="button"
            onClick={() => onAdd(product.id)}
            aria-label={`Add ${product.name} to cart`}
          >
            Add to Cart
          </button>
        )}
      </div>
    </article>
  );
};

export default ProductCard;
