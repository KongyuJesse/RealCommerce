import EmptyState from '../components/EmptyState';
import ProductCard from '../components/ProductCard';
import LoadingSkeleton from '../components/LoadingSkeleton';

const WishlistPage = ({ session, wishlistState, onNavigate, addToCart, removeFromWishlist, moveToCart }) => {
  if (!session) {
    return (
      <EmptyState
        title="Sign in to view your Wishlist"
        copy="Save items you love and come back to them anytime. Sign in to get started."
        action={
          <button className="accent-btn" type="button" onClick={() => onNavigate('login')}>
            Sign In
          </button>
        }
      />
    );
  }

  if (session && !session.customerId) {
    return (
      <EmptyState
        title="Wishlist is not available for staff accounts"
        copy="The wishlist is only available for customer accounts. Staff accounts do not have a wishlist."
        action={<button className="accent-btn" type="button" onClick={() => onNavigate('home')}>Back to Home</button>}
      />
    );
  }

  if (wishlistState.status === 'loading') {
    return (
      <section className="section-shell">
        <LoadingSkeleton count={4} type="product" />
      </section>
    );
  }

  const items = wishlistState.data || [];

  if (items.length === 0) {
    return (
      <EmptyState
        title="Your wishlist is empty"
        copy="Browse the catalog and click 'Add to Wishlist' on any product to save it here."
        action={
          <button className="accent-btn" type="button" onClick={() => onNavigate('catalog')}>
            Browse Catalog
          </button>
        }
      />
    );
  }

  return (
    <section className="section-shell">
      <div className="section-header">
        <div>
          <h1>Your Wishlist</h1>
          <p className="muted-copy">{items.length} saved item{items.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="ghost-btn" type="button" onClick={() => onNavigate('catalog')}>
          + Add more items
        </button>
      </div>

      <div className="product-grid">
        {items.map((item) => (
          <div key={item.wishlist_id} className="wishlist-card-wrap">
            <ProductCard
              product={item}
              onOpen={(slug) => onNavigate('product', slug)}
              onAdd={() => addToCart(item.id)}
            />
            <div className="wishlist-card-actions">
              <button
                className="accent-btn"
                type="button"
                style={{ flex: 1, padding: '8px', fontSize: 13 }}
                onClick={() => moveToCart && moveToCart(item.id)}
              >
                Move to Cart
              </button>
              <button
                className="ghost-btn"
                type="button"
                style={{ flex: 1, padding: '8px', fontSize: 13 }}
                onClick={() => removeFromWishlist && removeFromWishlist(item.id)}
                aria-label={`Remove ${item.name} from wishlist`}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default WishlistPage;
