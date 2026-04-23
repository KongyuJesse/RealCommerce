const FOOTER_COLUMNS = [
  {
    title: 'Explore',
    links: [
      { label: 'Catalog',           page: 'catalog' },
      { label: 'Workspace Systems', page: 'catalog', slug: 'workspace-systems' },
      { label: 'Connected Living',  page: 'catalog', slug: 'connected-living' },
      { label: 'Urban Mobility',    page: 'catalog', slug: 'urban-mobility' },
      { label: 'Creator Gear',      page: 'catalog', slug: 'creator-gear' },
      { label: 'Accessories',       page: 'catalog', slug: 'accessories' },
    ],
  },
  {
    title: 'Orders',
    links: [
      { label: 'Track an order', page: 'track-order' },
      { label: 'Your cart',      page: 'cart' },
      { label: 'Checkout',       page: 'checkout' },
      { label: 'Order history',  page: 'dashboard' },
    ],
  },
  {
    title: 'Account',
    links: [
      { label: 'Sign in',        page: 'login' },
      { label: 'Create account', page: 'register' },
      { label: 'Dashboard',      page: 'dashboard' },
      { label: 'Wishlist',       page: 'wishlist' },
    ],
  },
  {
    title: 'Support',
    links: [
      { label: 'Help Center',  page: 'help' },
      { label: 'Contact Us',   page: 'help' },
      { label: 'Analytics',    page: 'analytics' },
      { label: 'Inventory',    page: 'inventory' },
    ],
  },
];

const SiteFooter = ({ data, onNavigate }) => {
  const site    = data?.site || {};
  const columns = FOOTER_COLUMNS;
  const year    = new Date().getFullYear();
  const geo     = data?.geo || {};
  const countryCode  = geo.countryCode  || '';
  const currencyCode = geo.currencyCode || 'XAF';

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
        {/* Link columns */}
        <div className="footer-links-grid">
          {columns.map((col) => (
            <div className="footer-col" key={col.title}>
              <p>{col.title}</p>
              <ul>
                {col.links.map((item) => (
                  <li key={item.label}>
                    <button
                      className="footer-link-button"
                      type="button"
                      onClick={() => onNavigate && onNavigate(item.page, item.slug)}
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
            </div>

            <div className="footer-copyright">
              <span>© {year} RealCommerce, Inc. All rights reserved.</span>
              {countryCode && (
                <span style={{ opacity: 0.6 }}>
                  📍 {countryCode} · {currencyCode}
                </span>
              )}
              <button className="footer-legal-link" type="button">Conditions of Use</button>
              <button className="footer-legal-link" type="button">Privacy Notice</button>
              <button className="footer-legal-link" type="button">Shipping &amp; Returns</button>
              <button className="footer-legal-link" type="button" onClick={() => onNavigate && onNavigate('staff-portal')} style={{ opacity: 0.3 }}>Staff</button>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
};

export default SiteFooter;
