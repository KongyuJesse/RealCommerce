import { useEffect, useState } from 'react';
import ProductCard from './ProductCard';

const STORAGE_KEY = 'realcommerce_recently_viewed';
const MAX_ITEMS = 12;

const RecentlyViewed = ({ currentProductId, onNavigate, addToCart }) => {
  const [recentProducts, setRecentProducts] = useState([]);

  useEffect(() => {
    loadRecentlyViewed();
  }, []);

  const loadRecentlyViewed = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const products = JSON.parse(stored);
        setRecentProducts(products);
      }
    } catch (error) {
      console.error('Failed to load recently viewed products:', error);
    }
  };

  const addToRecentlyViewed = (product) => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      let products = stored ? JSON.parse(stored) : [];

      // Remove if already exists
      products = products.filter(p => p.id !== product.id);

      // Add to beginning
      products.unshift({
        id: product.id,
        name: product.name,
        slug: product.slug,
        unit_price: product.unit_price,
        currency_code: product.currency_code,
        primary_image_url: product.primary_image_url,
        short_description: product.short_description,
        available_units: product.available_units,
        category_name: product.category_name,
        viewedAt: new Date().toISOString(),
      });

      // Keep only MAX_ITEMS
      products = products.slice(0, MAX_ITEMS);

      localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
      setRecentProducts(products);
    } catch (error) {
      console.error('Failed to save recently viewed product:', error);
    }
  };

  const clearRecentlyViewed = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      setRecentProducts([]);
    } catch (error) {
      console.error('Failed to clear recently viewed products:', error);
    }
  };

  // Filter out current product
  const displayProducts = recentProducts.filter(p => p.id !== currentProductId);

  if (displayProducts.length === 0) {
    return null;
  }

  return {
    component: (
      <section className="section-shell" style={{ background: 'var(--background)' }}>
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Recently Viewed</h2>
            <button
              onClick={clearRecentlyViewed}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--primary)',
                cursor: 'pointer',
                textDecoration: 'underline',
                fontSize: '0.875rem',
              }}
            >
              Clear history
            </button>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: '1.5rem',
            }}
          >
            {displayProducts.slice(0, 6).map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onNavigate={onNavigate}
                addToCart={addToCart}
              />
            ))}
          </div>
        </div>
      </section>
    ),
    addToRecentlyViewed,
    clearRecentlyViewed,
  };
};

export default RecentlyViewed;
