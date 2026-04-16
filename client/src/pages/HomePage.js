import HeroSection from '../components/HeroSection';
import ProductCard from '../components/ProductCard';
import { TruckIcon, RefreshIcon, LockIcon, GlobeIcon } from '../components/MarketplaceIcons';

const VALUE_PROP_DATA = [
  { Icon: TruckIcon,   title: 'Fast, free delivery',  copy: 'Free shipping on eligible orders over the platform threshold.' },
  { Icon: RefreshIcon,  title: 'Easy returns',         copy: 'Return most items within 30 days — hassle-free.' },
  { Icon: LockIcon,     title: 'Secure checkout',      copy: 'Your payment info is always encrypted and protected.' },
  { Icon: GlobeIcon,    title: 'Multiple currencies',   copy: 'Shop and pay in your preferred currency at live rates.' },
];

const TrustBadge = ({ Icon, title, copy }) => (
  <div className="trust-badge">
    <span className="trust-badge-icon"><Icon size={20} /></span>
    <div>
      <strong>{title}</strong>
      <p>{copy}</p>
    </div>
  </div>
);

const PromoBanner = ({ onNavigate }) => (
  <section className="promo-banner" aria-label="Special promotion">
    <div className="promo-banner-bg">
      <img src="/images/promo-banner.png" alt="" loading="lazy" aria-hidden="true" />
    </div>
    <div className="promo-banner-overlay">
      <span className="promo-eyebrow">Limited Time Offer</span>
      <h2>Free Shipping on Orders Over $1,200</h2>
      <p className="promo-copy">Shop premium electronics and lifestyle products with complimentary express delivery to your door.</p>
      <button className="accent-btn promo-cta" type="button" onClick={() => onNavigate('catalog')}>
        Shop the Collection
      </button>
    </div>
  </section>
);

const CategoryShowcase = ({ onNavigate }) => (
  <section className="category-showcase" aria-label="Featured categories">
    <div className="category-showcase-card">
      <img src="/images/category-electronics.png" alt="Electronics" loading="lazy" />
      <div className="category-showcase-info">
        <h3>Electronics</h3>
        <p>Laptops, headphones, and smart devices for your digital life.</p>
        <button className="ghost-btn" type="button" onClick={() => onNavigate('catalog', 'workspace-systems')}>
          Browse Electronics
        </button>
      </div>
    </div>
    <div className="category-showcase-card">
      <img src="/images/category-lifestyle.png" alt="Lifestyle" loading="lazy" />
      <div className="category-showcase-info">
        <h3>Lifestyle</h3>
        <p>Backpacks, watches, and everyday carry essentials.</p>
        <button className="ghost-btn" type="button" onClick={() => onNavigate('catalog', 'connected-living')}>
          Browse Lifestyle
        </button>
      </div>
    </div>
  </section>
);

/* Reusable product section component like Amazon */
const ProductSection = ({ title, linkText, products, onNavigate, addToCart }) => {
  if (!products || products.length === 0) return null;
  return (
    <section className="section-block" style={{ marginTop: '1.5rem' }}>
      <div className="section-header">
        <h2>{title}</h2>
        <button className="inline-link" type="button" onClick={() => onNavigate('catalog')}>
          {linkText || 'See more'}
        </button>
      </div>
      <div className="product-grid">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onOpen={(slug) => onNavigate('product', slug)}
            onAdd={addToCart}
          />
        ))}
      </div>
    </section>
  );
};

