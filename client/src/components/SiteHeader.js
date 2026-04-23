import { useEffect, useRef, useState } from 'react';
import {
  CartIcon,
  HeartIcon,
  MapPinIcon,
  MenuIcon,
  SearchIcon,
} from './MarketplaceIcons';
import CurrencySelector from './CurrencySelector';

const defaultNavigationLinks = [
  { label: 'Home',             page: 'home' },
  { label: "Today's Deals",    page: 'catalog' },
  { label: 'New Arrivals',     page: 'catalog' },
  { label: 'Customer Service', page: 'access' },
];

const adminRoles = [
  'admin', 'inventory_manager', 'order_manager', 'catalog_manager',
  'marketing_manager', 'finance_manager', 'customer_support', 'shipping_coordinator',
];

const normalizeNavigationLinks = (links, session) => {
  const base = Array.isArray(links) && links.length
    ? links.map((l) => (typeof l === 'string' ? { label: l, page: 'catalog' } : l))
    : defaultNavigationLinks;

  if (!session) return base;

  const out = [...base, { label: 'Dashboard', page: 'dashboard' }];
  if (session.customerId) out.push({ label: 'Wishlist', page: 'wishlist' });
  if (adminRoles.includes(session.roleName)) {
    out.push({ label: 'Analytics', page: 'analytics' });
    out.push({ label: 'Inventory', page: 'inventory' });
  }
  return out;
};

const formatRoleLabel = (roleName) =>
  roleName
    ? roleName.split('_').map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ')
    : 'Account & Lists';

const isActiveLink = (route, item) => {
  if (!route || !item?.page) return false;
  if (route.page !== item.page) return false;
  return !item.slug || route.slug === item.slug;
};

