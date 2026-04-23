import { StarIcon } from './MarketplaceIcons';
import { applyImageFallback, DEFAULT_PRODUCT_IMAGE, getProductImageUrl } from '../lib';
import { money } from '../lib/format';
import usePriceConverter from '../lib/usePriceConverter';

const ProductCard = ({ product, onOpen, onAdd, freeShippingThreshold = 1200 }) => {
  const { convert, currencyCode } = usePriceConverter();

  const fromCurrency = product.currency_code || 'USD';
  const price        = convert(Number(product.unit_price || 0), fromCurrency);
  const original     = Number(product.original_unit_price || 0) > Number(product.unit_price || 0)
    ? convert(Number(product.original_unit_price), fromCurrency)
    : 0;

  const hasDiscount = original > price;
  const isFree      = Number(product.unit_price || 0) === 0;
  const rating      = product.average_rating || 0;
  const reviewCount = product.review_count || 0;
  const filledStars = Math.round(rating);
  const qualifiesForFreeShipping = price >= freeShippingThreshold;
  const imageUrl    = getProductImageUrl(product, DEFAULT_PRODUCT_IMAGE);

  return (
    <article className="product-card premium-lift">
      <div
        className="product-card-media tilt-3d"
        onClick={() => onOpen && onOpen(product.slug)}
        role="link"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && onOpen && onOpen(product.slug)}
        aria-label={`View ${product.name}`}
      >
        <img
          src={imageUrl}
          alt={product.name}
          loading="lazy"
          onError={(event) => applyImageFallback(event, DEFAULT_PRODUCT_IMAGE)}
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
            <span className="price-original">{money(original, currencyCode)}</span>
            {' '}
            <span className="price-discount">
              {product.discount_label || `Save ${money(original - price, currencyCode)}`}
            </span>
          </div>
        )}
        <div className="price-tag">
          {isFree ? 'Free' : money(price, currencyCode)}
        </div>
        {qualifiesForFreeShipping && <span className="price-free-badge">FREE delivery</span>}
        {!qualifiesForFreeShipping && !isFree && (
          <span className="price-delivery-note">Delivery from {money(16, currencyCode)}</span>
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
