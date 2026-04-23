import { useState } from 'react';
import EmptyState from '../components/EmptyState';
import LoadingSkeleton from '../components/LoadingSkeleton';
import ProductCard from '../components/ProductCard';

const CAT_IMAGES = {
  'workspace-systems':  'https://picsum.photos/seed/workspace/1200/300',
  'connected-living':   'https://picsum.photos/seed/connected/1200/300',
  'audio-sound':        'https://picsum.photos/seed/audio/1200/300',
  'urban-mobility':     'https://picsum.photos/seed/urban/1200/300',
  'creator-gear':       'https://picsum.photos/seed/creator/1200/300',
  'accessories':        'https://picsum.photos/seed/accessories/1200/300',
  'wellness-technology':'https://picsum.photos/seed/wellness/1200/300',
};

const CAT_THUMB = {
  'workspace-systems':  'https://picsum.photos/seed/workspace/60/60',
  'connected-living':   'https://picsum.photos/seed/connected/60/60',
  'audio-sound':        'https://picsum.photos/seed/audio/60/60',
  'urban-mobility':     'https://picsum.photos/seed/urban/60/60',
  'creator-gear':       'https://picsum.photos/seed/creator/60/60',
  'accessories':        'https://picsum.photos/seed/accessories/60/60',
  'wellness-technology':'https://picsum.photos/seed/wellness/60/60',
};

const SORT_OPTIONS = [
  { value: 'featured',   label: 'Featured' },
  { value: 'price_asc',  label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'newest',     label: 'Newest Arrivals' },
  { value: 'rating',     label: 'Avg. Customer Review' },
];

