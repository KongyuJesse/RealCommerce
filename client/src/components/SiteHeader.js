import { useEffect, useRef, useState } from 'react';
import {
  CartIcon,
  CreditCardIcon,
  HeartIcon,
  MapPinIcon,
  MenuIcon,
  SearchIcon,
  ShieldIcon,
  TruckIcon,
} from './MarketplaceIcons';

const defaultUtilityHighlights = [
  { label: 'Verified sellers', icon: ShieldIcon },
  { label: 'Live shipment tracking', icon: TruckIcon },
  { label: 'Protected checkout', icon: CreditCardIcon },
];

const defaultNavigationLinks = [
  { label: 'Home', page: 'home' },
  { label: 'Catalog', page: 'catalog' },
  { label: 'Track order', page: 'access' },
];

const adminRoles = ['admin', 'operations_manager', 'merchandising_manager'];

const normalizeNavigationLinks = (links, session) => {
  const items = Array.isArray(links) && links.length
    ? links.map((l) => (typeof l === 'string' ? { label: l, page: 'catalog' } : l))
    : defaultNavigationLinks;

  if (!session) return [...items, { label: 'Sign in', page: 'login' }];

  const loggedIn = [...items, { label: 'Dashboard', page: 'dashboard' }];
  if (session.customerId) loggedIn.push({ label: 'Wishlist', page: 'wishlist' });
  if (adminRoles.includes(session.roleName)) {
    loggedIn.push({ label: 'Analytics', page: 'analytics' });
    loggedIn.push({ label: 'Inventory', page: 'inventory' });
  }
  return loggedIn;
};

const formatRoleLabel = (roleName) =>
  roleName
    ? roleName.split('_').map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ')
    : 'Account access';

const isActiveLink = (route, item) => {
  if (!route || !item?.page) return false;
  if (route.page !== item.page) return false;
  return !item.slug || route.slug === item.slug;
};

const SiteHeader = ({ search, setSearch, onSearch, session, cart, data, route, onNavigate, wishlistCount = 0 }) => {
  const site               = data?.site || {};
  const categories         = data?.lookups?.categories || [];
  const utilityHighlights  = site.utilityHighlights || defaultUtilityHighlights;
  const navigationLinks    = normalizeNavigationLinks(site.navigationLinks, session);
  const location           = session?.city || site.location || 'Lagos';
  const cartCount          = cart?.itemCount || 0;
  const firstName          = session?.firstName || session?.fullName?.split(' ')[0] || 'there';
  const roleLabel          = formatRoleLabel(session?.roleName);

  const [selectedCategory, setSelectedCategory] = useState('');
  const [drawerOpen, setDrawerOpen]             = useState(false);
  const drawerRef = useRef(null);

  // Sync category with route
  useEffect(() => {
    setSelectedCategory(route?.page === 'catalog' ? route.slug || '' : '');
  }, [route?.page, route?.slug]);

  // Close drawer on route change
  useEffect(() => { setDrawerOpen(false); }, [route?.page]);

  // Trap focus / close on Escape
  useEffect(() => {
    if (!drawerOpen) return undefined;
    const handleKey = (e) => { if (e.key === 'Escape') setDrawerOpen(false); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [drawerOpen]);

  const spotlightLabel = site.spotlightLabel ||
    'Shop confidently with secure checkout, live exchange rates, and real-time inventory tracking.';

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
      {/* Skip to content — accessibility */}
      <a href="#main-content" className="skip-to-content">Skip to main content</a>

      {/* Utility Bar */}
      <div className="header-utility-bar">
        <div className="header-utility-copy">
          <span className="header-utility-badge">RealCommerce.com</span>
          <p>{site.tagline || 'Managed commerce, fulfillment, and shipping in one operating surface.'}</p>
        </div>
        <div className="header-utility-highlights" aria-label="Platform highlights">
          {utilityHighlights.map((item) => {
            const Icon = item.icon;
            return (
              <div className="utility-pill" key={item.label}>
                <Icon size={14} />
                <span>{item.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top Navbar */}
      <div className="navbar-top">
        <div className="nav-left">
          {/* Hamburger (mobile) */}
          <button
            className="nav-hamburger"
            type="button"
            aria-label="Open navigation menu"
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen(true)}
          >
            <span /><span /><span />
          </button>

          {/* Logo */}
          <button className="logo" type="button" onClick={() => onNavigate('home')} aria-label="RealCommerce home">
            <span className="logo-mark">RC</span>
            <span className="logo-lockup">
              <span className="logo-text">realcommerce</span>
              <span className="logo-suffix">.com</span>
            </span>
          </button>

          {/* Deliver-to */}
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
            placeholder="Search products, sellers, and inventory..."
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
            <span>{session ? 'Shipping & returns' : 'Track & manage'}</span>
            <span className="nav-bold">Orders</span>
          </button>

          {/* Wishlist */}
          <button
            className="nav-action nav-wishlist"
            type="button"
            onClick={() => onNavigate('wishlist')}
            aria-label={`Your wishlist${wishlistCount > 0 ? ` with ${wishlistCount} item${wishlistCount !== 1 ? 's' : ''}` : ''}`}
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
              <span style={{ display: 'none' }}>{cartCount} items</span>
              <span className="nav-bold">Cart</span>
            </span>
          </button>
        </div>
      </div>

      {/* Secondary Nav */}
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

        <div className="nav-spotlight" aria-label="Platform highlight">
          <span className="nav-spotlight-label">{spotlightLabel}</span>
        </div>
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
            <button className="mobile-nav-close" type="button" onClick={() => setDrawerOpen(false)} aria-label="Close menu">x</button>
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
