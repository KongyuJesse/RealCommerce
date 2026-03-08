import { useEffect, useState } from 'react';
import './App.css';
import fallbackHomeData from './fallbackHomeData';

function formatMoney(value, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value) {
  if (!value) {
    return 'Not available';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}

function formatMetric(metric) {
  if (metric.kind === 'currency') {
    return formatMoney(metric.value, metric.currency);
  }

  return new Intl.NumberFormat('en-US').format(metric.value);
}

function App() {
  const [viewModel, setViewModel] = useState({
    status: 'loading',
    error: '',
    data: fallbackHomeData,
  });

  useEffect(() => {
    const controller = new AbortController();

    async function loadHomepage() {
      try {
        const response = await fetch('/api/homepage', {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Homepage request failed with ${response.status}`);
        }

        const payload = await response.json();
        setViewModel({
          status: 'ready',
          error: '',
          data: payload.data,
        });
      } catch (error) {
        if (error.name === 'AbortError') {
          return;
        }

        setViewModel({
          status: 'offline',
          error: 'Live API unavailable. Showing the seeded storefront preview.',
          data: fallbackHomeData,
        });
      }
    }

    loadHomepage();

    return () => controller.abort();
  }, []);

  const { data, error, status } = viewModel;
  const primaryWarehouse = data.operations.warehouses[0];
  const baseCurrency =
    data.operations.currencies.find((entry) => entry.isBase) ||
    data.operations.currencies[0];
  const activePipelineCount = data.operations.pipeline
    .filter((stage) => ['PROCESSING', 'PAID', 'SHIPPED'].includes(stage.status))
    .reduce((total, stage) => total + stage.count, 0);

  return (
    <div className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <main className="page">
        <header className="topbar">
          <div className="brand-lockup">
            <span className="brand-mark">RC</span>
            <div>
              <p className="brand-name">RealCommerce</p>
              <span className="brand-meta">PostgreSQL, Express, and React</span>
            </div>
          </div>
          <nav className="topnav" aria-label="Primary">
            <a href="#categories">Categories</a>
            <a href="#featured-products">Products</a>
            <a href="#operations">Operations</a>
          </nav>
        </header>

        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">{data.hero.eyebrow}</p>
            <h1>{data.hero.title}</h1>
            <p className="hero-text">{data.hero.subtitle}</p>
            <div className="hero-actions">
              <a className="button button-primary" href={data.hero.primaryCta.href}>
                {data.hero.primaryCta.label}
              </a>
              <a
                className="button button-secondary"
                href={data.hero.secondaryCta.href}
              >
                {data.hero.secondaryCta.label}
              </a>
            </div>
            {error ? <p className="hero-alert">{error}</p> : null}
          </div>

          <aside className="hero-panel">
            <div className="panel-kicker">
              <span className={`status-pill status-${status}`}>{status}</span>
              <span>Updated {formatDate(data.updatedAt)}</span>
            </div>
            <h2>{activePipelineCount} orders actively moving through fulfilment</h2>
            <p>
              The homepage reads the catalog, inventory, order flow, and exchange
              rate layers from the backend API in one view.
            </p>
            <div className="hero-facts">
              <article>
                <span>Primary hub</span>
                <strong>
                  {primaryWarehouse
                    ? `${primaryWarehouse.city}, ${primaryWarehouse.country}`
                    : 'Pending setup'}
                </strong>
              </article>
              <article>
                <span>Base currency</span>
                <strong>{baseCurrency ? baseCurrency.code : 'USD'}</strong>
              </article>
              <article>
                <span>Featured lanes</span>
                <strong>{data.featuredCategories.length}</strong>
              </article>
              <article>
                <span>Operational view</span>
                <strong>Catalog to shipment</strong>
              </article>
            </div>
          </aside>
        </section>

        <section className="metrics-grid" aria-label="Platform metrics">
          {data.metrics.map((metric) => (
            <article className="metric-card" key={metric.label}>
              <span>{metric.label}</span>
              <strong>{formatMetric(metric)}</strong>
              <p>{metric.detail}</p>
            </article>
          ))}
        </section>

        <section className="highlights-strip" aria-label="Platform highlights">
          {data.highlights.map((highlight) => (
            <article className="highlight-card" key={highlight.title}>
              <h2>{highlight.title}</h2>
              <p>{highlight.text}</p>
            </article>
          ))}
        </section>

        <section className="section-block" id="categories">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Merchandising lanes</p>
              <h2>Featured categories</h2>
            </div>
            <p>
              Structured categories power clean product discovery and let the
              backend aggregate catalog health without extra transformation.
            </p>
          </div>
          <div className="category-grid">
            {data.featuredCategories.map((category) => (
              <article className="category-card" key={category.slug}>
                <span className="category-count">
                  {category.productCount} active products
                </span>
                <h3>{category.name}</h3>
                <p>{category.description}</p>
                <small>{category.heroCopy}</small>
              </article>
            ))}
          </div>
        </section>

        <section className="section-block" id="featured-products">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Assortment spotlight</p>
              <h2>Featured products</h2>
            </div>
            <p>
              Inventory, category context, and attribute metadata are returned from
              the API so this page stays close to the data model.
            </p>
          </div>
          <div className="product-grid">
            {data.featuredProducts.map((product) => (
              <article className="product-card" key={product.sku}>
                <div className="product-header">
                  <span className="product-category">{product.category}</span>
                  <span className="product-status">{product.status}</span>
                </div>
                <h3>{product.name}</h3>
                <p>{product.description}</p>
                <div className="product-meta">
                  <strong>{formatMoney(product.price, product.currency)}</strong>
                  <span>{product.inventoryUnits} units in stock</span>
                </div>
                <div className="chip-row">
                  {product.attributes.map((attribute) => (
                    <span className="chip" key={`${product.sku}-${attribute.label}`}>
                      {attribute.label}: {attribute.value}
                    </span>
                  ))}
                </div>
                <footer className="product-footer">
                  <span>{product.sku}</span>
                  <span>{product.launchMonth}</span>
                </footer>
              </article>
            ))}
          </div>
        </section>

        <section className="section-block operations-block" id="operations">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Operations board</p>
              <h2>Order, warehouse, and currency signals</h2>
            </div>
            <p>
              These panels are assembled from normalized PostgreSQL tables rather
              than hand-authored content, which keeps the homepage aligned with the
              backend state.
            </p>
          </div>

          <div className="operations-grid">
            <article className="operations-card">
              <div className="card-heading">
                <h3>Order pipeline</h3>
                <span>{data.operations.pipeline.length} stages</span>
              </div>
              <div className="pipeline-list">
                {data.operations.pipeline.map((stage) => (
                  <div className="pipeline-item" key={stage.status}>
                    <span>{stage.status}</span>
                    <strong>{stage.count}</strong>
                  </div>
                ))}
              </div>
            </article>

            <article className="operations-card">
              <div className="card-heading">
                <h3>Recent orders</h3>
                <span>{data.operations.recentOrders.length} records</span>
              </div>
              <div className="order-list">
                {data.operations.recentOrders.map((order) => (
                  <div className="order-row" key={order.orderNumber}>
                    <div>
                      <strong>{order.orderNumber}</strong>
                      <p>{order.customerName}</p>
                    </div>
                    <div>
                      <strong>{formatMoney(order.total, order.currency)}</strong>
                      <p>{formatDate(order.placedAt)}</p>
                    </div>
                    <div>
                      <span>{order.status}</span>
                      <p>
                        {order.paymentStatus} / {order.shipmentStatus}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="operations-card">
              <div className="card-heading">
                <h3>Warehouse utilization</h3>
                <span>{data.operations.warehouses.length} hubs</span>
              </div>
              <div className="warehouse-list">
                {data.operations.warehouses.map((warehouse) => (
                  <div className="warehouse-row" key={warehouse.code}>
                    <div>
                      <strong>{warehouse.name}</strong>
                      <p>
                        {warehouse.city}, {warehouse.country}
                      </p>
                    </div>
                    <div>
                      <strong>{warehouse.utilization}%</strong>
                      <p>{warehouse.quantityOnHand} units available</p>
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="operations-card">
              <div className="card-heading">
                <h3>Currency watch</h3>
                <span>{baseCurrency ? `${baseCurrency.code} base` : 'FX feed'}</span>
              </div>
              <div className="currency-list">
                {data.operations.currencies.map((currency) => (
                  <div className="currency-row" key={currency.code}>
                    <div>
                      <strong>{currency.code}</strong>
                      <p>{currency.name}</p>
                    </div>
                    <div>
                      <strong>
                        {currency.isBase ? '1.00' : currency.rate.toFixed(2)}
                      </strong>
                      <p>{currency.isBase ? 'Base currency' : 'Latest stored rate'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </section>

        <footer className="footer-banner">
          <div>
            <p className="eyebrow">Built for growth</p>
            <h2>
              The storefront, API, and PostgreSQL schema now share one coherent
              foundation.
            </h2>
          </div>
          <p>
            Run the database bootstrap, start the API, and the homepage will swap
            from seeded preview data to live records automatically.
          </p>
        </footer>
      </main>
    </div>
  );
}

export default App;
