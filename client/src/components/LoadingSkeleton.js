/* Generic shimmer skeleton for product/catalog loading states */
const LoadingSkeleton = ({ count = 6, type = 'product' }) => {
  if (type === 'product') {
    return (
      <div className="skeleton-product-grid" aria-busy="true" aria-label="Loading products">
        {Array.from({ length: count }).map((_, i) => (
          <div className="skeleton-card" key={i} style={{ animationDelay: `${i * 60}ms` }}>
            <div className="skeleton skeleton-img" />
            <div className="skeleton skeleton-text wide" />
            <div className="skeleton skeleton-text short" />
            <div className="skeleton skeleton-text price" />
          </div>
        ))}
      </div>
    );
  }

  if (type === 'row') {
    return (
      <div aria-busy="true" aria-label="Loading" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div className="skeleton" style={{ width: 48, height: 48, borderRadius: 6, flexShrink: 0 }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div className="skeleton skeleton-text wide" />
              <div className="skeleton skeleton-text short" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'detail') {
    return (
      <div aria-busy="true" aria-label="Loading details" className="skeleton-detail-grid">
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div className="skeleton" style={{ width: '40%', minWidth: 200, aspectRatio: '1', borderRadius: 8 }} />
          <div style={{ flex: 1, minWidth: 240, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="skeleton skeleton-text" style={{ width: '70%', height: 24 }} />
            <div className="skeleton skeleton-text" style={{ width: '40%', height: 20 }} />
            <div className="skeleton skeleton-text" style={{ width: '90%' }} />
            <div className="skeleton skeleton-text" style={{ width: '80%' }} />
            <div className="skeleton skeleton-text" style={{ width: '30%', height: 36, marginTop: 12 }} />
          </div>
        </div>
      </div>
    );
  }

  if (type === 'dashboard') {
    return (
      <div aria-busy="true" aria-label="Loading dashboard" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 80, borderRadius: 8 }} />
          ))}
        </div>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 52, borderRadius: 6 }} />
        ))}
      </div>
    );
  }

  if (type === 'cart') {
    return (
      <div aria-busy="true" aria-label="Loading cart" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} style={{ display: 'flex', gap: '1rem', alignItems: 'center', padding: '1rem', background: '#fff', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <div className="skeleton" style={{ width: 80, height: 80, borderRadius: 6, flexShrink: 0 }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div className="skeleton skeleton-text wide" />
              <div className="skeleton skeleton-text short" />
              <div className="skeleton skeleton-text price" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return null;
};

export default LoadingSkeleton;
