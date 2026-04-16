const EmptyCartSVG = () => (
  <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <circle cx="40" cy="40" r="40" fill="#f3f4f6"/>
    <path d="M20 22h4l6 28h26l4-18H30" stroke="#9ca3af" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    <circle cx="34" cy="56" r="3" fill="#9ca3af"/>
    <circle cx="52" cy="56" r="3" fill="#9ca3af"/>
  </svg>
);

const WishlistSVG = () => (
  <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <circle cx="40" cy="40" r="40" fill="#fef3f2"/>
    <path d="M40 56s-16-9.6-16-20a9 9 0 0116-5.6A9 9 0 0156 36c0 10.4-16 20-16 20z" stroke="#f87171" strokeWidth="2.5" fill="none"/>
  </svg>
);

const NotFoundSVG = () => (
  <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <circle cx="40" cy="40" r="40" fill="#f3f4f6"/>
    <circle cx="36" cy="34" r="14" stroke="#9ca3af" strokeWidth="2.5" fill="none"/>
    <path d="M46 44l10 10" stroke="#9ca3af" strokeWidth="2.5" strokeLinecap="round"/>
    <path d="M30 30l12 12M42 30L30 42" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const LockSVG = () => (
  <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <circle cx="40" cy="40" r="40" fill="#f0f4ff"/>
    <rect x="28" y="36" width="24" height="18" rx="3" stroke="#6366f1" strokeWidth="2.5" fill="none"/>
    <path d="M33 36V30a7 7 0 0114 0v6" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round"/>
    <circle cx="40" cy="46" r="2" fill="#6366f1"/>
  </svg>
);

const ErrorSVG = () => (
  <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <circle cx="40" cy="40" r="40" fill="#fef2f2"/>
    <path d="M40 24v20M40 52v4" stroke="#f87171" strokeWidth="3" strokeLinecap="round"/>
    <circle cx="40" cy="40" r="22" stroke="#fca5a5" strokeWidth="2.5" fill="none"/>
  </svg>
);

const ILLUSTRATIONS = {
  cart: EmptyCartSVG,
  wishlist: WishlistSVG,
  notFound: NotFoundSVG,
  lock: LockSVG,
  error: ErrorSVG,
};

/**
 * If no explicit `type` is passed, fall back to keyword-matching on `title`.
 */
const resolveIllustration = (type, title = '') => {
  if (type && ILLUSTRATIONS[type]) return ILLUSTRATIONS[type];

  const t = title.toLowerCase();
  if (t.includes('cart')) return EmptyCartSVG;
  if (t.includes('wishlist')) return WishlistSVG;
  if (t.includes('sign in') || t.includes('restricted') || t.includes('access')) return LockSVG;
  if (t.includes('not found') || t.includes('loading')) return NotFoundSVG;
  return ErrorSVG;
};

const EmptyState = ({ title, copy, action, type }) => {
  const Illustration = resolveIllustration(type, title);
  return (
    <div className="empty-state" role="status">
      <div className="empty-state-icon"><Illustration /></div>
      <h2>{title}</h2>
      {copy && <p>{copy}</p>}
      {action && <div style={{ marginTop: '0.25rem' }}>{action}</div>}
    </div>
  );
};

export default EmptyState;
