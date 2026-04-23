const NotFoundPage = ({ onNavigate }) => (
  <section className="section-shell">
    <div className="empty-state" style={{ minHeight: '60vh' }}>
      <div style={{ fontSize: '4rem', lineHeight: 1 }}>404</div>
      <h2>Page not found</h2>
      <p className="muted-copy">The page you are looking for does not exist or has been moved.</p>
      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
        <button className="accent-btn" type="button" onClick={() => onNavigate('home')}>
          Go home
        </button>
        <button className="ghost-btn" type="button" onClick={() => onNavigate('catalog')}>
          Browse catalog
        </button>
      </div>
    </div>
  </section>
);

export default NotFoundPage;
