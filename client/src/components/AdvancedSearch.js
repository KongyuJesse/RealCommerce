import { useState, useEffect, useRef } from 'react';
import { SearchIcon, XIcon, FilterIcon } from './MarketplaceIcons';

const AdvancedSearch = ({ onSearch, categories, onNavigate }) => {
  const [query, setQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    category: '',
    minPrice: '',
    maxPrice: '',
    inStock: false,
    sortBy: 'featured',
  });
  const searchRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false);
        setShowFilters(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    // Simulate search suggestions - in production, fetch from API
    const mockSuggestions = [
      { type: 'product', text: `${query} - Wireless Headphones`, category: 'Electronics' },
      { type: 'product', text: `${query} - Smart Watch`, category: 'Electronics' },
      { type: 'category', text: 'Electronics', count: 45 },
      { type: 'category', text: 'Fashion', count: 120 },
    ].filter(s => s.text.toLowerCase().includes(query.toLowerCase()));

    setSuggestions(mockSuggestions);
    setShowSuggestions(true);
  }, [query]);

  const handleSearch = (e) => {
    e?.preventDefault();
    setShowSuggestions(false);
    setShowFilters(false);
    onSearch(query, filters);
  };

  const handleSuggestionClick = (suggestion) => {
    if (suggestion.type === 'category') {
      const category = categories.find(c => c.name === suggestion.text);
      if (category) {
        onNavigate('catalog', category.slug);
      }
    } else {
      setQuery(suggestion.text);
      handleSearch();
    }
    setShowSuggestions(false);
  };

  return (
    <div ref={searchRef} style={{ position: 'relative', width: '100%', maxWidth: 600 }}>
      <form onSubmit={handleSearch} style={{ position: 'relative' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            background: 'var(--surface)',
            border: '2px solid var(--border)',
            borderRadius: 8,
            overflow: 'hidden',
            transition: 'border-color 0.2s',
          }}
        >
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => query.length >= 2 && setShowSuggestions(true)}
            placeholder="Search products, categories..."
            style={{
              flex: 1,
              padding: '0.75rem 1rem',
              border: 'none',
              outline: 'none',
              fontSize: '1rem',
              background: 'transparent',
            }}
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setSuggestions([]);
              }}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '0.5rem',
                color: 'var(--ink-light)',
              }}
            >
              <XIcon size={18} />
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            style={{
              background: showFilters ? 'var(--primary)' : 'none',
              color: showFilters ? 'white' : 'var(--ink)',
              border: 'none',
              cursor: 'pointer',
              padding: '0.75rem 1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <FilterIcon size={18} />
          </button>
          <button
            type="submit"
            className="btn-primary"
            style={{
              borderRadius: 0,
              padding: '0.75rem 1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <SearchIcon size={18} />
            Search
          </button>
        </div>
      </form>

      {/* Search Suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '0.5rem',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            zIndex: 1000,
            maxHeight: 400,
            overflowY: 'auto',
          }}
        >
          {suggestions.map((suggestion, index) => (
            <div
              key={index}
              onClick={() => handleSuggestionClick(suggestion)}
              style={{
                padding: '0.75rem 1rem',
                cursor: 'pointer',
                borderBottom: index < suggestions.length - 1 ? '1px solid var(--border)' : 'none',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--background)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <div>
                <div style={{ fontWeight: 500 }}>{suggestion.text}</div>
                {suggestion.category && (
                  <div style={{ fontSize: '0.875rem', color: 'var(--ink-light)' }}>
                    in {suggestion.category}
                  </div>
                )}
              </div>
              {suggestion.count && (
                <span
                  style={{
                    fontSize: '0.875rem',
                    color: 'var(--ink-light)',
                    background: 'var(--background)',
                    padding: '0.25rem 0.5rem',
                    borderRadius: 4,
                  }}
                >
                  {suggestion.count} items
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Advanced Filters */}
      {showFilters && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '0.5rem',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            zIndex: 1000,
            padding: '1.5rem',
          }}
        >
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>
            Advanced Filters
          </h3>
          <div style={{ display: 'grid', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 500, marginBottom: '0.5rem' }}>
                Category
              </label>
              <select
                value={filters.category}
                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid var(--border)',
                  borderRadius: 4,
                }}
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.slug}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 500, marginBottom: '0.5rem' }}>
                  Min Price
                </label>
                <input
                  type="number"
                  value={filters.minPrice}
                  onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })}
                  placeholder="0"
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid var(--border)',
                    borderRadius: 4,
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 500, marginBottom: '0.5rem' }}>
                  Max Price
                </label>
                <input
                  type="number"
                  value={filters.maxPrice}
                  onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })}
                  placeholder="Any"
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    border: '1px solid var(--border)',
                    borderRadius: 4,
                  }}
                />
              </div>
            </div>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={filters.inStock}
                  onChange={(e) => setFilters({ ...filters, inStock: e.target.checked })}
                />
                <span>In stock only</span>
              </label>
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 500, marginBottom: '0.5rem' }}>
                Sort By
              </label>
              <select
                value={filters.sortBy}
                onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid var(--border)',
                  borderRadius: 4,
                }}
              >
                <option value="featured">Featured</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="newest">Newest First</option>
                <option value="name">Name: A to Z</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setFilters({
                    category: '',
                    minPrice: '',
                    maxPrice: '',
                    inStock: false,
                    sortBy: 'featured',
                  });
                }}
                className="btn-secondary"
                style={{ padding: '0.5rem 1rem' }}
              >
                Clear
              </button>
              <button
                onClick={handleSearch}
                className="btn-primary"
                style={{ padding: '0.5rem 1rem' }}
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedSearch;