const HomePage = ({ data, allProducts, session, onNavigate, addToCart }) => {
  const home               = data?.home || {};
  const heroSlides         = home.heroSlides || [];
  const featuredCategories = home.featuredCategories || data?.lookups?.categories || [];
  const allAvailable       = home.featuredProducts || allProducts || [];

  /* Split products into multiple sections like Amazon */
  const topPicks      = allAvailable.slice(0, 5);
  const bestSellers   = allAvailable.slice(5, 10);
  const trendingNow   = allAvailable.slice(10, 15);
  const moreToExplore = allAvailable.slice(0, 5).concat(allAvailable.slice(10, 15)).slice(0, 5);
  const budgetFinds   = [...allAvailable].sort((a, b) => a.unit_price - b.unit_price).slice(0, 5);
  const topRated      = [...allAvailable].sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0)).slice(0, 5);

  return (
    <main className="home-page" id="shop">
      {/* Hero Slider */}
      <HeroSection heroSlides={heroSlides} onNavigate={onNavigate} />

      {/* Hero Image Banner (fallback when no slides) */}
      {heroSlides.length === 0 && (
        <section className="hero-image-banner" aria-label="Welcome banner">
          <img src="/images/hero-banner.png" alt="Premium products collection" className="hero-image-bg" />
          <div className="hero-image-content">
            <span className="hero-eyebrow">Welcome to RealCommerce</span>
            <h1>Discover Premium Products</h1>
            <p>Multi-currency, multi-warehouse commerce — shop globally, ship locally.</p>
            <button className="accent-btn hero-cta" type="button" onClick={() => onNavigate('catalog')}>
              Start Shopping
            </button>
          </div>
        </section>
      )}

      {/* Trust Badges */}
      <section className="trust-strip" aria-label="Platform guarantees">
        {VALUE_PROP_DATA.map((prop) => (
          <TrustBadge key={prop.title} Icon={prop.Icon} title={prop.title} copy={prop.copy} />
        ))}
      </section>

      {/* Top Picks for You */}
      <ProductSection
        title="Top Picks for You"
        linkText="See more"
        products={topPicks}
        onNavigate={onNavigate}
        addToCart={addToCart}
      />

      {/* Shop by Category */}
      {featuredCategories.length > 0 && (
        <section className="section-block" style={{ marginTop: '1.5rem' }}>
          <div className="section-header">
            <h2>Shop by Category</h2>
            <button className="inline-link" type="button" onClick={() => onNavigate('catalog')}>
              See all categories
            </button>
          </div>
          <div className="category-grid">
            {featuredCategories.map((category, index) => (
              <button
                className="category-card"
                key={category.id}
                type="button"
                onClick={() => onNavigate('catalog', category.slug)}
                style={{ animationDelay: `${index * 60}ms` }}
                aria-label={`Browse ${category.name}`}
              >
                <h3>{category.name}</h3>
                {category.description && <p>{category.description}</p>}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Best Sellers */}
      <ProductSection
        title="Best Sellers"
        linkText="Shop all best sellers"
        products={bestSellers}
        onNavigate={onNavigate}
        addToCart={addToCart}
      />

      {/* Category Showcase */}
      <CategoryShowcase onNavigate={onNavigate} />

      {/* Trending Now */}
      <ProductSection
        title="Trending Now"
        linkText="See what's popular"
        products={trendingNow}
        onNavigate={onNavigate}
        addToCart={addToCart}
      />

      {/* Promo Banner */}
      <PromoBanner onNavigate={onNavigate} />

      {/* More to Explore */}
      <ProductSection
        title="More to Explore"
        linkText="Browse catalog"
        products={moreToExplore}
        onNavigate={onNavigate}
        addToCart={addToCart}
      />

      {/* Budget Finds — sorted by lowest price */}
      <ProductSection
        title="Budget Finds Under $100"
        linkText="See all deals"
        products={budgetFinds}
        onNavigate={onNavigate}
        addToCart={addToCart}
      />

      {/* Top Rated — sorted by highest rating */}
      <ProductSection
        title="Top Rated Products"
        linkText="View top rated"
        products={topRated}
        onNavigate={onNavigate}
        addToCart={addToCart}
      />

      {/* Sign-in strip for guests */}
      {!session && (
        <section className="signin-strip" aria-label="Sign in prompt">
          <div className="signin-strip-inner">
            <div className="signin-strip-text">
              <h3>See personalized recommendations</h3>
              <p>Sign in for your best shopping experience. Track orders, save items, and earn rewards.</p>
            </div>
            <div className="signin-strip-actions">
              <button
                className="accent-btn"
                type="button"
                onClick={() => onNavigate('login')}
                style={{ padding: '10px 48px' }}
              >
                Sign in
              </button>
              <button
                className="ghost-btn"
                type="button"
                onClick={() => onNavigate('register')}
                style={{ padding: '10px 48px' }}
              >
                Create account
              </button>
            </div>
          </div>
        </section>
      )}
    </main>
  );
};

export default HomePage;
