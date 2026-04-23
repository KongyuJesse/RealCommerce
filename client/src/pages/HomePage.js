import { useState, useEffect, useRef } from 'react';
import ProductCard from '../components/ProductCard';
import {
  TruckIcon, RefreshIcon, LockIcon, GlobeIcon,
  StarIcon, ChartBarIcon, PackageIcon, ShieldIcon,
} from '../components/MarketplaceIcons';

/* ── Category image map ── */
const CAT_IMAGES = {
  'workspace-systems':  'https://picsum.photos/seed/cat1/400/300',
  'connected-living':   'https://picsum.photos/seed/cat2/400/300',
  'audio-sound':        'https://picsum.photos/seed/cat3/400/300',
  'urban-mobility':     'https://picsum.photos/seed/cat4/400/300',
  'creator-gear':       'https://picsum.photos/seed/cat5/400/300',
  'accessories':        'https://picsum.photos/seed/cat6/400/300',
  'wellness-technology':'https://picsum.photos/seed/cat7/400/300',
};

/* ── Window Display cards (Amazon-style boxes below hero) ── */
const WINDOW_CARDS = [
  {
    id: 'workspace',
    type: 'grid',
    title: 'Upgrade your workspace',
    slug: 'workspace-systems',
    items: [
      { label: 'Standing desks', image: 'https://picsum.photos/seed/wd1/300/300', slug: 'workspace-systems' },
      { label: 'Ergonomic chairs', image: 'https://picsum.photos/seed/wd2/300/300', slug: 'workspace-systems' },
      { label: 'Monitor arms', image: 'https://picsum.photos/seed/wd3/300/300', slug: 'workspace-systems' },
      { label: 'Keyboard & mice', image: 'https://picsum.photos/seed/wd4/300/300', slug: 'workspace-systems' },
    ],
  },
  {
    id: 'audio',
    type: 'single',
    title: 'Premium audio',
    image: 'https://picsum.photos/seed/wd5/600/450',
    slug: 'audio-sound',
  },
  {
    id: 'mobility',
    type: 'grid',
    title: 'Urban mobility',
    slug: 'urban-mobility',
    items: [
      { label: 'E-scooters', image: 'https://picsum.photos/seed/wd6/300/300', slug: 'urban-mobility' },
      { label: 'City bikes', image: 'https://picsum.photos/seed/wd7/300/300', slug: 'urban-mobility' },
      { label: 'Helmets & safety', image: 'https://picsum.photos/seed/wd8/300/300', slug: 'urban-mobility' },
      { label: 'Accessories', image: 'https://picsum.photos/seed/wd9/300/300', slug: 'accessories' },
    ],
  },
  {
    id: 'creator',
    type: 'single',
    title: 'Creator essentials',
    image: 'https://picsum.photos/seed/wd10/600/450',
    slug: 'creator-gear',
  },
];

/* ── Lifestyle banners ── */
const LIFESTYLE_BANNERS = [
  {
    id: 'home-office',
    eyebrow: 'Work from anywhere',
    title: 'Build your perfect home office',
    copy: 'Ergonomic desks, smart lighting, and premium audio — everything you need to work at your best.',
    image: 'https://picsum.photos/seed/lb1/800/500',
    cta: 'Shop workspace',
    slug: 'workspace-systems',
  },
  {
    id: 'on-the-go',
    eyebrow: 'Stay connected',
    title: 'Tech that moves with you',
    copy: 'Portable chargers, wireless earbuds, and compact gadgets for life on the move.',
    image: 'https://picsum.photos/seed/lb2/800/500',
    cta: 'Shop accessories',
    slug: 'accessories',
  },
];

