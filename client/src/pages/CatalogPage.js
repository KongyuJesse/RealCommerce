import EmptyState from '../components/EmptyState';
import LoadingSkeleton from '../components/LoadingSkeleton';
import ProductCard from '../components/ProductCard';

const CatalogPage = ({
  data,
  route,
  search,
  setSearch,
  catalogState,
  catalogSort,
  setCatalogSort,
  onNavigate,
  addToCart,
}) => {
  const products   = catalogState.data || [];
  const categories = data.lookups?.categories || [];
  const activeCategory = categories.find((c) => c.slug === route.slug);
  const pageTitle = search.trim()
    ? `Results for "${search}"`
    : activeCategory
    ? activeCategory.name
    : 'All Products';

  return (
    <section className="section-shell">
      <div className="section-header">
        <div>
          <h1>{pageTitle}</h1>
          {!search && activeCategory?.description && (
            <p>{activeCategory.description}</p>
          )}
        </div>
      </div>

      <div className="two-column-layout">
        {/* Sidebar */}
        <aside className="sidebar-stack sticky-sidebar" aria-label="Filter products">
          <div className="sidebar-group">
            <h4>Search</h4>
            <input
              className="catalog-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search within results..."
              aria-label="Search within catalog"
            />
          </div>

          <div className="sidebar-group">
            <h4>Department</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <button
                className="inline-link"
                style={{
                  textAlign: 'left',
                  fontWeight: !route.slug ? 700 : 400,
                  color: !route.slug ? 'var(--ink)' : 'var(--link)',
                  padding: '2px 0',
                }}
                type="button"
                onClick={() => onNavigate('catalog')}
              >
                {!route.slug && '› '}Any Department
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  className="inline-link"
                  style={{
                    textAlign: 'left',
                    fontWeight: route.slug === category.slug ? 700 : 400,
                    color: route.slug === category.slug ? 'var(--ink)' : 'var(--link)',
                    padding: '2px 0',
                  }}
                  type="button"
                  onClick={() => onNavigate('catalog', category.slug)}
                >
                  {route.slug === category.slug && '› '}
                  {category.name}
                </button>
              ))}
            </div>
          </div>

          <div className="sidebar-group">
            <h4>Sort by</h4>
            <select
              value={catalogSort}
              onChange={(e) => setCatalogSort(e.target.value)}
              aria-label="Sort products"
            >
              <option value="featured">Featured</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="newest">Newest Arrivals</option>
              <option value="rating">Avg. Customer Review</option>
            </select>
          </div>
        </aside>

        {/* Main Grid */}
        <div className="catalog-main">
          <div className="filter-row">
            <span className="muted-copy" aria-live="polite">
              {catalogState.status === 'loading'
                ? 'Loading results…'
                : `${products.length.toLocaleString()} result${products.length !== 1 ? 's' : ''}`}
            </span>
            <select
              className="category-trigger"
              value={catalogSort}
              onChange={(e) => setCatalogSort(e.target.value)}
              aria-label="Sort products"
              style={{ display: 'none' }}
            />
            <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
              Department:{' '}
              <strong style={{ color: 'var(--ink)' }}>
                {activeCategory ? activeCategory.name : 'All'}
              </strong>
            </div>
          </div>

          {catalogState.status === 'loading' ? (
            <LoadingSkeleton count={8} type="product" />
          ) : products.length > 0 ? (
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
          ) : (
            <EmptyState
              title="No matching products"
              copy="Try a different search term or browse another department."
              action={
                <button
                  className="ghost-btn"
                  type="button"
                  onClick={() => { setSearch(''); onNavigate('catalog'); }}
                >
                  Reset filters
                </button>
              }
            />
          )}
        </div>
      </div>
    </section>
  );
};

export default CatalogPage;
