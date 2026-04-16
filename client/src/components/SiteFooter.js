const defaultFooterColumns = [
  {
    title: 'Shop',
    links: [
      { label: 'All Products', page: 'catalog' },
      { label: 'Wishlist', page: 'wishlist' },
      { label: 'Workspace Systems', page: 'catalog', slug: 'workspace-systems' },
      { label: 'Connected Living', page: 'catalog', slug: 'connected-living' },
      { label: 'Urban Mobility', page: 'catalog', slug: 'urban-mobility' },
    ],
  },
  {
    title: 'Orders',
    links: [
      { label: 'Track an order', page: 'access' },
      { label: 'Your cart', page: 'cart' },
      { label: 'Checkout', page: 'checkout' },
      { label: 'Order history', page: 'dashboard' },
    ],
  },
  {
    title: 'Account',
    links: [
      { label: 'Sign in', page: 'login' },
      { label: 'Create account', page: 'register' },
      { label: 'Dashboard', page: 'dashboard' },
      { label: 'Seller workspace', page: 'dashboard' },
    ],
  },
  {
    title: 'Platform',
    links: [
      { label: 'Home', page: 'home' },
      { label: 'Analytics', page: 'analytics' },
      { label: 'Inventory', page: 'inventory' },
      { label: 'Fulfillment ops', page: 'dashboard' },
    ],
  },
];

const normalizeLink = (link) => (typeof link === 'string' ? { label: link, page: 'catalog' } : link);

const SiteFooter = ({ data, onNavigate, storageStatus }) => {
  const site         = data?.site || {};
  const footerColumns = (site.footerColumns || defaultFooterColumns).map((col) => ({
    ...col,
    links: (col.links || []).map(normalizeLink),
  }));

  const footerCta = site.footerCta || {
    eyebrow: 'Built for modern commerce',
    title: 'Storefront, checkout, and fulfillment — all connected.',
    copy: 'RealCommerce keeps browsing, orders, shipping, and operational visibility inside one consistent experience.',
  };

  const storageProvider = storageStatus?.provider ? String(storageStatus.provider).toUpperCase() : 'LOCAL';
  const storageHealth   = storageStatus?.configured ? 'configured' : 'not configured';
  const productCount    = data?.products?.length || 0;
  const categoryCount   = data?.lookups?.categories?.length || 0;
  const warehouseCount  = (data?.lookups?.warehouses || data?.home?.warehouses || []).length;
  const shippingCount   = data?.lookups?.shippingMethods?.length || 0;

  const footerStats = site.footerStats || [
    { value: `${productCount}+`, label: 'managed products' },
    { value: `${categoryCount}`, label: 'departments' },
    { value: `${warehouseCount}`, label: 'fulfillment hubs' },
    { value: `${shippingCount}`, label: 'delivery methods' },
  ];

  return (
    <>
      <button
        className="back-top"
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Back to top"
      >
        ↑ Back to top
      </button>

      <footer className="site-footer" aria-label="Site footer">
        {/* Showcase strip */}
        <section className="footer-showcase">
          <div className="footer-showcase-copy">
            <span className="footer-eyebrow">{footerCta.eyebrow}</span>
            <h2>{footerCta.title}</h2>
            <p>{footerCta.copy}</p>
          </div>
          <div className="footer-stat-grid" aria-label="Marketplace stats">
            {footerStats.map((stat) => (
              <div className="footer-stat-card" key={stat.label}>
                <strong>{stat.value}</strong>
                <span>{stat.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Link columns */}
        <div className="footer-links-grid">
          {footerColumns.map((col) => (
            <div className="footer-col" key={col.title}>
              <p>{col.title}</p>
              <ul>
                {col.links.map((item) => (
                  <li key={`${col.title}-${item.label}`}>
                    <button
                      className="footer-link-button"
                      type="button"
                      onClick={() => onNavigate && onNavigate(item.page, item.slug, item.detail)}
                    >
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="footer-divider-line" />

        {/* Bottom bar */}
        <div className="footer-bottom">
          <div className="footer-bottom-inner">
            <div className="footer-brand-block">
              <div className="footer-logo-text">{site.brand || 'RealCommerce'}</div>
              <p>{site.tagline || 'Premium marketplace with multi-currency checkout and warehouse-aware fulfillment.'}</p>
            </div>

            <div className="footer-platform-note">
              <span className="footer-storage-note">Media: {storageProvider} — {storageHealth}</span>
              <span className="footer-storage-note">Returns window: {site.seo?.returnWindowDays || 30} days</span>
            </div>

            <div className="footer-copyright">
              <span>© {new Date().getFullYear()} RealCommerce, Inc.</span>
              <span className="footer-legal-link">
                Conditions of Use
              </span>
              <span className="footer-legal-link">
                Privacy Notice
              </span>
              <span className="footer-legal-link">
                Shipping &amp; Returns
              </span>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
};

export default SiteFooter;