const CatalogPage = ({
  data, route, search, setSearch,
  catalogState, catalogSort, setCatalogSort,
  onNavigate, addToCart,
  catalogPage, setCatalogPage, catalogTotal,
  minPrice, setMinPrice, maxPrice, setMaxPrice,
  inStockOnly, setInStockOnly,
}) => {
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const products       = catalogState.data || [];
  const categories     = data.lookups?.categories || [];
  const activeCategory = categories.find((c) => c.slug === route.slug);
  const heroImage      = activeCategory ? CAT_IMAGES[activeCategory.slug] : null;
  const PAGE_SIZE      = 24;
  const totalPages     = Math.ceil((catalogTotal || products.length) / PAGE_SIZE);

  const pageTitle = search.trim()
    ? `Results for "${search}"`
    : activeCategory ? activeCategory.name : 'All Products';

  const FilterPanel = () => (
    <>
      <div className="cat-sidebar-group">
        <h4>Search</h4>
        <div className="cat-search-wrap">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true" className="cat-search-icon">
            <circle cx="11" cy="11" r="5.5" stroke="currentColor" strokeWidth="2"/>
            <path d="M15.5 15.5L20 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
            aria-label="Search within catalog"
          />
        </div>
      </div>

      <div className="cat-sidebar-group">
        <h4>Department</h4>
        <div className="cat-dept-list">
          <button
            className={`cat-dept-item ${!route.slug ? 'is-active' : ''}`}
            type="button"
            onClick={() => onNavigate('catalog')}
          >
            <span className="cat-dept-thumb cat-dept-thumb-all">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <rect x="3" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
                <rect x="14" y="3" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
                <rect x="3" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
                <rect x="14" y="14" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </span>
            <span>All Departments</span>
            {!route.slug && <span className="cat-dept-check">✓</span>}
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              className={`cat-dept-item ${route.slug === cat.slug ? 'is-active' : ''}`}
              type="button"
              onClick={() => onNavigate('catalog', cat.slug)}
            >
              <img
                className="cat-dept-thumb"
                src={CAT_THUMB[cat.slug] || CAT_THUMB['workspace-systems']}
                alt={cat.name}
                loading="lazy"
              />
              <span>{cat.name}</span>
              {route.slug === cat.slug && <span className="cat-dept-check">✓</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="cat-sidebar-group">
        <h4>Price Range</h4>
        <div className="cat-price-row">
          <input type="number" min="0" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} placeholder="Min $" aria-label="Min price" />
          <span>–</span>
          <input type="number" min="0" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="Max $" aria-label="Max price" />
        </div>
      </div>

      <div className="cat-sidebar-group">
        <label className="cat-checkbox-row">
          <input type="checkbox" checked={Boolean(inStockOnly)} onChange={(e) => setInStockOnly(e.target.checked)} />
          <span>In stock only</span>
        </label>
      </div>

      <div className="cat-sidebar-group">
        <h4>Sort by</h4>
        <div className="cat-sort-list">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              className={`cat-sort-item ${catalogSort === opt.value ? 'is-active' : ''}`}
              type="button"
              onClick={() => setCatalogSort(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </>
  );

  return (
    <div className="catalog-page-root">
      {/* Category Hero Banner */}
      {heroImage && (
        <div className="cat-hero-banner tilt-3d">
          <img src={heroImage} alt={activeCategory.name} loading="lazy" />
          <div className="cat-hero-overlay">
            <nav className="cat-breadcrumb" aria-label="Breadcrumb">
              <button type="button" onClick={() => onNavigate('home')}>Home</button>
              <span>/</span>
              <button type="button" onClick={() => onNavigate('catalog')}>All Products</button>
              <span>/</span>
              <span>{activeCategory.name}</span>
            </nav>
            <h1>{activeCategory.name}</h1>
            {activeCategory.description && <p>{activeCategory.description}</p>}
          </div>
        </div>
      )}

      <section className="section-shell">
        {/* Breadcrumb for non-category pages */}
        {!heroImage && (
          <nav className="breadcrumb" style={{ marginBottom: '1rem' }} aria-label="Breadcrumb">
            <button type="button" onClick={() => onNavigate('home')}>Home</button>
            <span>/</span>
            {activeCategory ? (
              <>
                <button type="button" onClick={() => onNavigate('catalog')}>All Products</button>
                <span>/</span>
                <span style={{ color: 'var(--ink-soft)', fontSize: 12 }}>{activeCategory.name}</span>
              </>
            ) : (
              <span style={{ color: 'var(--ink-soft)', fontSize: 12 }}>{pageTitle}</span>
            )}
          </nav>
        )}

        {/* Mobile filter trigger */}
        <div className="cat-mobile-bar">
          <h1 className="cat-mobile-title">{pageTitle}</h1>
          <button className="cat-filter-btn" type="button" onClick={() => setFilterDrawerOpen(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M3 6h18M7 12h10M11 18h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Filters
          </button>
        </div>

        {/* Mobile filter drawer */}
        {filterDrawerOpen && (
          <>
            <div className="mobile-nav-overlay is-open" onClick={() => setFilterDrawerOpen(false)} aria-hidden="true" />
            <div className="mobile-nav-drawer" role="dialog" aria-label="Product filters" aria-modal="true">
              <div className="mobile-nav-header">
                <span style={{ fontWeight: 700, fontSize: 15 }}>Filters</span>
                <button className="mobile-nav-close" type="button" onClick={() => setFilterDrawerOpen(false)} aria-label="Close">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
              <div style={{ padding: '1rem', overflowY: 'auto', flex: 1 }}>
                <FilterPanel />
              </div>
              <div style={{ padding: '1rem', borderTop: '1px solid var(--border)' }}>
                <button className="accent-btn" style={{ width: '100%' }} type="button" onClick={() => setFilterDrawerOpen(false)}>
                  Apply Filters
                </button>
              </div>
            </div>
          </>
        )}

        <div className="two-column-layout">
          {/* Desktop Sidebar */}
          <aside className="cat-sidebar sticky-sidebar" aria-label="Filter products">
            <FilterPanel />
          </aside>

          {/* Main Grid */}
          <div className="catalog-main">
            {/* Results bar */}
            <div className="cat-results-bar">
              <span aria-live="polite">
                {catalogState.status === 'loading'
                  ? 'Loading…'
                  : <><strong>{products.length.toLocaleString()}</strong> result{products.length !== 1 ? 's' : ''}</>}
              </span>
              <div className="cat-sort-select-wrap">
                <label htmlFor="cat-sort-select" className="visually-hidden">Sort by</label>
                <select
                  id="cat-sort-select"
                  value={catalogSort}
                  onChange={(e) => setCatalogSort(e.target.value)}
                  aria-label="Sort products"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {catalogState.status === 'loading' ? (
              <LoadingSkeleton count={8} type="product" />
            ) : products.length > 0 ? (
              <div className="product-grid cat-product-grid">
                {products.map((product, i) => (
                  <div key={product.id} style={{ animationDelay: `${Math.min(i, 12) * 40}ms`, animation: 'fade-up 400ms ease both' }}>
                    <ProductCard
                      product={product}
                      onOpen={(slug) => onNavigate('product', slug)}
                      onAdd={addToCart}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No matching products"
                copy="Try a different search term or browse another department."
                action={
                  <button className="ghost-btn" type="button" onClick={() => { setSearch(''); onNavigate('catalog'); }}>
                    Reset filters
                  </button>
                }
              />
            )}

            {totalPages > 1 && (
              <div className="pagination" role="navigation" aria-label="Catalog pages">
                <button className="ghost-btn ghost-btn-small" type="button" disabled={catalogPage <= 1} onClick={() => setCatalogPage((p) => Math.max(1, p - 1))}>
                  ‹ Prev
                </button>
                <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Page {catalogPage} of {totalPages}</span>
                <button className="ghost-btn ghost-btn-small" type="button" disabled={catalogPage >= totalPages} onClick={() => setCatalogPage((p) => p + 1)}>
                  Next ›
                </button>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default CatalogPage;