/* ── Trust items ── */
const TRUST_ITEMS = [
  { Icon: TruckIcon,   title: 'Free delivery',     copy: 'On orders over $250' },
  { Icon: RefreshIcon, title: '30-day returns',     copy: 'Hassle-free returns' },
  { Icon: LockIcon,    title: 'Secure checkout',    copy: '256-bit SSL encryption' },
  { Icon: GlobeIcon,   title: 'Multi-currency',     copy: 'Pay in your currency' },
  { Icon: ShieldIcon,  title: 'Buyer protection',   copy: 'Every order guaranteed' },
  { Icon: PackageIcon, title: 'Live tracking',      copy: 'Real-time shipment updates' },
];

/* ── Stats ── */
const STATS = [
  { Icon: PackageIcon,  value: '50,000+', label: 'Orders fulfilled' },
  { Icon: ChartBarIcon, value: '99.2%',   label: 'On-time delivery' },
  { Icon: StarIcon,     value: '4.8 / 5', label: 'Average rating' },
  { Icon: GlobeIcon,    value: '40+',     label: 'Countries served' },
];

/* ── Testimonials ── */
const TESTIMONIALS = [
  {
    id: 1,
    name: 'Amara O.',
    role: 'Product Designer',
    avatar: 'https://picsum.photos/seed/av1/80/80',
    rating: 5,
    text: 'The checkout experience is seamless. Multi-currency support made it easy to pay in my local currency without any surprises.',
  },
  {
    id: 2,
    name: 'James K.',
    role: 'Software Engineer',
    avatar: 'https://picsum.photos/seed/av2/80/80',
    rating: 5,
    text: 'Ordered a standing desk and it arrived in perfect condition. The real-time tracking kept me updated every step of the way.',
  },
  {
    id: 3,
    name: 'Sofia N.',
    role: 'Content Creator',
    avatar: 'https://picsum.photos/seed/av3/80/80',
    rating: 5,
    text: 'Best platform for creator gear. Detailed descriptions, genuine reviews, and delivery was faster than expected.',
  },
];

/* ════════════════════════════════════════════════════════
   HERO SLIDER
   ════════════════════════════════════════════════════════ */