const SiteHeader = ({ search, setSearch, onSearch, session, cart, data, route, onNavigate, wishlistCount = 0 }) => {
  const site            = data?.site || {};
  const categories      = data?.lookups?.categories || [];
  const navigationLinks = normalizeNavigationLinks(site.navigationLinks, session);
  const location        = session?.city || site.location || 'Cameroon';
  const cartCount       = cart?.itemCount || 0;
  const firstName       = session?.firstName || session?.fullName?.split(' ')[0] || 'there';
  const roleLabel       = formatRoleLabel(session?.roleName);

  const [selectedCategory, setSelectedCategory] = useState('');
  const [drawerOpen, setDrawerOpen]             = useState(false);
  const drawerRef = useRef(null);

  useEffect(() => {
    setSelectedCategory(route?.page === 'catalog' ? route.slug || '' : '');
  }, [route?.page, route?.slug]);

  useEffect(() => { setDrawerOpen(false); }, [route?.page]);

  useEffect(() => {
    if (!drawerOpen) return undefined;
    const handleKey = (e) => { if (e.key === 'Escape') setDrawerOpen(false); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [drawerOpen]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (onSearch) onSearch(search, selectedCategory);
  };

  const allLinks = [
    ...navigationLinks,
    ...categories.slice(0, 6).map((c) => ({ label: c.name, page: 'catalog', slug: c.slug })),
  ];

  return (
    <header className="site-header">
      <a href="#main-content" className="skip-to-content">Skip to main content</a>

      {/* ── Main Navbar ── */}
      <div className="navbar-top">
        <div className="nav-left">
          <button
            className="nav-hamburger"
            type="button"
            aria-label="Open navigation menu"
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen(true)}
          >
            <span /><span /><span />
          </button>

          <button className="logo" type="button" onClick={() => onNavigate('home')} aria-label="RealCommerce home">
            <span className="logo-mark">RC</span>
            <span className="logo-lockup">
              <span className="logo-text">realcommerce</span>
              <span className="logo-suffix">.com</span>
            </span>
          </button>

          <button
            className="deliver-to"
            type="button"
            onClick={() => onNavigate('catalog', selectedCategory)}
            aria-label={`Shipping to ${location}`}
          >
            <MapPinIcon size={17} />
            <div className="deliver-text">
              <span className="deliver-line1">Deliver to</span>
              <span className="deliver-line2">{location}</span>
            </div>
          </button>
        </div>

        {/* Search */}
        <form className="nav-search" onSubmit={handleSearch} aria-label="Search RealCommerce" role="search">
          <label className="search-category-wrap">
            <span className="visually-hidden">Search department</span>
            <select
              className="search-category"
              aria-label="Search department"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">All</option>
              {categories.map((c) => (
                <option key={c.id} value={c.slug}>{c.name}</option>
              ))}
            </select>
          </label>
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search"
          />
          <button className="search-btn" type="submit" aria-label="Submit search">
            <SearchIcon size={18} />
          </button>
        </form>

        {/* Right Actions */}
        <div className="nav-right">
          <CurrencySelector />

          <button
            className="nav-action nav-account"
            type="button"
            onClick={() => onNavigate(session ? 'dashboard' : 'login')}
          >
            <span>{session ? `Hello, ${firstName}` : 'Hello, sign in'}</span>
            <span className="nav-bold">{session ? roleLabel : 'Account & Lists'}</span>
          </button>

          <button
            className="nav-action nav-returns"
            type="button"
            onClick={() => onNavigate(session ? 'dashboard' : 'access')}
          >
            <span>Returns</span>
            <span className="nav-bold">& Orders</span>
          </button>

          <button
            className="nav-action nav-wishlist"
            type="button"
            onClick={() => onNavigate('wishlist')}
            aria-label={`Wishlist${wishlistCount > 0 ? ` (${wishlistCount})` : ''}`}
          >
            <span style={{ position: 'relative', display: 'inline-flex' }}>
              <HeartIcon size={20} />
              {wishlistCount > 0 && (
                <span className="nav-cart-badge" aria-hidden="true" style={{ top: -4, right: -8, fontSize: 10, minWidth: 16, height: 16 }}>
                  {wishlistCount}
                </span>
              )}
            </span>
            <span className="nav-bold">Wishlist</span>
          </button>

          <button
            className="nav-action nav-cart"
            type="button"
            onClick={() => onNavigate('cart')}
            aria-label={`Cart with ${cartCount} item${cartCount !== 1 ? 's' : ''}`}
          >
            <CartIcon size={26} />
            {cartCount > 0 && <span className="nav-cart-badge" aria-hidden="true">{cartCount}</span>}
            <span className="nav-cart-copy">
              <span className="nav-bold">Cart</span>
            </span>
          </button>
        </div>
      </div>

      {/* ── Secondary Nav ── */}
      <nav className="nav-secondary" aria-label="Primary navigation">
        <button className="nav-all" type="button" onClick={() => onNavigate('catalog')}>
          <MenuIcon size={16} />
          <span>All</span>
        </button>

        <div className="nav-primary-links">
          {navigationLinks.map((item) => (
            <button
              key={`${item.page}-${item.slug || item.label}`}
              type="button"
              className={`nav-chip ${isActiveLink(route, item) ? 'is-active' : ''}`}
              onClick={() => onNavigate(item.page, item.slug, item.detail)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {categories.length > 0 && (
          <div className="nav-category-links">
            {categories.slice(0, 5).map((c) => (
              <button
                key={c.id}
                type="button"
                className={`nav-chip nav-chip-muted ${route?.page === 'catalog' && route?.slug === c.slug ? 'is-active' : ''}`}
                onClick={() => onNavigate('catalog', c.slug)}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}
      </nav>

      {/* Mobile Drawer Overlay */}
      <div
        className={`mobile-nav-overlay ${drawerOpen ? 'is-open' : ''}`}
        onClick={() => setDrawerOpen(false)}
        aria-hidden="true"
      />

      {/* Mobile Drawer */}
      {drawerOpen && (
        <div className="mobile-nav-drawer" ref={drawerRef} role="dialog" aria-label="Navigation menu" aria-modal="true">
          <div className="mobile-nav-header">
            <span style={{ fontWeight: 700, fontSize: 15 }}>
              {session ? `Hello, ${firstName}` : 'Hello, sign in'}
            </span>
            <button className="mobile-nav-close" type="button" onClick={() => setDrawerOpen(false)} aria-label="Close menu">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
          <div className="mobile-nav-links">
            {allLinks.map((item) => (
              <button
                key={`mobile-${item.page}-${item.slug || item.label}`}
                className="mobile-nav-link"
                type="button"
                onClick={() => { onNavigate(item.page, item.slug, item.detail); setDrawerOpen(false); }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </header>
  );
};

export default SiteHeader;