const HeroSlider = ({ slides, onNavigate }) => {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (slides.length < 2 || paused) return;
    timerRef.current = setInterval(() => setActive((i) => (i + 1) % slides.length), 5500);
    return () => clearInterval(timerRef.current);
  }, [slides.length, paused]);

  if (!slides.length) return null;
  const slide = slides[active];

  return (
    <section
      className="hp-hero"
      aria-label="Featured promotions"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {slides.map((s, i) => (
        <div
          key={s.id}
          className={`hp-hero-slide ${i === active ? 'is-active' : ''}`}
          style={{ backgroundImage: `url(${s.imageUrl})` }}
          aria-hidden={i !== active}
        />
      ))}

      <div className="hp-hero-overlay">
        <div className="hp-hero-content tilt-3d">
          {slide.eyebrow && <span className="hp-hero-eyebrow">{slide.eyebrow}</span>}
          <h1 className="hp-hero-title">{slide.title}</h1>
          {slide.copy && <p className="hp-hero-copy">{slide.copy}</p>}
          <button
            className="hp-hero-cta"
            type="button"
            onClick={() => onNavigate('catalog', slide.categorySlug || '')}
          >
            {slide.ctaLabel || 'Shop now'}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      <div className="hp-hero-dots" role="tablist">
        {slides.map((s, i) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={i === active}
            className={`hp-hero-dot ${i === active ? 'is-active' : ''}`}
            onClick={() => setActive(i)}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>

      <button className="hp-hero-arrow hp-hero-arrow-prev" type="button" onClick={() => setActive((i) => (i - 1 + slides.length) % slides.length)} aria-label="Previous">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>
      <button className="hp-hero-arrow hp-hero-arrow-next" type="button" onClick={() => setActive((i) => (i + 1) % slides.length)} aria-label="Next">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>
    </section>
  );
};

/* ════════════════════════════════════════════════════════
   WINDOW DISPLAY — Amazon-style boxes directly below hero
   ════════════════════════════════════════════════════════ */
const WindowDisplay = ({ onNavigate }) => (
  <div className="hp-window-display">
    {WINDOW_CARDS.map((card, i) => (
      <div key={card.id} className="hp-window-card" style={{ animationDelay: `${i * 80}ms` }}>
        <h3 className="hp-window-card-title">{card.title}</h3>
        
        {card.type === 'single' ? (
          <div 
            className="hp-window-card-img-wrap" 
            onClick={() => onNavigate('catalog', card.slug)}
            style={{ cursor: 'pointer' }}
          >
            <img src={card.image} alt={card.title} loading="lazy" />
          </div>
        ) : (
          <div className="hp-window-card-grid">
            {card.items.map((item) => (
              <div 
                key={item.label} 
                className="hp-window-grid-item" 
                onClick={() => onNavigate('catalog', item.slug)}
                style={{ cursor: 'pointer' }}
              >
                <img className="hp-window-grid-item-img" src={item.image} alt={item.label} loading="lazy" />
                <span className="hp-window-grid-item-label">{item.label}</span>
              </div>
            ))}
          </div>
        )}

        <button
          className="hp-window-card-cta"
          type="button"
          onClick={() => onNavigate('catalog', card.slug)}
        >
          {card.type === 'grid' ? 'Shop now' : 'See more'}
        </button>
      </div>
    ))}
  </div>
);

/* ════════════════════════════════════════════════════════
   TRUST STRIP
   ════════════════════════════════════════════════════════ */
const TrustStrip = () => (
  <section className="hp-trust-strip" aria-label="Why shop with us">
    {TRUST_ITEMS.map(({ Icon, title, copy }) => (
      <div className="hp-trust-item" key={title}>
        <span className="hp-trust-icon"><Icon size={22} /></span>
        <div>
          <strong>{title}</strong>
          <p>{copy}</p>
        </div>
      </div>
    ))}
  </section>
);

/* ════════════════════════════════════════════════════════
   HORIZONTAL PRODUCT ROW (scrollable)
   ════════════════════════════════════════════════════════ */
const ProductRow = ({ title, badge, products, onNavigate, addToCart }) => {
  const rowRef = useRef(null);
  if (!products || !products.length) return null;

  const scroll = (dir) => {
    if (rowRef.current) rowRef.current.scrollBy({ left: dir * 280, behavior: 'smooth' });
  };

  return (
    <section className="hp-section" aria-label={title}>
      <div className="hp-section-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <h2>{title}</h2>
          {badge && <span className="hp-row-badge">{badge}</span>}
        </div>
        <button className="hp-see-more" type="button" onClick={() => onNavigate('catalog')}>
          See all
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      <div className="hp-product-row-wrap">
        <button className="hp-row-arrow hp-row-arrow-left" type="button" onClick={() => scroll(-1)} aria-label="Scroll left">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <div className="hp-product-row" ref={rowRef}>
          {products.map((product) => (
            <div key={product.id} className="hp-product-row-item">
              <ProductCard
                product={product}
                onOpen={(slug) => onNavigate('product', slug)}
                onAdd={addToCart}
              />
            </div>
          ))}
        </div>
        <button className="hp-row-arrow hp-row-arrow-right" type="button" onClick={() => scroll(1)} aria-label="Scroll right">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </div>
    </section>
  );
};

/* ════════════════════════════════════════════════════════
   CATEGORY GRID
   ════════════════════════════════════════════════════════ */
const CategoryGrid = ({ categories, onNavigate }) => {
  if (!categories.length) return null;
  return (
    <section className="hp-section" aria-label="Shop by category">
      <div className="hp-section-header">
        <h2>Shop by Category</h2>
        <button className="hp-see-more" type="button" onClick={() => onNavigate('catalog')}>
          See all
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
      <div className="hp-category-grid">
        {categories.slice(0, 6).map((cat, i) => (
          <button
            key={cat.id}
            className="hp-category-card premium-lift"
            type="button"
            onClick={() => onNavigate('catalog', cat.slug)}
            style={{ animationDelay: `${i * 60}ms` }}
            aria-label={`Browse ${cat.name}`}
          >
            <div className="hp-category-img-wrap">
              <img
                src={CAT_IMAGES[cat.slug] || CAT_IMAGES['workspace-systems']}
                alt={cat.name}
                loading="lazy"
              />
            </div>
            <div className="hp-category-label">
              <strong>{cat.name}</strong>
              {cat.description && <span>{cat.description}</span>}
            </div>
          </button>
        ))}
      </div>
    </section>
  );
};

/* ════════════════════════════════════════════════════════
   LIFESTYLE BANNER
   ════════════════════════════════════════════════════════ */
const LifestyleBanner = ({ banner, onNavigate }) => (
  <section className="hp-lifestyle-banner" aria-label={banner.title}>
    <div className="hp-lifestyle-img-wrap">
      <img src={banner.image} alt={banner.title} loading="lazy" />
    </div>
    <div className="hp-lifestyle-content">
      <span className="hp-lifestyle-eyebrow">{banner.eyebrow}</span>
      <h2>{banner.title}</h2>
      <p>{banner.copy}</p>
      <button className="hp-lifestyle-cta" type="button" onClick={() => onNavigate('catalog', banner.slug)}>
        {banner.cta}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </div>
  </section>
);

/* ════════════════════════════════════════════════════════
   STATS BAR
   ════════════════════════════════════════════════════════ */
const StatsBar = () => (
  <section className="hp-stats-bar" aria-label="Platform statistics">
    {STATS.map(({ Icon, value, label }) => (
      <div className="hp-stat" key={label}>
        <span className="hp-stat-icon"><Icon size={20} /></span>
        <strong>{value}</strong>
        <span>{label}</span>
      </div>
    ))}
  </section>
);

/* ════════════════════════════════════════════════════════
   TESTIMONIALS
   ════════════════════════════════════════════════════════ */
const Testimonials = () => (
  <section className="hp-section hp-testimonials-section" aria-label="Customer reviews">
    <div className="hp-section-header">
      <h2>What our customers say</h2>
    </div>
    <div className="hp-testimonials-grid">
      {TESTIMONIALS.map((t) => (
        <article className="hp-testimonial-card" key={t.id}>
          <div className="hp-testimonial-stars" aria-label={`${t.rating} out of 5 stars`}>
            {Array.from({ length: 5 }, (_, i) => (
              <StarIcon key={i} size={14} filled={i < t.rating} />
            ))}
          </div>
          <p className="hp-testimonial-text">"{t.text}"</p>
          <div className="hp-testimonial-author">
            <img src={t.avatar} alt={t.name} loading="lazy" />
            <div>
              <strong>{t.name}</strong>
              <span>{t.role}</span>
            </div>
          </div>
        </article>
      ))}
    </div>
  </section>
);

/* ════════════════════════════════════════════════════════
   PROMO BANNER
   ════════════════════════════════════════════════════════ */
const PromoBanner = ({ onNavigate }) => (
  <section className="hp-promo-banner" aria-label="Special offer">
    <div className="hp-promo-bg">
      <img src="https://picsum.photos/seed/promo1/1400/500" alt="" loading="lazy" aria-hidden="true" />
    </div>
    <div className="hp-promo-content">
      <span className="hp-promo-eyebrow">Limited Time</span>
      <h2>Free Express Delivery on Orders Over $1,200</h2>
      <p>Shop premium electronics, workspace gear, and urban mobility products with complimentary express shipping worldwide.</p>
      <button className="hp-promo-cta" type="button" onClick={() => onNavigate('catalog')}>
        Shop the collection
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </div>
  </section>
);

/* ════════════════════════════════════════════════════════
   SIGN-IN STRIP
   ════════════════════════════════════════════════════════ */
const SignInStrip = ({ onNavigate }) => (
  <section className="hp-signin-strip" aria-label="Sign in for personalised experience">
    <div className="hp-signin-strip-inner">
      <div className="hp-signin-strip-avatars" aria-hidden="true">
        {[
          'https://picsum.photos/seed/p1/60/60',
          'https://picsum.photos/seed/p2/60/60',
          'https://picsum.photos/seed/p3/60/60',
        ].map((src, i) => (
          <img key={i} src={src} alt="" style={{ zIndex: 3 - i }} className="premium-lift" />
        ))}
        <span>+50k shoppers</span>
      </div>
      <div className="hp-signin-strip-text">
        <h3>See personalised recommendations</h3>
        <p>Sign in to access your wishlist, track orders, and get deals tailored to you.</p>
      </div>
      <div className="hp-signin-strip-actions">
        <button className="hp-signin-btn-primary" type="button" onClick={() => onNavigate('login')}>Sign in</button>
        <button className="hp-signin-btn-ghost" type="button" onClick={() => onNavigate('register')}>Create account</button>
      </div>
    </div>
  </section>
);

/* ════════════════════════════════════════════════════════
   MAIN HOMEPAGE
   ════════════════════════════════════════════════════════ */
const HomePage = ({ data, allProducts, session, onNavigate, addToCart }) => {
  const home               = data?.home || {};
  const heroSlides         = home.heroSlides || [];
  const featuredCategories = home.featuredCategories || data?.lookups?.categories || [];
  const all                = home.featuredProducts || allProducts || [];

  const topPicks    = all.slice(0, 8);
  const bestSellers = [...all].sort((a, b) => (b.review_count || 0) - (a.review_count || 0)).slice(0, 8);
  const newArrivals = [...all].reverse().slice(0, 8);
  const budgetFinds = [...all].filter((p) => Number(p.unit_price) < 150).slice(0, 8);
  const topRated    = [...all].sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0)).slice(0, 8);

  return (
    <main className="hp-root" id="shop">
      {/* 1. Hero Slider */}
      <HeroSlider slides={heroSlides} onNavigate={onNavigate} />

      {/* 2. Window Display — Amazon-style boxes directly below hero */}
      <WindowDisplay onNavigate={onNavigate} />

      {/* 3. Trust Strip */}
      <TrustStrip />

      {/* 4. Top Picks */}
      <ProductRow title="Top picks for you" badge="Personalised" products={topPicks} onNavigate={onNavigate} addToCart={addToCart} />

      {/* 5. Category Grid */}
      <CategoryGrid categories={featuredCategories} onNavigate={onNavigate} />

      {/* 6. Best Sellers */}
      <ProductRow title="Best sellers" badge="#1 in sales" products={bestSellers} onNavigate={onNavigate} addToCart={addToCart} />

      {/* 7. Lifestyle Banner 1 */}
      <LifestyleBanner banner={LIFESTYLE_BANNERS[0]} onNavigate={onNavigate} />

      {/* 8. New Arrivals */}
      <ProductRow title="New arrivals" badge="Just in" products={newArrivals} onNavigate={onNavigate} addToCart={addToCart} />

      {/* 9. Stats Bar */}
      <StatsBar />

      {/* 10. Budget Finds */}
      <ProductRow title="Under $150" badge="Great value" products={budgetFinds} onNavigate={onNavigate} addToCart={addToCart} />

      {/* 11. Lifestyle Banner 2 */}
      <LifestyleBanner banner={LIFESTYLE_BANNERS[1]} onNavigate={onNavigate} />

      {/* 12. Top Rated */}
      <ProductRow title="Top rated" badge="Highest reviews" products={topRated} onNavigate={onNavigate} addToCart={addToCart} />

      {/* 13. Promo Banner */}
      <PromoBanner onNavigate={onNavigate} />

      {/* 14. Testimonials */}
      <Testimonials />

      {/* 15. Sign-in strip (guests only) */}
      {!session && <SignInStrip onNavigate={onNavigate} />}
    </main>
  );
};

export default HomePage;
